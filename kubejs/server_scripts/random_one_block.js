// priority: 0
// Modded Random OneBlock — single-position random block generator

const CONFIG_FILE = 'random_one_block.json'
const $BuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
const $LiquidBlock = Java.loadClass('net.minecraft.world.level.block.LiquidBlock')

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

  $BuiltInRegistries.BLOCK.forEach((key, block) => {
    const id = String(key.location())

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

function setBlockAt(level, x, y, z, blockId) {
  level.getBlock(x, y, z).set(blockId)
}

function tell(player, message) {
  player.tell(Text.of(message))
}

function getActiveBlock() {
  return STATE.config?.active_block
}

function requireActive(player) {
  const active = getActiveBlock()
  if (!active || !active.enabled) {
    tell(player, '§cNo random block position set. Use §f/randomblock set <x> <y> <z>')
    return null
  }
  return active
}

function parseCoords(parts) {
  if (parts.length < 3) return null
  const x = Number.parseInt(parts[0], 10)
  const y = Number.parseInt(parts[1], 10)
  const z = Number.parseInt(parts[2], 10)
  if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z)) return null
  return { x: x, y: y, z: z }
}

reloadAll()

ServerEvents.loaded(() => {
  reloadAll()
})

ServerEvents.basicCommand('randomblock', event => {
  const player = event.player
  if (!player) return

  if (!STATE.config) reloadAll()

  const parts = (event.input || '').trim().split(/\s+/).filter(part => part.length > 0)
  const sub = (parts[0] || 'help').toLowerCase()

  if (sub === 'set') {
    const coords = parseCoords(parts.slice(1))
    if (!coords) {
      tell(player, '§cUsage: §f/randomblock set <x> <y> <z>')
      return
    }

    const level = player.level
    const dim = dimensionId(level)
    const initial = STATE.config.initial_block || 'minecraft:dirt'

    STATE.config.active_block = {
      enabled: true,
      dimension: dim,
      x: coords.x,
      y: coords.y,
      z: coords.z
    }
    saveConfig()
    setBlockAt(level, coords.x, coords.y, coords.z, initial)

    tell(
      player,
      `§aRandom block set at §f${dim} ${coords.x} ${coords.y} ${coords.z}§a. Placed §f${initial}§a. Mine it to spawn a random block.`
    )
    return
  }

  if (sub === 'revert') {
    const active = requireActive(player)
    if (!active) return

    const initial = STATE.config.initial_block || 'minecraft:dirt'
    setBlockAt(player.level, active.x, active.y, active.z, initial)
    tell(player, `§aReverted random block to §f${initial}§a at §f${active.x} ${active.y} ${active.z}`)
    return
  }

  if (sub === 'reload') {
    reloadAll()
    tell(player, `§aReloaded random block config (${STATE.pool.length} blocks in pool).`)
    return
  }

  if (sub === 'info') {
    const active = getActiveBlock()
    if (!active || !active.enabled) {
      tell(player, '§eRandom block position is not set.')
      return
    }
    tell(
      player,
      `§eActive: §f${active.dimension} ${active.x} ${active.y} ${active.z} §e| pool: §f${STATE.pool.length} §eblocks`
    )
    return
  }

  tell(player, '§e/randomblock set <x> <y> <z> §7| §e/randomblock revert §7| §e/randomblock reload §7| §e/randomblock info')
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