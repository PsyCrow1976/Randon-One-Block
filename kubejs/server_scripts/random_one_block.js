// priority: 0
// Modded Random OneBlock — single-position random block generator

const CONFIG_FILE = 'random_one_block.json'
const $BuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
const $LiquidBlock = Java.loadClass('net.minecraft.world.level.block.LiquidBlock')

/** @type {{ config: any, pool: { id: string, weight: number }[], totalWeight: number }} */
const STATE = {
  config: null,
  pool: [],
  totalWeight: 0
}

function loadConfig() {
  const config = JsonIO.read(CONFIG_FILE)
  if (!config) {
    console.error(`[RandomOneBlock] Missing config: kubejs/config/${CONFIG_FILE}`)
    return null
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
    return STATE.config.initial_block || 'minecraft:dirt'
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
  source.sendSuccess(() => Text.of(message), true)
}

function getActiveBlock() {
  return STATE.config?.active_block
}

function requireActive(source) {
  const active = getActiveBlock()
  if (!active || !active.enabled) {
    tell(source, '§cNo random block position set. Use §f/randomblock set <x> <y> <z>')
    return null
  }
  return active
}

ServerEvents.loaded(event => {
  reloadAll()
})

ServerEvents.commandRegistry(event => {
  const { commands: Commands, arguments: Arguments } = event

  const setPos = (source, x, y, z) => {
    if (!STATE.config) reloadAll()

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

  const revert = source => {
    const active = requireActive(source)
    if (!active) return 0

    const initial = STATE.config.initial_block || 'minecraft:dirt'
    setBlockAt(commandLevel(source), active.x, active.y, active.z, initial)
    tell(source, `§aReverted random block to §f${initial}§a at §f${active.x} ${active.y} ${active.z}`)
    return 1
  }

  event.register(
    Commands.literal('randomblock')
      .requires(s => s.hasPermission(2))
      .then(
        Commands.literal('set')
          .then(
            Commands.argument('x', Arguments.INTEGER.create(event))
              .then(
                Commands.argument('y', Arguments.INTEGER.create(event))
                  .then(
                    Commands.argument('z', Arguments.INTEGER.create(event)).executes(ctx => {
                      const x = Arguments.INTEGER.getResult(ctx, 'x')
                      const y = Arguments.INTEGER.getResult(ctx, 'y')
                      const z = Arguments.INTEGER.getResult(ctx, 'z')
                      return setPos(ctx.source, x, y, z)
                    })
                  )
              )
          )
      )
      .then(Commands.literal('revert').executes(ctx => revert(ctx.source)))
      .then(
        Commands.literal('reload').executes(ctx => {
          reloadAll()
          tell(ctx.source, `§aReloaded random block config (${STATE.pool.length} blocks in pool).`)
          return 1
        })
      )
      .then(
        Commands.literal('info').executes(ctx => {
          const active = getActiveBlock()
          if (!active || !active.enabled) {
            tell(ctx.source, '§eRandom block position is not set.')
            return 1
          }
          tell(
            ctx.source,
            `§eActive: §f${active.dimension} ${active.x} ${active.y} ${active.z} §e| pool: §f${STATE.pool.length} §eblocks`
          )
          return 1
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