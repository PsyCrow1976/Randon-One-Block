// priority: 0
// Modded Random OneBlock — single-position random block generator

const CONFIG_FILE = 'random_one_block.json'
const $BuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
const $LiquidBlock = Java.loadClass('net.minecraft.world.level.block.LiquidBlock')
const $Integer = Java.loadClass('java.lang.Integer')

const DEFAULT_CONFIG = {
  default_weight: 1,
  weight_overrides: {
    'minecraft:crafting_table': 3
  },
  blacklist: [
    'minecraft:air',
    'minecraft:cave_air',
    'minecraft:void_air',
    'minecraft:water',
    'minecraft:lava',
    'minecraft:fire',
    'minecraft:soul_fire',
    'minecraft:moving_piston',
    'minecraft:piston_head',
    'minecraft:barrier',
    'minecraft:structure_void',
    'minecraft:light',
    'minecraft:command_block',
    'minecraft:chain_command_block',
    'minecraft:repeating_command_block',
    'minecraft:structure_block',
    'minecraft:jigsaw'
  ],
  initial_block: 'minecraft:dirt',
  active_block: {
    enabled: false,
    dimension: '',
    x: 0,
    y: 0,
    z: 0
  }
}

/** @type {{ config: any, pool: { id: string, weight: number }[], totalWeight: number }} */
const STATE = {
  config: null,
  pool: [],
  totalWeight: 0
}

function cloneConfig(config) {
  return JsonIO.parse(JsonIO.toString(config))
}

function loadConfig() {
  let config = JsonIO.read(CONFIG_FILE)

  if (!config) {
    console.warn(`[RandomOneBlock] Config not found, creating default at kubejs/config/${CONFIG_FILE}`)
    config = cloneConfig(DEFAULT_CONFIG)
    JsonIO.write(CONFIG_FILE, config)
  }

  return config
}

function getBlockId(block) {
  if (block && block.id) return String(block.id)
  return String($BuiltInRegistries.BLOCK.getKey(block).location())
}

function hasCommandPermission(source) {
  if (!source) return false

  try {
    const method = source.getClass().getMethod('hasPermissions', $Integer.TYPE)
    return method.invoke(source, $Integer.valueOf(2))
  } catch (ignored) {}

  try {
    const method = source.getClass().getMethod('hasPermission', $Integer.TYPE)
    return method.invoke(source, $Integer.valueOf(2))
  } catch (ignored) {}

  return !!source.player
}

function isBlacklisted(id, config) {
  const list = config.blacklist || []
  for (let i = 0; i < list.length; i++) {
    if (list[i] === id) return true
  }
  return false
}

function getWeight(id, config) {
  const overrides = config.weight_overrides || {}
  if (overrides[id] !== undefined && overrides[id] !== null) {
    return Number(overrides[id])
  }
  return Number(config.default_weight ?? 1)
}

function rebuildPool() {
  const config = STATE.config
  if (!config) return

  const pool = []
  let totalWeight = 0

  $BuiltInRegistries.BLOCK.forEach(block => {
    const id = getBlockId(block)

    if (isBlacklisted(id, config)) return

    const state = block.defaultBlockState()
    if (state.isAir()) return
    if (block instanceof $LiquidBlock) return

    const weight = getWeight(id, config)
    if (!(weight > 0)) return

    pool.push({ id: id, weight: weight })
    totalWeight += weight
  })

  STATE.pool = pool
  STATE.totalWeight = totalWeight
  console.info(`[RandomOneBlock] Block pool ready: ${pool.length} blocks, total weight ${totalWeight}`)
}

function reloadAll() {
  STATE.config = loadConfig()
  rebuildPool()
}

function saveConfig() {
  JsonIO.write(CONFIG_FILE, STATE.config)
}

function dimensionId(level) {
  return String(level.dimension)
}

function blockCoords(block) {
  return {
    x: block.x ?? block.pos?.x,
    y: block.y ?? block.pos?.y,
    z: block.z ?? block.pos?.z
  }
}

function samePosition(level, block, active) {
  if (!active || !active.enabled) return false
  if (dimensionId(level) !== String(active.dimension)) return false
  const c = blockCoords(block)
  return c.x === active.x && c.y === active.y && c.z === active.z
}

function pickRandomBlockId(level) {
  if (!STATE.pool.length || STATE.totalWeight <= 0) {
    return STATE.config?.initial_block || 'minecraft:dirt'
  }

  let roll = level.random.nextInt(STATE.totalWeight)
  for (let i = 0; i < STATE.pool.length; i++) {
    const entry = STATE.pool[i]
    roll -= entry.weight
    if (roll < 0) return entry.id
  }

  return STATE.pool[STATE.pool.length - 1].id
}

function commandLevel(source) {
  if (source.player) return source.player.level
  return source.level
}

function setBlockAt(level, x, y, z, blockId) {
  level.getBlock(x, y, z).set(blockId)
}

function tell(source, message) {
  const player = source.player
  if (player) {
    player.tell(Text.of(message))
    return
  }

  source.sendSystemMessage(Text.of(message))
}

function getActiveBlock() {
  return STATE.config?.active_block
}

