// priority: 0
// Modded Random OneBlock — single-position random block generator

const CONFIG_FILE = 'random_one_block.json'
const POOL_DUMP_JSON = 'random_one_block_pool.json'
const POOL_DUMP_TEXT = 'random_one_block_pool.txt'
const $BuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
const $LiquidBlock = Java.loadClass('net.minecraft.world.level.block.LiquidBlock')
const $FallingBlock = Java.loadClass('net.minecraft.world.level.block.FallingBlock')
const $Integer = Java.loadClass('java.lang.Integer')
const $ArrayList = Java.loadClass('java.util.ArrayList')
const $Random = Java.loadClass('java.util.Random')
const $TeamManager = Java.tryLoadClass('net.cathienova.haven_skyblock_builder.team.TeamManager')

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
  foundation_block: 'minecraft:bedrock',
  mechanic_enabled: true,
  island_template_mode: true,
  auto_setbelow_on_island_create: true,
  auto_setbelow_templates: ['oneblock_island'],
  island_center_surround: 'minecraft:grass_block',
  active_block: {
    enabled: false,
    dimension: '',
    x: 0,
    y: 0,
    z: 0
  }
}

// Mutable module state — do not store on `global`; KubeJS reload wraps globals in
// unmodifiable maps and property writes throw UnsupportedOperationException.
const STATE = {
  config: null,
  pool: [],
  totalWeight: 0,
  active: null
}

function ensurePoolReady() {
  if (!STATE.config) {
    STATE.config = loadConfig()
    syncActiveFromConfig()
  }

  if (!STATE.pool || STATE.pool.length === 0) {
    rebuildPool()
  }
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
    return config
  }

  // JsonIO.read returns an unmodifiable map — clone so we can update active_block.
  return cloneConfig(config)
}

function resourceKeyToId(key) {
  if (key == null) return null
  if (typeof key === 'string') return key

  // ResourceKey — has location()
  try {
    const loc = key.location()
    if (loc) return String(loc.toString())
  } catch (ignored) {}

  // ResourceLocation — has namespace + path, NOT location()
  try {
    const ns = key.getNamespace()
    const path = key.getPath()
    if (ns && path) return `${ns}:${path}`
  } catch (ignored2) {}

  const text = String(key)
  if (text.includes(':') && !text.includes(' ')) return text

  return null
}

function unwrapRegistryEntry(entry) {
  if (entry == null) return null

  let value = entry

  try {
    if (value.isPresent) {
      if (!value.isPresent()) return null
      value = value.get()
    }
  } catch (ignored) {}

  try {
    if (value.orElse) value = value.orElse(null)
  } catch (ignored) {}

  if (!value) return null

  try {
    if (value.value) {
      const inner = value.value()
      if (inner) return inner
    }
  } catch (ignored) {}

  try {
    if (value.unwrap) {
      const inner = value.unwrap()
      if (inner) return inner
    }
  } catch (ignored) {}

  return value
}

function resolveRegistryBlock(registry, key) {
  let entry = null

  try {
    if (registry.getValue) entry = registry.getValue(key)
  } catch (ignored) {}

  if (!entry) {
    try {
      entry = registry.get(key)
    } catch (ignored) {}
  }

  const block = unwrapRegistryEntry(entry)
  if (!block || !block.defaultBlockState) return null
  return block
}