function requireActive(source) {
  const active = getActiveBlock()
  if (!active || !active.enabled) {
    tell(source, '§cNo random block position set. Use §f/randomblocksetbelow §cor §f/randomblockset <x> <y> <z>')
    return null
  }
  return active
}

function requirePlayer(source) {
  if (!source.player) {
    tell(source, '§cThis command must be run by a player.')
    return null
  }
  return source.player
}

function parseCoords(parts) {
  if (parts.length < 3) return null
  const x = Number.parseInt(parts[0], 10)
  const y = Number.parseInt(parts[1], 10)
  const z = Number.parseInt(parts[2], 10)
  if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z)) return null
  return { x: x, y: y, z: z }
}

function setActivePosition(source, x, y, z) {
  const level = commandLevel(source)
  const dim = dimensionId(level)
  const initial = STATE.config.initial_block || 'minecraft:dirt'

  STATE.config.active_block = {
    enabled: true,
    dimension: dim,
    x: x,
    y: y,
    z: z
  }
  saveConfig()
  setBlockAt(level, x, y, z, initial)

  tell(
    source,
    `§aRandom block set at §f${dim} ${x} ${y} ${z}§a. Placed §f${initial}§a. Mine it to spawn a random block.`
  )
  return 1
}

function cmdSetBelow(source) {
  if (!STATE.config) reloadAll()

  const player = requirePlayer(source)
  if (!player) return 0

  const x = Math.floor(player.x)
  const y = Math.floor(player.y) - 1
  const z = Math.floor(player.z)
  return setActivePosition(source, x, y, z)
}

function cmdSetCoords(source, coordText) {
  if (!STATE.config) reloadAll()

  const coords = parseCoords(coordText.trim().split(/\s+/))
  if (!coords) {
    tell(source, '§cUsage: §f/randomblockset <x> <y> <z>')
    return 0
  }

  return setActivePosition(source, coords.x, coords.y, coords.z)
}

function cmdRevert(source) {
  if (!STATE.config) reloadAll()

  const active = requireActive(source)
  if (!active) return 0

  const initial = STATE.config.initial_block || 'minecraft:dirt'
  setBlockAt(commandLevel(source), active.x, active.y, active.z, initial)
  tell(source, `§aReverted random block to §f${initial}§a at §f${active.x} ${active.y} ${active.z}`)
  return 1
}

function cmdReload(source) {
  reloadAll()
  tell(source, `§aReloaded random block config (${STATE.pool.length} blocks in pool).`)
  return 1
}

function cmdInfo(source) {
  if (!STATE.config) reloadAll()

  const active = getActiveBlock()
  if (!active || !active.enabled) {
    tell(source, '§eRandom block position is not set.')
    return 1
  }

  tell(
    source,
    `§eActive: §f${active.dimension} ${active.x} ${active.y} ${active.z} §e| pool: §f${STATE.pool.length} §eblocks`
  )
  return 1
}

function cmdHelp(source) {
  tell(source, '§e/randomblocksetbelow §7| §e/randomblockset <x> <y> <z> §7| §e/randomblockinfo §7| §e/randomblockrevert §7| §e/randomblockreload §7| §e/give')
  return 1
}

function cmdGive(source) {
  const player = requirePlayer(source)
  if (!player) return 0

  player.give('minecraft:apple', 1)
  tell(source, '§aGiven §f1 minecraft:apple§a.')
  return 1
}

function registerSimpleCommand(event, name, handler) {
  const { commands: Commands } = event

  event.register(
    Commands.literal(name)
      .requires(source => hasCommandPermission(source))
      .executes(ctx => handler(ctx.source))
  )
}

ServerEvents.loaded(() => {
  reloadAll()
})

ServerEvents.commandRegistry(event => {
  const { commands: Commands, arguments: Arguments } = event

  // KubeJS 8 on MC 26.1 does not reliably run subcommands on /randomblock <args>.
  // Use single-level command names instead.
  registerSimpleCommand(event, 'randomblock', cmdHelp)
  registerSimpleCommand(event, 'randomblocksetbelow', cmdSetBelow)
  registerSimpleCommand(event, 'randomblockinfo', cmdInfo)
  registerSimpleCommand(event, 'randomblockrevert', cmdRevert)
  registerSimpleCommand(event, 'randomblockreload', cmdReload)
  registerSimpleCommand(event, 'give', cmdGive)

  event.register(
    Commands.literal('randomblockset')
      .requires(source => hasCommandPermission(source))
      .then(
        Commands.argument('coords', Arguments.GREEDY_STRING.create(event)).executes(ctx => {
          const coords = Arguments.GREEDY_STRING.getResult(ctx, 'coords')
          return cmdSetCoords(ctx.source, coords)
        })
      )
  )
})

BlockEvents.broken(event => {
  if (!STATE.config) return

  const active = getActiveBlock()
  if (!samePosition(event.level, event.block, active)) return

  const level = event.level
  const coords = blockCoords(event.block)
  const nextId = pickRandomBlockId(level)

  event.server.scheduleInTicks(1, () => {
    const current = level.getBlock(coords.x, coords.y, coords.z)
    if (current.id === 'minecraft:air') {
      current.set(nextId)
    }
  })
})