function getBlockId(block) {
  if (block == null) return 'unknown:block'
  const resolved = unwrapRegistryEntry(block)
  const id = resourceKeyToId($BuiltInRegistries.BLOCK.getKey(resolved || block))
  return id || 'unknown:block'
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

  if (source.player) return true

  // KubeJS ServerPlayer passed directly from basicCommand
  if (source.tell && source.getLevel) return true

  return false
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

function parseResourceId(id) {
  const classNames = ['net.minecraft.resources.Identifier', 'net.minecraft.resources.ResourceLocation']

  for (let i = 0; i < classNames.length; i++) {
    try {
      const IdClass = Java.loadClass(classNames[i])
      return IdClass.parse(String(id))
    } catch (ignored) {}
  }

  return null
}

function blockFromId(registry, id) {
  try {
    const loc = parseResourceId(id)
    if (!loc) return null

    const entry = registry.getValue ? registry.getValue(loc) : registry.get(loc)
    const block = unwrapRegistryEntry(entry)
    if (block && block.defaultBlockState) return block
  } catch (ignored) {}
  return null
}

function addBlockToPool(poolById, id, block, config) {
  if (!id || id === 'unknown:block') return 0
  if (!block || !block.defaultBlockState) return 0
  if (isBlacklisted(id, config)) return 0

  const state = block.defaultBlockState()
  if (state.isAir()) return 0
  if (block instanceof $LiquidBlock) return 0

  const weight = getWeight(id, config)
  if (!(weight > 0)) return 0

  if (poolById[id]) {
    poolById[id].weight += weight
  } else {
    poolById[id] = { id: id, weight: weight }
  }

  return weight
}

function rebuildPool() {
  // Rhino + KubeJS reload: avoid const/let inside try — causes "redeclaration of var".
  var config = STATE.config
  if (!config) return

  var registry = $BuiltInRegistries.BLOCK
  var poolById = {}
  var totalWeight = 0
  var keyCount = 0
  var registryKeyList = new $ArrayList()
  var keyIterator = registry.keySet().iterator()
  var i = 0
  var key = null
  var id = null
  var block = null
  var pool = []
  var samples = []
  var poolId = null

  while (keyIterator.hasNext()) {
    registryKeyList.add(keyIterator.next())
  }
  keyCount = registryKeyList.size()

  for (i = 0; i < keyCount; i++) {
    key = registryKeyList.get(i)
    id = resourceKeyToId(key)
    if (!id) continue

    block = resolveRegistryBlock(registry, key)
    if (!block) block = blockFromId(registry, id)

    totalWeight += addBlockToPool(poolById, id, block, config)
  }

  for (poolId in poolById) {
    pool.push(poolById[poolId])
  }

  if (pool.length === 0) {
    console.error(
      `[RandomOneBlock] Pool rebuild produced 0 blocks (registry keys scanned: ${keyCount}) — keeping previous pool`
    )
    return
  }

  STATE.pool = pool
  STATE.totalWeight = Math.max(1, Math.floor(totalWeight))
  console.info(
    `[RandomOneBlock] Block pool ready: ${pool.length} unique blocks, total weight ${STATE.totalWeight}`
  )

  for (i = 0; i < Math.min(5, pool.length); i++) {
    samples.push(pool[i].id)
  }
  console.info(`[RandomOneBlock] Pool sample: ${samples.join(', ')}`)

  dumpPoolReport(true)
}

function randomInt(bound) {
  if (bound <= 0) return 0

  if (!STATE._pickSeq) STATE._pickSeq = 0
  STATE._pickSeq++
  // java.lang.System is blocked by KubeJS — use Date.now() + counter for seed.
  var rng = new $Random(Date.now() + STATE._pickSeq * 7919)
  return rng.nextInt(bound)
}

function dumpPoolReport(verbose) {
  if (!STATE.pool || !STATE.pool.length) return

  var i = 0
  var blocks = []
  var textLines = []
  var preview = []
  var testPicks = []

  textLines.push('# RandomOneBlock block pool')
  textLines.push('# unique_blocks: ' + STATE.pool.length)
  textLines.push('# total_weight: ' + STATE.totalWeight)
  textLines.push('# id\tweight')

  for (i = 0; i < STATE.pool.length; i++) {
    blocks.push({ id: STATE.pool[i].id, weight: STATE.pool[i].weight })
    textLines.push(STATE.pool[i].id + '\t' + STATE.pool[i].weight)
    if (i < 30) preview.push(STATE.pool[i].id)
  }

  JsonIO.write(POOL_DUMP_JSON, {
    unique_blocks: STATE.pool.length,
    total_weight: STATE.totalWeight,
    blocks: blocks
  })
  JsonIO.write(POOL_DUMP_TEXT, textLines.join('\n'))

  console.info(
    `[RandomOneBlock] Pool dumped to kubejs/config/${POOL_DUMP_JSON} and kubejs/config/${POOL_DUMP_TEXT}`
  )

  if (verbose) {
    console.info(`[RandomOneBlock] Pool preview (first 30): ${preview.join(', ')}`)

    for (i = 0; i < 8; i++) {
      testPicks.push(pickRandomBlockIdInternal())
    }
    console.info(`[RandomOneBlock] Test random picks (8): ${testPicks.join(', ')}`)
  }
}

function reloadAll() {
  STATE.config = loadConfig()
  syncActiveFromConfig()
  rebuildPool()
}

function saveConfig() {
  JsonIO.write(CONFIG_FILE, STATE.config)
}

function dimensionId(level) {
  const dim = level.dimension
  if (!dim) return ''

  try {
    if (dim.location) return String(dim.location())
  } catch (ignored) {}

  const text = String(dim)
  if (text.includes('overworld')) return 'minecraft:overworld'
  if (text.includes('the_nether') || text.includes('nether')) return 'minecraft:the_nether'
  if (text.includes('the_end') || text.includes('end')) return 'minecraft:the_end'
  return text
}

function readBlockPos(pos) {
  if (pos == null) return null

  try {
    if (typeof pos.getX === 'function') {
      return {
        x: pos.getX(),
        y: pos.getY(),
        z: pos.getZ()
      }
    }
  } catch (ignored) {}

  if (pos.x !== undefined && pos.y !== undefined && pos.z !== undefined) {
    return {
      x: Math.floor(pos.x),
      y: Math.floor(pos.y),
      z: Math.floor(pos.z)
    }
  }

  return null
}

function blockCoords(block) {
  if (block == null) return { x: 0, y: 0, z: 0 }

  var pos = null

  try {
    if (typeof block.getBlockPos === 'function') pos = readBlockPos(block.getBlockPos())
  } catch (ignored) {}

  if (!pos) {
    try {
      if (typeof block.blockPos === 'function') pos = readBlockPos(block.blockPos())
    } catch (ignored2) {}
  }

  if (!pos && block.pos) pos = readBlockPos(block.pos)

  if (!pos && block.x !== undefined && block.y !== undefined && block.z !== undefined) {
    pos = {
      x: Math.floor(block.x),
      y: Math.floor(block.y),
      z: Math.floor(block.z)
    }
  }

  if (!pos) pos = { x: 0, y: 0, z: 0 }
  return pos
}

// Block the player is standing on (same coordinate space as Haven BlockPos / F3).
function playerStandingBlock(player) {
  try {
    if (typeof player.getOnPos === 'function') {
      const onPos = readBlockPos(player.getOnPos())
      if (onPos) return onPos
    }
  } catch (ignored) {}

  var cell = null

  try {
    if (typeof player.blockPosition === 'function') cell = readBlockPos(player.blockPosition())
  } catch (ignored2) {}

  if (!cell) {
    try {
      if (typeof player.getBlockX === 'function') {
        cell = {
          x: player.getBlockX(),
          y: player.getBlockY(),
          z: player.getBlockZ()
        }
      }
    } catch (ignored3) {}
  }

  if (cell) {
    return { x: cell.x, y: cell.y - 1, z: cell.z }
  }

  try {
    if (typeof player.getX === 'function') {
      return {
        x: Math.floor(player.getX()),
        y: Math.floor(player.getY()) - 1,
        z: Math.floor(player.getZ())
      }
    }
  } catch (ignored4) {}

  return {
    x: Math.floor(player.x),
    y: Math.floor(player.y) - 1,
    z: Math.floor(player.z)
  }
}

function samePosition(level, block, active) {
  if (!active) return false
  if (dimensionId(level) !== active.dimension) return false
  const c = blockCoords(block)
  return c.x === active.x && c.y === active.y && c.z === active.z
}

function blockIdAt(level, x, y, z) {
  try {
    const wrapper = level.getBlock(x, y, z)
    if (wrapper.id) return String(wrapper.id)
    return getBlockId(wrapper)
  } catch (ignored) {}

  return 'minecraft:air'
}

function brokenBlockId(block) {
  try {
    if (block.id) {
      const id = String(block.id)
      if (id.indexOf(':') >= 0) return id
    }
  } catch (ignored) {}

  try {
    const state = block.blockState || block.state
    if (state && state.getBlock) return getBlockId(state.getBlock())
  } catch (ignored2) {}

  return getBlockId(block)
}

function hasGrassRingAt(level, x, y, z, surround) {
  const neighbors = [
    [x + 1, z],
    [x - 1, z],
    [x, z + 1],
    [x, z - 1]
  ]
  var i = 0

  for (i = 0; i < neighbors.length; i++) {
    if (blockIdAt(level, neighbors[i][0], y, neighbors[i][1]) !== surround) return false
  }

  return true
}

function isRandomBlockFoundationAt(level, x, y, z) {
  const foundation = getFoundationBlock()
  const surround = STATE.config?.island_center_surround || 'minecraft:grass_block'
  const below = blockIdAt(level, x, y - 1, z)

  if (below === foundation) return true
  if (below === surround && blockIdAt(level, x, y - 2, z) === foundation) return true
  return false
}

function isMechanicEnabled() {
  return STATE.config?.mechanic_enabled !== false
}

function isIslandCenterAt(level, x, y, z, brokenId) {
  if (STATE.config?.island_template_mode === false) return false

  const initial = getInitialBlock()
  const foundation = getFoundationBlock()
  const surround = STATE.config?.island_center_surround || 'minecraft:grass_block'

  if (brokenId && brokenId !== initial) return false
  if (!brokenId && blockIdAt(level, x, y, z) !== initial) return false

  const below = blockIdAt(level, x, y - 1, z)

  // Pyramid: dirt on bedrock, grass ring on the base layer below
  if (below === foundation) {
    return hasGrassRingAt(level, x, y - 1, z, surround)
  }

  return false
}

function isIslandCenterRandomBlock(level, block) {
  const c = blockCoords(block)
  return isIslandCenterAt(level, c.x, c.y, c.z, brokenBlockId(block))
}

function isRandomBlockBreak(level, block) {
  if (!isMechanicEnabled()) return false

  const active = getActiveBlock()
  if (active && active.enabled && samePosition(level, block, active)) return true
  return isIslandCenterRandomBlock(level, block)
}

function syncActiveFromConfig() {
  const cfg = STATE.config?.active_block
  if (cfg && cfg.enabled) {
    STATE.active = {
      enabled: true,
      dimension: String(cfg.dimension),
      x: Math.floor(cfg.x),
      y: Math.floor(cfg.y),
      z: Math.floor(cfg.z)
    }
    return
  }

  STATE.active = null
}

function pickRandomBlockIdInternal() {
  if (!STATE.pool.length || STATE.totalWeight <= 0) {
    return STATE.config?.initial_block || 'minecraft:dirt'
  }

  var roll = randomInt(STATE.totalWeight)
  STATE._lastRoll = roll
  var i = 0
  var entry = null

  for (i = 0; i < STATE.pool.length; i++) {
    entry = STATE.pool[i]
    roll -= Number(entry.weight)
    if (roll < 0) return entry.id
  }

  return STATE.pool[STATE.pool.length - 1].id
}

function pickRandomBlockId() {
  ensurePoolReady()

  if (!STATE.pool.length || STATE.totalWeight <= 0) {
    console.warn(
      `[RandomOneBlock] Pool empty during pick (size=${STATE.pool.length}, weight=${STATE.totalWeight}), using dirt`
    )
    return STATE.config?.initial_block || 'minecraft:dirt'
  }

  return pickRandomBlockIdInternal()
}

function commandLevel(source) {
  if (source.level) return source.level
  if (source.getLevel) return source.getLevel()
  if (source.player && source.player.level) return source.player.level
  return source.level
}

function setBlockAt(level, x, y, z, blockId) {
  level.getBlock(x, y, z).set(blockId)
}

function getFoundationBlock() {
  return STATE.config?.foundation_block || 'minecraft:bedrock'
}

function getInitialBlock() {
  return STATE.config?.initial_block || 'minecraft:dirt'
}

function placeFoundation(level, x, y, z) {
  const foundation = getFoundationBlock()
  setBlockAt(level, x, y - 1, z, foundation)
}

function isFallingBlockId(id) {
  const block = blockFromId($BuiltInRegistries.BLOCK, id)
  if (!block) return false
  return block instanceof $FallingBlock
}

function isAirAt(level, x, y, z) {
  try {
    const wrapper = level.getBlock(x, y, z)
    if (wrapper.blockState && wrapper.blockState.isAir()) return true
    if (wrapper.id === 'minecraft:air') return true
  } catch (ignored) {}

  return false
}

function scheduleGravityRecovery(server, level, coords) {
  const dim = dimensionId(level)
  const initial = getInitialBlock()
  const foundation = getFoundationBlock()
  const delays = [2, 5, 10, 20, 40]
  var i = 0

  for (i = 0; i < delays.length; i++) {
    ;(function (delay) {
      server.scheduleInTicks(delay, () => {
        if (dimensionId(level) !== dim) return
        if (!isAirAt(level, coords.x, coords.y, coords.z)) return
        if (!isRandomBlockFoundationAt(level, coords.x, coords.y, coords.z)) return

        setBlockAt(level, coords.x, coords.y, coords.z, initial)
        console.info(
          `[RandomOneBlock] Gravity block fell at ${coords.x} ${coords.y} ${coords.z}; restored ${initial} for next mine`
        )
      })
    })(delays[i])
  }
}

function resolveSource(eventOrSource) {
  if (!eventOrSource) return null

  if (eventOrSource.source) return eventOrSource.source

  const player = eventOrSource.player || (eventOrSource.getPlayer ? eventOrSource.getPlayer() : null)
  if (player) {
    try {
      return player.createCommandSourceStack()
    } catch (ignored) {
      return player
    }
  }

  return eventOrSource
}

function tell(eventOrSource, message) {
  const text = Text.of(message)

  if (eventOrSource.respond) {
    eventOrSource.respond(text)
    return
  }

  const source = resolveSource(eventOrSource)
  if (!source) return

  const player = source.player || (source.tell ? source : null)
  if (player && player.tell) {
    player.tell(text)
    return
  }

  if (source.sendSystemMessage) {
    source.sendSystemMessage(text)
  }
}

function getActiveBlock() {
  return STATE.active
}

function requireActive(source) {
  const active = getActiveBlock()
  if (!active || !active.enabled) {
    tell(source, '§cNo random block position set. Use §f/randomblock setbelow §cor §f/randomblock set <x> <y> <z>')
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
  const initial = getInitialBlock()
  const foundation = getFoundationBlock()
  const pos = {
    dimension: dim,
    x: Math.floor(x),
    y: Math.floor(y),
    z: Math.floor(z)
  }

  STATE.active = {
    enabled: true,
    dimension: pos.dimension,
    x: pos.x,
    y: pos.y,
    z: pos.z
  }
  STATE.config.active_block = {
    enabled: true,
    dimension: pos.dimension,
    x: pos.x,
    y: pos.y,
    z: pos.z
  }
  saveConfig()

  if (isIslandCenterAt(level, pos.x, pos.y, pos.z, initial)) {
    tell(
      source,
      `§aRandom block registered at §f${pos.dimension} ${pos.x} ${pos.y} ${pos.z}§a. Island template blocks left unchanged.`
    )
    return 1
  }

  placeFoundation(level, pos.x, pos.y, pos.z)
  setBlockAt(level, pos.x, pos.y, pos.z, initial)

  tell(
    source,
    `§aRandom block set at §f${pos.dimension} ${pos.x} ${pos.y} ${pos.z}§a. Placed §f${foundation}§a below and §f${initial}§a on top. Mine it to spawn a random block.`
  )
  return 1
}

function shouldAutoSetbelowTemplate(template) {
  if (STATE.config?.auto_setbelow_on_island_create === false) return false

  const list = STATE.config?.auto_setbelow_templates
  const wanted = String(template || '').toLowerCase()
  if (!wanted) return false

  if (!list || !list.length) return wanted === 'oneblock_island'

  var i = 0
  for (i = 0; i < list.length; i++) {
    if (String(list[i]).toLowerCase() === wanted) return true
  }

  return false
}

function autoSetbelowAfterIslandCreate(player, template) {
  if (!isMechanicEnabled()) return
  if (!player) return

  ensurePoolReady()

  var source = null
  try {
    source = player.createCommandSourceStack()
  } catch (ignored) {
    return
  }

  if ($TeamManager) {
    try {
      const team = $TeamManager.getTeamByPlayer(player.getUUID())
      const home = team && team.getHomePosition ? team.getHomePosition() : null

      if (home) {
        setActivePosition(source, home.getX(), home.getY() - 1, home.getZ())
        console.info(
          `[RandomOneBlock] Auto setbelow after island create (${template}) at ${home.getX()} ${home.getY() - 1} ${home.getZ()}`
        )
        return
      }
    } catch (e) {
      console.error(`[RandomOneBlock] Auto setbelow team lookup failed: ${String(e)}`)
    }
  }

  const stand = playerStandingBlock(player)
  setActivePosition(source, stand.x, stand.y, stand.z)
  console.info(
    `[RandomOneBlock] Auto setbelow fallback after island create (${template}) at ${stand.x} ${stand.y} ${stand.z}`
  )
}

function registerIslandCreateHook() {
  NativeEvents.onEvent('net.neoforged.neoforge.event.CommandEvent', event => {
    ensurePoolReady()
    if (!isMechanicEnabled()) return
    if (STATE.config?.auto_setbelow_on_island_create === false) return

    try {
      const parse = event.getParseResults()
      const cmd = String(parse.getReader().getString()).trim().replace(/^\//, '')
      const match = cmd.match(/^havensb\s+island\s+create\s+(\S+)/i)
      if (!match) return

      const template = match[1]
      if (!shouldAutoSetbelowTemplate(template)) return

      const source = parse.getContext().getSource()
      const player = source.getPlayer()
      if (!player) return

      const server = source.getServer()
      server.scheduleInTicks(20, () => {
        try {
          autoSetbelowAfterIslandCreate(player, template)
        } catch (e) {
          const err = e && e.javaException ? String(e.javaException) : String(e)
          console.error(`[RandomOneBlock] Auto setbelow failed: ${err}`)
        }
      })
    } catch (ignored) {}
  })
}

function cmdSetBelow(source) {
  ensurePoolReady()

  if (!isMechanicEnabled()) {
    tell(source, '§eRandom block is disabled. Set §fmechanic_enabled§e to §atrue §ein config.')
    return 1
  }

  const player = requirePlayer(source)
  if (!player) return 0

  const stand = playerStandingBlock(player)
  return setActivePosition(source, stand.x, stand.y, stand.z)
}

function cmdSetCoords(source, coordText) {
  ensurePoolReady()

  if (!isMechanicEnabled()) {
    tell(source, '§eRandom block is disabled. Set §fmechanic_enabled§e to §atrue §ein config.')
    return 1
  }

  const coords = parseCoords(coordText.trim().split(/\s+/))
  if (!coords) {
    tell(source, '§cUsage: §f/randomblock set <x> <y> <z>')
    return 0
  }

  return setActivePosition(source, coords.x, coords.y, coords.z)
}

function cmdRevert(source) {
  ensurePoolReady()

  const active = requireActive(source)
  if (!active) return 0

  const level = commandLevel(source)
  const initial = getInitialBlock()
  placeFoundation(level, active.x, active.y, active.z)
  setBlockAt(level, active.x, active.y, active.z, initial)
  tell(source, `§aReverted random block to §f${initial}§a at §f${active.x} ${active.y} ${active.z}`)
  return 1
}

function cmdReload(source) {
  reloadAll()
  tell(
    source,
    `§aReloaded random block config (${STATE.pool.length} blocks). Pool saved to §fkubejs/config/${POOL_DUMP_TEXT}`
  )
  return 1
}

function cmdInfo(source) {
  ensurePoolReady()

  const active = getActiveBlock()
  const level = commandLevel(source)
  const player = source.player

  if (!isMechanicEnabled()) {
    tell(source, '§eRandom block: §cdisabled')
  } else if (active && active.enabled) {
    tell(
      source,
      `§eActive: §f${active.dimension} ${active.x} ${active.y} ${active.z} §e| pool: §f${STATE.pool.length} §eblocks`
    )
  } else if (STATE.config?.island_template_mode) {
    tell(
      source,
      `§eMode: §fisland template §e| pool: §f${STATE.pool.length} §eblocks §7(no fixed position saved)`
    )
  } else {
    tell(source, '§eRandom block position is not set.')
  }

  if (player) {
    const stand = playerStandingBlock(player)
    const dim = dimensionId(level)
    const blockId = blockIdAt(level, stand.x, stand.y, stand.z)
    const islandCenter = isIslandCenterAt(level, stand.x, stand.y, stand.z, null)
    const matchesActive =
      active &&
      active.enabled &&
      active.dimension === dim &&
      active.x === stand.x &&
      active.y === stand.y &&
      active.z === stand.z

    tell(
      source,
      `§eStanding on: §f${dim} ${stand.x} ${stand.y} ${stand.z} §7(${blockId})`
    )

    if (matchesActive) {
      tell(source, '§aStanding on the active random block.')
    } else if (islandCenter) {
      tell(source, '§aThis block matches the §foneblock_island §acenter pattern.')
    }
  }

  return 1
}

function cmdHelp(source) {
  tell(
    source,
    '§e/randomblock setbelow §7| §e/randomblock set <x> <y> <z> §7| §e/randomblock info §7| §e/randomblock revert §7| §e/randomblock reload §7| §e/randomblock give'
  )
  return 1
}

function parseCommandInput(input) {
  const trimmed = String(input || '').trim()
  if (!trimmed) return { sub: '', args: [] }

  const parts = trimmed.split(/\s+/)
  return { sub: parts[0].toLowerCase(), args: parts.slice(1) }
}

function cmdDispatch(source, input) {
  const parsed = parseCommandInput(input)
  const sub = parsed.sub

  if (!sub) return cmdHelp(source)

  switch (sub) {
    case 'setbelow':
      return cmdSetBelow(source)
    case 'set':
      return cmdSetCoords(source, parsed.args.join(' '))
    case 'info':
      return cmdInfo(source)
    case 'revert':
      return cmdRevert(source)
    case 'reload':
      return cmdReload(source)
    case 'give':
      return cmdGive(source)
    case 'help':
      return cmdHelp(source)
    default:
      tell(source, `§cUnknown subcommand §f${sub}§c. Use §f/randomblock §cfor help.`)
      return 0
  }
}

function cmdGive(source) {
  const player = requirePlayer(source)
  if (!player) return 0

  player.give('minecraft:apple', 1)
  tell(source, '§aGiven §f1 minecraft:apple§a.')
  return 1
}

function runCommand(event, handler) {
  const source = resolveSource(event)
  if (!hasCommandPermission(source)) {
    tell(event, '§cYou do not have permission to run this command.')
    return
  }

  try {
    handler(source)
  } catch (e) {
    const err = e && e.javaException ? String(e.javaException) : String(e)
    console.error(`[RandomOneBlock] Command failed: ${err}`)
    tell(event, '§cCommand failed — check logs/kubejs/server.log for details.')
  }
}

function registerCommands() {
  // basicCommand + event.input: one command with subcommands, reload-safe (unlike commandRegistry).
  ServerEvents.basicCommand('randomblock', event => {
    runCommand(event, source => cmdDispatch(source, event.input))
  })
}

registerCommands()
registerIslandCreateHook()

ServerEvents.loaded(() => {
  reloadAll()
})

// loaded does not re-fire on /reload; afterRecipes does (see KubeJSReloadListener).
ServerEvents.afterRecipes(() => {
  reloadAll()
})

BlockEvents.broken(event => {
  ensurePoolReady()

  if (!isRandomBlockBreak(event.level, event.block)) return

  const level = event.level
  const coords = blockCoords(event.block)
  const nextId = pickRandomBlockId()
  const poolSize = STATE.pool.length
  const roll = STATE._lastRoll

  event.server.scheduleInTicks(1, () => {
    level.getBlock(coords.x, coords.y, coords.z).set(nextId)
    console.info(
      `[RandomOneBlock] Replaced broken block at ${coords.x} ${coords.y} ${coords.z} with ${nextId} (pool=${poolSize}, roll=${roll}/${STATE.totalWeight})`
    )

    if (isFallingBlockId(nextId)) {
      scheduleGravityRecovery(event.server, level, coords)
    }
  })
})