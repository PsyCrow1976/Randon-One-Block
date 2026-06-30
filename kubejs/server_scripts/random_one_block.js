// priority: 0
// Randon One Block — single-position random block generator

const CONFIG_FILE = 'random_one_block.json'

const $BuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
const $LiquidBlock = Java.loadClass('net.minecraft.world.level.block.LiquidBlock')
const $FallingBlock = Java.loadClass('net.minecraft.world.level.block.FallingBlock')
const $Integer = Java.loadClass('java.lang.Integer')
const $ArrayList = Java.loadClass('java.util.ArrayList')
const $Random = Java.loadClass('java.util.Random')
const $TeamManager = Java.tryLoadClass('net.cathienova.haven_skyblock_builder.team.TeamManager')
const $EmptyBlockGetter = Java.tryLoadClass('net.minecraft.world.level.EmptyBlockGetter')
const $BlockPos = Java.tryLoadClass('net.minecraft.core.BlockPos')
const $CollisionContext = Java.tryLoadClass('net.minecraft.world.phys.shapes.CollisionContext')

const AUTO_SETBELOW_POLL_INTERVAL = 5
const AUTO_SETBELOW_DEBUG_INTERVAL = 100
const AUTO_SETBELOW_DELAY_TICKS_DEFAULT = 40
const AUTO_SETBELOW_Y_OFFSET = 0
const AUTO_SETBELOW_DONE_KEY = 'random_one_block_autosetbelow_done'

const DEFAULT_CONFIG = {
  default_weight: 1,
  weight_overrides: {
    'minecraft:crafting_table': 5,
    'minecraft:dirt': 10,
    'minecraft:cobblestone': 10,
    'uncraftingtable:uncrafting_table': 3
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
  auto_setbelow_y_offset: 0,
  auto_setbelow_delay_ticks: 40,
  haven_island_distance: 8192,
  debug_logging: false,
  require_full_collision_cube: true,
  collision_min_aabb_size: 1,
  island_center_surround: 'minecraft:grass_block',
  active_block: {
    enabled: false,
    dimension: '',
    x: 0,
    y: 0,
    z: 0
  },
  randon_counter_hud: {
    enabled: true
  }
}

// Mutable module state — do not store on `global`; KubeJS reload wraps globals in
// unmodifiable maps and property writes throw UnsupportedOperationException.
const STATE = {
  config: null,
  pool: [],
  totalWeight: 0,
  active: null,
  havenTeamManager: null,
  havenTeamManagerTick: -1,
  autoSetbelowDebug: {},
  autoSetbelowWatcherStarted: false,
  autoSetbelowGlobalDebugTick: -1,
  autoSetbelowDoneByUuid: {},
  autoSetbelowPendingSince: {}
}

function modPoolsApi() {
  return typeof RandonOneBlockPools !== 'undefined' ? RandonOneBlockPools : null
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

function configFlagEnabled(config, key) {
  if (!config) return false

  var raw = config[key]
  if (raw === true) return true
  if (raw === false) return false
  if (raw == null) return false

  try {
    return String(raw).toLowerCase() === 'true'
  } catch (ignored) {}

  return !!raw
}

function isDebugLoggingEnabled() {
  return configFlagEnabled(STATE.config, 'debug_logging')
}

function debugLog(message) {
  if (isDebugLoggingEnabled()) console.info(message)
}

function cloneConfig(config) {
  return JsonIO.parse(JsonIO.toString(config))
}

function loadConfig() {
  var config = null

  if (typeof RandonOneBlockConfigIO !== 'undefined' && RandonOneBlockConfigIO.read) {
    config = RandonOneBlockConfigIO.read(CONFIG_FILE)
  }

  if (!config) {
    console.warn('[RandomOneBlock] Config not found, creating default at kubejs/config/' + CONFIG_FILE)
    config = cloneConfig(DEFAULT_CONFIG)
    if (typeof RandonOneBlockConfigIO !== 'undefined' && RandonOneBlockConfigIO.write) {
      RandonOneBlockConfigIO.write(CONFIG_FILE, config)
    }
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

function isCollisionFilterEnabled(config) {
  return config != null && config.require_full_collision_cube !== false
}

function collisionFilterReady() {
  return $EmptyBlockGetter != null && $BlockPos != null && $CollisionContext != null
}

function getCollisionMinAabbSize(config) {
  var minSize = Number(config != null ? config.collision_min_aabb_size : 1)
  if (Number.isNaN(minSize) || minSize <= 0) return 1
  return minSize
}

function readAabbSize(aabb, minSize) {
  if (aabb == null) return 0

  try {
    if (aabb.size !== undefined && aabb.size !== null) {
      return Number(aabb.size)
    }
  } catch (ignored) {}

  try {
    var xs = Number(aabb.getXsize())
    var ys = Number(aabb.getYsize())
    var zs = Number(aabb.getZsize())
    if (Number.isNaN(xs) || Number.isNaN(ys) || Number.isNaN(zs)) return 0
    if (xs < minSize || ys < minSize || zs < minSize) return 0
    return minSize
  } catch (ignored2) {}

  return 0
}

function blockCollisionShape(block) {
  var resolved = unwrapRegistryEntry(block)
  if (!resolved || !resolved.defaultBlockState) return null

  var state = resolved.defaultBlockState()
  var emptyGetter = $EmptyBlockGetter.INSTANCE
  var zeroPos = $BlockPos.ZERO
  var emptyContext = $CollisionContext.empty()
  var shape = null

  try {
    shape = state.getCollisionShape(emptyGetter, zeroPos, emptyContext)
  } catch (ignored) {}

  if (!shape) {
    try {
      shape = state.getCollisionShape(emptyGetter, zeroPos)
    } catch (ignored2) {}
  }

  return shape
}

function isFullCollisionCube(block, config) {
  if (!isCollisionFilterEnabled(config)) return true
  if (!collisionFilterReady()) return true

  var minSize = getCollisionMinAabbSize(config)

  try {
    var shape = blockCollisionShape(block)
    if (!shape) return false

    var aabbs = shape.toAabbs()
    if (!aabbs || aabbs.isEmpty()) return false

    return readAabbSize(aabbs.get(0), minSize) >= minSize
  } catch (ignored) {
    return false
  }
}

function recordCollisionReject(rebuildStats, id) {
  if (!rebuildStats) return
  rebuildStats.collisionRejected++
  if (rebuildStats.collisionRejectSample.length < 15) {
    rebuildStats.collisionRejectSample.push(id)
  }
}

function addBlockToPool(poolById, id, block, config, rebuildStats) {
  if (!id || id === 'unknown:block') return 0
  if (!block || !block.defaultBlockState) return 0
  if (isBlacklisted(id, config)) return 0

  const state = block.defaultBlockState()
  if (state.isAir()) return 0
  if (block instanceof $LiquidBlock) return 0

  if (!isFullCollisionCube(block, config)) {
    recordCollisionReject(rebuildStats, id)
    return 0
  }

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
  var rebuildStats = {
    collisionRejected: 0,
    collisionRejectSample: []
  }

  if (isCollisionFilterEnabled(config) && !collisionFilterReady()) {
    console.warn(
      '[RandomOneBlock] require_full_collision_cube is enabled but collision classes are unavailable — skipping collision filter'
    )
  }

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

    totalWeight += addBlockToPool(poolById, id, block, config, rebuildStats)
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

  var modPools = modPoolsApi()
  if (modPools && modPools.updateMasterCatalogFromPool) {
    modPools.updateMasterCatalogFromPool(pool)
  }

  if (isCollisionFilterEnabled(config) && collisionFilterReady()) {
    console.info(
      `[RandomOneBlock] Block pool ready: ${pool.length} unique blocks, total weight ${STATE.totalWeight} (collision rejected: ${rebuildStats.collisionRejected})`
    )
    if (rebuildStats.collisionRejectSample.length > 0) {
      debugLog(
        `[RandomOneBlock] Collision reject sample: ${rebuildStats.collisionRejectSample.join(', ')}`
      )
    }
  } else {
    console.info(
      `[RandomOneBlock] Block pool ready: ${pool.length} unique blocks, total weight ${STATE.totalWeight}`
    )
  }

  for (i = 0; i < Math.min(5, pool.length); i++) {
    samples.push(pool[i].id)
  }
  debugLog(`[RandomOneBlock] Pool sample: ${samples.join(', ')}`)

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
  var preview = []
  var testPicks = []

  if (!isDebugLoggingEnabled()) return

  debugLog(
    '[RandomOneBlock] Pool dump: ' + STATE.pool.length + ' unique blocks, total weight ' + STATE.totalWeight
  )

  for (i = 0; i < STATE.pool.length; i++) {
    if (i < 30) preview.push(STATE.pool[i].id)
  }

  if (verbose) {
    debugLog(`[RandomOneBlock] Pool preview (first 30): ${preview.join(', ')}`)

    for (i = 0; i < 8; i++) {
      testPicks.push(pickRandomBlockIdInternal())
    }
    debugLog(`[RandomOneBlock] Test random picks (8): ${testPicks.join(', ')}`)
  }
}

function countersApi() {
  return typeof RandonOneBlockCounters !== 'undefined' ? RandonOneBlockCounters : null
}

function reloadAll() {
  STATE.config = loadConfig()
  syncActiveFromConfig()
  var modPoolsReload = modPoolsApi()
  if (modPoolsReload && modPoolsReload.reloadModPoolsConfig) {
    modPoolsReload.reloadModPoolsConfig()
  }
  var counters = countersApi()
  if (counters && counters.invalidateTeamCounterCache) {
    counters.invalidateTeamCounterCache()
  }
  rebuildPool()
}

function saveConfig() {
  if (typeof RandonOneBlockConfigIO !== 'undefined' && RandonOneBlockConfigIO.write) {
    RandonOneBlockConfigIO.write(CONFIG_FILE, STATE.config)
    return
  }
  console.error('[RandomOneBlock] Cannot save config — RandonOneBlockConfigIO is not loaded')
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

  // Java BlockPos in Rhino: getX/getY/getZ are not typeof "function" but are still callable.
  // Do not read pos.x/pos.y/pos.z — KubeJS wrappers can scramble axes (e.g. z→x, x→z).
  try {
    const x = pos.getX()
    const y = pos.getY()
    const z = pos.getZ()
    if (x !== undefined && y !== undefined && z !== undefined) {
      return {
        x: Math.floor(Number(x)),
        y: Math.floor(Number(y)),
        z: Math.floor(Number(z))
      }
    }
  } catch (ignored) {}

  // Plain data objects (team JSON) — safe x/y/z, not BlockPos wrappers.
  try {
    if (pos.x !== undefined && pos.y !== undefined && pos.z !== undefined) {
      return {
        x: Math.floor(Number(pos.x)),
        y: Math.floor(Number(pos.y)),
        z: Math.floor(Number(pos.z))
      }
    }
  } catch (ignored2) {}

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

// Block under player feet — must match F3 (e.g. player y=72 standing on dirt at y=71 → x,z from F3, y=71).
function playerStandingBlock(player) {
  try {
    const bx = player.getBlockX()
    const by = player.getBlockY()
    const bz = player.getBlockZ()
    if (bx !== undefined && by !== undefined && bz !== undefined) {
      return {
        x: Math.floor(Number(bx)),
        y: Math.floor(Number(by)) - 1,
        z: Math.floor(Number(bz))
      }
    }
  } catch (ignored) {}

  try {
    const onPos = readBlockPos(player.getOnPos())
    if (onPos) return onPos
  } catch (ignored2) {}

  try {
    const cell = readBlockPos(player.blockPosition())
    if (cell) {
      return { x: cell.x, y: cell.y - 1, z: cell.z }
    }
  } catch (ignored3) {}

  try {
    return {
      x: Math.floor(Number(player.getX())),
      y: Math.floor(Number(player.getY())) - 1,
      z: Math.floor(Number(player.getZ()))
    }
  } catch (ignored4) {}

  return {
    x: Math.floor(Number(player.x)),
    y: Math.floor(Number(player.y)) - 1,
    z: Math.floor(Number(player.z))
  }
}

function samePosition(level, block, active) {
  if (!active) return false
  if (dimensionId(level) !== active.dimension) return false
  const c = blockCoords(block)
  return c.x === active.x && c.y === active.y && c.z === active.z
}

function blockIdAt(level, x, y, z) {
  if (!level) return 'minecraft:air'

  try {
    const wrapper = level.getBlock(x, y, z)
    if (wrapper) {
      if (wrapper.id) {
        const id = String(wrapper.id)
        if (id.indexOf(':') >= 0) return id
      }
      try {
        if (wrapper.blockState && wrapper.blockState.getBlock) {
          const stateId = getBlockId(wrapper.blockState.getBlock())
          if (stateId && stateId !== 'unknown:block') return stateId
        }
      } catch (ignored) {}
      const fromWrapper = getBlockId(wrapper)
      if (fromWrapper && fromWrapper !== 'unknown:block') return fromWrapper
    }
  } catch (ignored2) {}

  try {
    const $BlockPos = Java.loadClass('net.minecraft.core.BlockPos')
    const state = level.getBlockState(new $BlockPos(Math.floor(x), Math.floor(y), Math.floor(z)))
    if (state && state.getBlock) return getBlockId(state.getBlock())
  } catch (ignored3) {}

  return 'minecraft:air'
}

function readPersistentBoolean(player, key) {
  if (!player || !player.persistentData) return false

  try {
    var raw = player.persistentData.getBoolean(key)
    if (raw === true) return true
    if (raw === false) return false

    try {
      if (raw != null && raw.isPresent) return raw.isPresent() ? !!raw.get() : false
    } catch (ignored) {}
  } catch (ignored2) {}

  try {
    if (player.persistentData.getInt(key + '_i') === 1) return true
  } catch (ignored3) {}

  return false
}

function writePersistentBoolean(player, key, value) {
  if (!player || !player.persistentData) return

  try {
    player.persistentData.putBoolean(key, !!value)
  } catch (ignored) {}

  try {
    if (value) player.persistentData.putInt(key + '_i', 1)
    else player.persistentData.remove(key + '_i')
  } catch (ignored2) {}
}

function getPlayerUuidKey(player) {
  if (!player) return 'unknown'

  try {
    return String(player.getUUID())
  } catch (ignored) {}

  return getPlayerDebugName(player)
}

function isAutoSetbelowDone(player) {
  var key = getPlayerUuidKey(player)
  if (STATE.autoSetbelowDoneByUuid && STATE.autoSetbelowDoneByUuid[key]) return true
  return readPersistentBoolean(player, AUTO_SETBELOW_DONE_KEY)
}

function markAutoSetbelowDone(player) {
  var key = getPlayerUuidKey(player)
  if (!STATE.autoSetbelowDoneByUuid) STATE.autoSetbelowDoneByUuid = {}
  STATE.autoSetbelowDoneByUuid[key] = true
  writePersistentBoolean(player, AUTO_SETBELOW_DONE_KEY, true)
  clearAutoSetbelowPending(player)
}

function tellPlayer(player, message) {
  if (!player) return

  try {
    if (player.tell) {
      player.tell(Text.of(message))
      return
    }
  } catch (ignored) {}

  try {
    if (player.sendSystemMessage) player.sendSystemMessage(Text.of(message))
  } catch (ignored2) {}
}

function playerServerLevel(player, server) {
  if (!player) return null

  try {
    if (player.serverLevel) {
      var serverLevel = player.serverLevel()
      if (serverLevel) return serverLevel
    }
  } catch (ignored) {}

  try {
    if (player.getLevel) {
      var level = player.getLevel()
      if (level) return level
    }
  } catch (ignored2) {}

  if (server) {
    try {
      var ref = player.level || null
      if (!ref && player.getLevel) ref = player.getLevel()
      if (ref && ref.dimension && server.getLevel) {
        var resolved = server.getLevel(ref.dimension)
        if (resolved) return resolved
      }
    } catch (ignored3) {}
  }

  return player.level || null
}

function getHavenIslandDistance() {
  var distance = Number(STATE.config?.haven_island_distance ?? 8192)
  return distance > 0 ? distance : 8192
}

function isOneBlockCenterAt(level, x, y, z) {
  if (!level) return false
  if (isIslandCenterAt(level, x, y, z, null)) return true

  var initial = getInitialBlock()
  var foundation = getFoundationBlock()
  return blockIdAt(level, x, y, z) === initial && blockIdAt(level, x, y - 1, z) === foundation
}

function readTeamHomePosition(team, player) {
  if (!team) return null

  var methods = ['getHomePosition', 'getSpawnPosition', 'getHomePos']
  var i = 0
  var pos = null

  for (i = 0; i < methods.length; i++) {
    try {
      if (team[methods[i]]) {
        pos = readBlockPos(team[methods[i]]())
        if (pos) return pos
      }
    } catch (ignored) {}
  }

  try {
    if (team.homePosition) {
      pos = readBlockPos(team.homePosition)
      if (pos) return pos
    }
  } catch (ignored2) {}

  // Haven teleports the player to home on island create — use feet as home fallback.
  if (player) {
    try {
      return {
        x: Math.floor(Number(player.getBlockX())),
        y: Math.floor(Number(player.getBlockY())),
        z: Math.floor(Number(player.getBlockZ()))
      }
    } catch (ignored3) {}
  }

  return null
}

function getHavenHomePosition(player, server) {
  return readTeamHomePosition(getHavenTeam(player, server), player)
}

function buildHavenIslandCenterCandidates(home) {
  var distance = getHavenIslandDistance()
  var dirtY = home.y - 1

  // Haven home Z is the spawn teleport; island dirt is on the grid at home.z + island_distance.
  return [
    { x: home.x, y: dirtY, z: home.z + distance },
    { x: home.x, y: dirtY, z: home.z },
    { x: home.x, y: dirtY, z: home.z - distance },
    { x: home.x + distance, y: dirtY, z: home.z },
    { x: home.x - distance, y: dirtY, z: home.z }
  ]
}

function ensureChunkLoaded(level, x, z) {
  if (!level) return false

  try {
    if (level.getChunk) {
      level.getChunk(Math.floor(x) >> 4, Math.floor(z) >> 4)
      return true
    }
  } catch (ignored) {}

  try {
    if (level.getChunkSource) {
      var source = level.getChunkSource()
      if (source && source.getChunk) {
        source.getChunk(Math.floor(x) >> 4, Math.floor(z) >> 4, true)
        return true
      }
    }
  } catch (ignored2) {}

  return false
}

function findHavenIslandCenter(player, server) {
  var home = getHavenHomePosition(player, server)
  if (!home) return null

  var level = playerServerLevel(player, server)
  var candidates = buildHavenIslandCenterCandidates(home)
  var i = 0

  if (level) {
    for (i = 0; i < candidates.length; i++) {
      ensureChunkLoaded(level, candidates[i].x, candidates[i].z)
      if (isOneBlockCenterAt(level, candidates[i].x, candidates[i].y, candidates[i].z)) {
        return candidates[i]
      }
    }
  }

  // Chunks far from the player are often unloaded — use computed grid offset without block reads.
  return candidates[0]
}

function getAutoSetbelowYOffset() {
  var offset = Number(STATE.config?.auto_setbelow_y_offset ?? AUTO_SETBELOW_Y_OFFSET)
  return Number.isNaN(offset) ? AUTO_SETBELOW_Y_OFFSET : Math.floor(offset)
}

function getAutoSetbelowDelayTicks() {
  var delay = Number(STATE.config?.auto_setbelow_delay_ticks ?? AUTO_SETBELOW_DELAY_TICKS_DEFAULT)
  if (Number.isNaN(delay) || delay < 0) return AUTO_SETBELOW_DELAY_TICKS_DEFAULT
  return Math.floor(delay)
}

function clearAutoSetbelowPending(player) {
  var key = getPlayerUuidKey(player)
  if (STATE.autoSetbelowPendingSince && STATE.autoSetbelowPendingSince[key] !== undefined) {
    delete STATE.autoSetbelowPendingSince[key]
  }
}

function isAutoSetbelowEligible(player, server) {
  var template = getHavenIslandTemplate(player, server)
  if (!template || !shouldAutoSetbelowTemplate(template)) return false
  return resolveAutoSetbelowTarget(player, server) != null
}

function isAutoSetbelowReady(player, server) {
  if (!player || !server) return false
  if (!isAutoSetbelowEligible(player, server)) {
    clearAutoSetbelowPending(player)
    return false
  }

  var key = getPlayerUuidKey(player)
  var now = server.tickCount
  var delay = getAutoSetbelowDelayTicks()
  var since = null

  if (!STATE.autoSetbelowPendingSince) STATE.autoSetbelowPendingSince = {}
  since = STATE.autoSetbelowPendingSince[key]

  if (since === undefined || since < 0) {
    STATE.autoSetbelowPendingSince[key] = now
    logAutoSetbelowDebug(
      player,
      server,
      `island spawn detected — waiting ${delay} ticks before auto setbelow`
    )
    return false
  }

  if (now - since < delay) {
    logAutoSetbelowDebug(
      player,
      server,
      `spawn wait ${now - since}/${delay} ticks before auto setbelow`
    )
    return false
  }

  return true
}

function autoSetbelowTargetFromStand(stand) {
  var offset = getAutoSetbelowYOffset()
  return {
    x: stand.x,
    y: stand.y + offset,
    z: stand.z,
    source: 'player_feet'
  }
}

function resolveAutoSetbelowTarget(player, server) {
  var template = getHavenIslandTemplate(player, server)
  var templateOk = template && shouldAutoSetbelowTemplate(template)
  var stand = playerStandingBlock(player)
  var level = playerServerLevel(player, server)

  // Island create: block under player, adjusted for Haven spawn height (one block lower than stand).
  if (templateOk) {
    return autoSetbelowTargetFromStand(stand)
  }

  if (level && isOneBlockCenterAt(level, stand.x, stand.y, stand.z)) {
    return autoSetbelowTargetFromStand(stand)
  }

  return null
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

function formatPickChancePercent(weight, totalWeight) {
  var w = Number(weight)
  var t = Number(totalWeight)
  var pct = 0

  if (!isFinite(w) || !isFinite(t) || t <= 0 || w <= 0) return '0%'

  pct = (w / t) * 100
  if (pct < 0.01) return pct.toFixed(4) + '%'
  if (pct < 1) return pct.toFixed(3) + '%'
  return pct.toFixed(2) + '%'
}

function recordMasterPickMeta(entry, roll, totalWeight) {
  STATE._lastRoll = roll
  STATE._lastTotalWeight = totalWeight
  STATE._lastPickedId = entry ? entry.id : ''
  STATE._lastPickedWeight = entry ? Number(entry.weight) || 0 : 0
}

function pickRandomBlockIdInternal() {
  var originalRoll = 0

  if (!STATE.pool.length || STATE.totalWeight <= 0) {
    recordMasterPickMeta(null, 0, 0)
    return STATE.config?.initial_block || 'minecraft:dirt'
  }

  originalRoll = randomInt(STATE.totalWeight)
  var roll = originalRoll
  var i = 0
  var entry = null

  for (i = 0; i < STATE.pool.length; i++) {
    entry = STATE.pool[i]
    roll -= Number(entry.weight)
    if (roll < 0) {
      recordMasterPickMeta(entry, originalRoll, STATE.totalWeight)
      return entry.id
    }
  }

  entry = STATE.pool[STATE.pool.length - 1]
  recordMasterPickMeta(entry, originalRoll, STATE.totalWeight)
  return entry.id
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
        debugLog(
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

function normalizeIslandTemplate(template) {
  const raw = String(template || '').toLowerCase().trim()
  if (!raw) return ''
  const colon = raw.lastIndexOf(':')
  return colon >= 0 ? raw.slice(colon + 1) : raw
}

function shouldAutoSetbelowTemplate(template) {
  if (STATE.config?.auto_setbelow_on_island_create === false) return false

  const list = STATE.config?.auto_setbelow_templates
  const wanted = normalizeIslandTemplate(template)
  if (!wanted) return false

  if (!list || !list.length) return wanted === 'oneblock_island'

  var i = 0
  for (i = 0; i < list.length; i++) {
    if (normalizeIslandTemplate(list[i]) === wanted) return true
  }

  return false
}

function getPlayerDebugName(player) {
  if (!player) return 'unknown'

  try {
    if (player.getName) return String(player.getName().getString())
  } catch (ignored) {}

  try {
    if (player.username) return String(player.username)
  } catch (ignored2) {}

  return 'unknown'
}

function shouldLogAutoSetbelowDebug(player, server, message) {
  var key = getPlayerDebugName(player)
  var tick = server && server.tickCount !== undefined ? server.tickCount : 0
  var entry = STATE.autoSetbelowDebug[key]

  if (entry && entry.lastMsg === message && tick - entry.lastTick < AUTO_SETBELOW_DEBUG_INTERVAL) {
    return false
  }

  STATE.autoSetbelowDebug[key] = { lastTick: tick, lastMsg: message }
  return true
}

function logAutoSetbelowDebug(player, server, message) {
  if (!isDebugLoggingEnabled()) return
  if (!shouldLogAutoSetbelowDebug(player, server, message)) return
  console.info(`[RandomOneBlock] Auto setbelow debug [${getPlayerDebugName(player)}]: ${message}`)
}

function describePlayerPosition(player) {
  var stand = playerStandingBlock(player)
  var bx = '?'
  var by = '?'
  var bz = '?'

  try {
    bx = Math.floor(Number(player.getBlockX()))
    by = Math.floor(Number(player.getBlockY()))
    bz = Math.floor(Number(player.getBlockZ()))
  } catch (ignored) {}

  return `feet=${bx} ${by} ${bz} standBlock=${stand.x} ${stand.y} ${stand.z}`
}

function describePyramidContext(player, server) {
  var level = playerServerLevel(player, server)
  var stand = playerStandingBlock(player)

  if (!level) {
    return `no_level ${describePlayerPosition(player)}`
  }

  var initial = getInitialBlock()
  var foundation = getFoundationBlock()
  var surround = STATE.config?.island_center_surround || 'minecraft:grass_block'
  var at = blockIdAt(level, stand.x, stand.y, stand.z)
  var below = blockIdAt(level, stand.x, stand.y - 1, stand.z)
  var below2 = blockIdAt(level, stand.x, stand.y - 2, stand.z)
  var islandCenter = isIslandCenterAt(level, stand.x, stand.y, stand.z, null)
  var dirtOnBedrock = at === initial && below === foundation
  var dim = dimensionId(level)
  var ring =
    '+' +
    blockIdAt(level, stand.x + 1, stand.y - 1, stand.z) +
    ' -' +
    blockIdAt(level, stand.x - 1, stand.y - 1, stand.z) +
    ' ^' +
    blockIdAt(level, stand.x, stand.y - 1, stand.z + 1) +
    ' v' +
    blockIdAt(level, stand.x, stand.y - 1, stand.z - 1)
  var home = getHavenHomePosition(player, server)
  var homeText = home ? `${home.x} ${home.y} ${home.z}` : 'none'
  var havenCenter = findHavenIslandCenter(player, server)
  var havenText = havenCenter ? `${havenCenter.x} ${havenCenter.y} ${havenCenter.z}` : 'none'
  var target = resolveAutoSetbelowTarget(player, server)
  var targetText = target ? `${target.x} ${target.y} ${target.z} (${target.source})` : 'none'

  return (
    `dim=${dim} ${describePlayerPosition(player)} at=${at} below=${below} below2=${below2} ` +
    `islandCenter=${islandCenter} dirtOnBedrock=${dirtOnBedrock} grassRing${ring} surround=${surround} ` +
    `havenHome=${homeText} havenCenter=${havenText} target=${targetText}`
  )
}

function describeAutoSetbelowWatchState(player, server) {
  var done = isAutoSetbelowDone(player)
  var active = getActiveBlock()
  var activeText = 'none'

  if (active && active.enabled) {
    activeText = `${active.dimension} ${active.x} ${active.y} ${active.z}`
  }

  return `doneFlag=${done} active=${activeText} activeMatches=${activeBlockMatchesStanding(player, server)}`
}

function debugAutoSetbelowTrace(player, server) {
  if (!isDebugLoggingEnabled()) return
  ensurePoolReady()

  if (!isMechanicEnabled()) {
    logAutoSetbelowDebug(player, server, 'gate: mechanic_enabled=false')
    return
  }

  if (STATE.config?.auto_setbelow_on_island_create === false) {
    logAutoSetbelowDebug(player, server, 'gate: auto_setbelow_on_island_create=false')
    return
  }

  var watching = shouldWatchPlayerForAutoSetbelow(player, server)
  var target = resolveAutoSetbelowTarget(player, server)
  var onPyramid = target != null
  var template = getHavenIslandTemplate(player, server)
  var havenTeam = getHavenTeam(player, server)
  var teamInfo = havenTeam ? 'team=yes' : 'team=no'

  if (!watching) {
    logAutoSetbelowDebug(
      player,
      server,
      `not watching — ${describeAutoSetbelowWatchState(player, server)} onPyramid=${onPyramid} template=${template || 'none'} ${teamInfo} — ${describePyramidContext(player, server)}`
    )
    return
  }

  if (!target) {
    logAutoSetbelowDebug(
      player,
      server,
      `watching (no target) — ${describeAutoSetbelowWatchState(player, server)} template=${template || 'none'} ${teamInfo} — ${describePyramidContext(player, server)}`
    )
    return
  }

  logAutoSetbelowDebug(
    player,
    server,
    `watching — ${describeAutoSetbelowWatchState(player, server)} onPyramid=${onPyramid} template=${template || 'none'} ${teamInfo} — ${describePyramidContext(player, server)}`
  )

  if (template && !shouldAutoSetbelowTemplate(template)) {
    logAutoSetbelowDebug(
      player,
      server,
      `blocked: template not allowed template=${template} allowed=${JsonIO.toString(STATE.config?.auto_setbelow_templates || [])}`
    )
    return
  }

  tryAutoSetbelowFromPlayer(player, server)
}

function logAutoSetbelowGlobalDebug(server, playerCount) {
  if (!isDebugLoggingEnabled()) return

  var tick = server.tickCount

  if (tick - STATE.autoSetbelowGlobalDebugTick < AUTO_SETBELOW_DEBUG_INTERVAL) return
  STATE.autoSetbelowGlobalDebugTick = tick

  ensurePoolReady()
  console.info(
    `[RandomOneBlock] Auto setbelow poll tick=${tick} players=${playerCount} configLoaded=${STATE.config != null} ` +
      `mechanic=${isMechanicEnabled()} autoSetbelow=${STATE.config?.auto_setbelow_on_island_create !== false} ` +
      `havenMod=${$TeamManager != null}`
  )
}

function resolvePlayerServer(player, fallbackServer) {
  if (!player) return fallbackServer || null

  try {
    if (player.getServer) {
      const server = player.getServer()
      if (server) return server
    }
  } catch (ignored) {}

  try {
    if (player.server) return player.server
  } catch (ignored2) {}

  return fallbackServer || null
}

function getHavenTeamManager(server) {
  if (!server || !$TeamManager) return null

  var tick = server.tickCount
  var havenManager = null

  if (STATE.havenTeamManager && STATE.havenTeamManagerTick >= 0 && tick - STATE.havenTeamManagerTick < 5) {
    return STATE.havenTeamManager
  }

  try {
    havenManager = new $TeamManager()
    havenManager.loadAllTeams(server)
    STATE.havenTeamManager = havenManager
    STATE.havenTeamManagerTick = tick
    return havenManager
  } catch (e) {
    var err = e && e.javaException ? String(e.javaException) : String(e)
    console.error(`[RandomOneBlock] Haven TeamManager load failed: ${err}`)
    return null
  }
}

function giveQuestBookToHotbar(player) {
  if (!player) return

  var current = null

  try {
    if (readPersistentBoolean(player, 'random_one_block_starter_book')) return

    current = player.inventory.getStackInSlot(0)
    if (!current.isEmpty() && String(current.id) === 'ftbquests:book') {
      player.persistentData.putBoolean('random_one_block_starter_book', true)
      return
    }

    player.inventory.setStackInSlot(0, Item.of('ftbquests:book', 1))
    player.persistentData.putBoolean('random_one_block_starter_book', true)
    debugLog('[RandomOneBlock] Placed FTB Quest book in hotbar slot 0')
  } catch (e) {
    const err = e && e.javaException ? String(e.javaException) : String(e)
    console.error(`[RandomOneBlock] Failed to give quest book: ${err}`)
  }
}

function getHavenTeam(player, server) {
  var resolvedServer = resolvePlayerServer(player, server)
  var havenManager = getHavenTeamManager(resolvedServer)
  var uuid = null

  if (!havenManager || !player) return null

  try {
    uuid = player.getUUID ? player.getUUID() : player.uuid
    return havenManager.getTeamByPlayer(uuid)
  } catch (ignored) {}

  return null
}

function getHavenIslandTemplate(player, server) {
  const team = getHavenTeam(player, server)
  if (!team || !team.getIslandTemplate) return ''

  try {
    return String(team.getIslandTemplate())
  } catch (ignored) {}

  return ''
}

function activeBlockMatchesStanding(player, server) {
  const active = getActiveBlock()
  if (!active || !active.enabled) return false
  if (!isStandingOnRandomBlock(player, server)) return false

  const stand = playerStandingBlock(player)
  return stand.x === active.x && stand.y === active.y && stand.z === active.z
}

function shouldWatchPlayerForAutoSetbelow(player, server) {
  if (!player) return false
  if (STATE.config?.auto_setbelow_on_island_create === false) return false
  if (isAutoSetbelowDone(player)) return false
  return true
}

function isStandingOnIslandPyramid(player, server) {
  return resolveAutoSetbelowTarget(player, server) != null
}

function isStandingOnRandomBlock(player, server) {
  const level = playerServerLevel(player, server)
  if (!level) return false

  const stand = playerStandingBlock(player)
  const initial = getInitialBlock()
  const blockId = blockIdAt(level, stand.x, stand.y, stand.z)

  if (blockId === initial) return true
  return isIslandCenterAt(level, stand.x, stand.y, stand.z, null)
}

function tryAutoSetbelowFromPlayer(player, server) {
  if (isAutoSetbelowDone(player)) return true

  if (!isMechanicEnabled()) {
    logAutoSetbelowDebug(player, server, 'try: mechanic_enabled=false')
    return false
  }

  var target = resolveAutoSetbelowTarget(player, server)
  if (!target) {
    logAutoSetbelowDebug(player, server, `try: no target — ${describePyramidContext(player, server)}`)
    return false
  }

  var template = getHavenIslandTemplate(player, server)
  if (template && !shouldAutoSetbelowTemplate(template)) {
    logAutoSetbelowDebug(player, server, `try: template blocked template=${template}`)
    return false
  }

  ensurePoolReady()

  var source = null
  var active = getActiveBlock()
  try {
    source = player.createCommandSourceStack()
  } catch (e) {
    const err = e && e.javaException ? String(e.javaException) : String(e)
    console.error(`[RandomOneBlock] Auto setbelow could not build command source: ${err}`)
    logAutoSetbelowDebug(player, server, `try: command source failed — ${err}`)
    return false
  }

  if (
    active &&
    active.enabled &&
    active.x === target.x &&
    active.y === target.y &&
    active.z === target.z
  ) {
    markAutoSetbelowDone(player)
    debugLog(`[RandomOneBlock] Auto setbelow already at ${target.x} ${target.y} ${target.z}`)
    giveQuestBookToHotbar(player)
    return true
  }

  setActivePosition(source, target.x, target.y, target.z)
  markAutoSetbelowDone(player)

  console.info(
    `[RandomOneBlock] Auto setbelow after island spawn at ${target.x} ${target.y} ${target.z}` +
      ` (${target.source}${template ? `, template=${template}` : ''})`
  )
  tellPlayer(
    player,
    `§aRandom block set at §f${target.x} ${target.y} ${target.z}§a — mine the block under you!`
  )

  giveQuestBookToHotbar(player)
  return true
}

function pollAutoSetbelowForPlayer(player, server) {
  if (!shouldWatchPlayerForAutoSetbelow(player, server)) return
  if (!isAutoSetbelowReady(player, server)) return

  if (isDebugLoggingEnabled()) {
    debugAutoSetbelowTrace(player, server)
    return
  }

  tryAutoSetbelowFromPlayer(player, server)
}

function registerAutoSetbelowWatcher() {
  debugLog(
    `[RandomOneBlock] Registering auto setbelow watcher (ServerEvents.tick, poll=${AUTO_SETBELOW_POLL_INTERVAL}, debug=${AUTO_SETBELOW_DEBUG_INTERVAL})`
  )

  // Haven island create is async and may use the GUI (no CommandEvent). Poll on server
  // until the player stands on the oneblock pyramid center, then run /randomblock setbelow logic.
  ServerEvents.tick(event => {
    const server = event.server
    if (!server) return
    if (server.tickCount % AUTO_SETBELOW_POLL_INTERVAL !== 0) return

    if (!STATE.autoSetbelowWatcherStarted) {
      STATE.autoSetbelowWatcherStarted = true
      debugLog('[RandomOneBlock] Auto setbelow watcher tick handler is alive')
    }

    var players = null
    var count = 0
    var i = 0
    var player = null

    try {
      players = server.getPlayerList().getPlayers()
      count = players.size()
    } catch (e) {
      const err = e && e.javaException ? String(e.javaException) : String(e)
      console.error(`[RandomOneBlock] Auto setbelow player list failed: ${err}`)
      return
    }

    logAutoSetbelowGlobalDebug(server, count)

    for (i = 0; i < count; i++) {
      player = players.get(i)
      if (!player) continue

      try {
        pollAutoSetbelowForPlayer(player, server)
      } catch (e) {
        const err = e && e.javaException ? String(e.javaException) : String(e)
        console.error(`[RandomOneBlock] Auto setbelow poll failed: ${err}`)
      }
    }
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
  var summary = ''
  var modPoolsSummary = modPoolsApi()
  var counters = countersApi()
  var server = resolvePlayerServer(source.player, source.server)

  if (modPoolsSummary && modPoolsSummary.isModPoolGatingEnabled()) {
    summary = ' Mod pools reloaded.'
  }

  if (counters && counters.broadcastHudConfig && server) {
    counters.broadcastHudConfig(server)
    summary += ' Counter HUD refreshed.'
  }

  tell(
    source,
    `§aReloaded random block config (${STATE.pool.length} master blocks).${summary}` +
      (isDebugLoggingEnabled() ? ' §7Pool details in §flogs/kubejs/server.log' : '')
  )
  return 1
}

function cmdCounter(source) {
  var counters = countersApi()
  var player = requirePlayer(source)
  var server = resolvePlayerServer(player, source.server)
  var scopeId = ''
  var count = 0
  var hud = null

  if (!counters || !player) {
    tell(source, '§cRandon counter is not loaded.')
    return 0
  }

  scopeId = counters.resolveScopeId(player, server)
  count = counters.getTeamBlocksMined(scopeId)
  hud = counters.readHudConfigFromMainConfig()

  tell(source, `§eRandon Mined §7(${scopeId})§e: §f${count} §7blocks on your island team.`)
  tell(
    source,
    `§7Overlay: ${hud.enabled ? '§aenabled' : '§cdisabled'} §7— edit §frandon_counter_hud.enabled §7in §fkubejs/config/random_one_block.json`
  )
  counters.syncCounterForPlayer(player, server)
  return 1
}

function cmdInfo(source) {
  ensurePoolReady()

  const level = commandLevel(source)
  const active = getActiveBlock()

  if (!isMechanicEnabled()) {
    tell(source, '§eRandom block: §cdisabled')
    return 1
  }

  if (active && active.enabled) {
    const blockId = blockIdAt(level, active.x, active.y, active.z)
    tell(
      source,
      `§eRandom block placement: §f${active.dimension} ${active.x} ${active.y} ${active.z} §7(${blockId})`
    )
    tell(source, `§eMaster pool: §f${STATE.pool.length} §eblocks`)

    var modPoolsInfo = modPoolsApi()
    if (modPoolsInfo && modPoolsInfo.isModPoolGatingEnabled()) {
      var player = source.player || (source.tell && source.getLevel ? source : null)
      if (player) {
        var poolSummary = modPoolsInfo.getEffectivePoolSummaryForPlayer(
          player,
          player.server || (source.server ? source.server : null)
        )
        tell(
          source,
          `§eYour team pool: §f${poolSummary.effectiveBlocks} §eblocks §7(scope ${poolSummary.scopeId})`
        )
      } else {
        tell(source, '§7Mod pool gating is on — run as a player to see your team pool size.')
      }
    }

    if (STATE.config?.island_template_mode) {
      tell(source, '§7Mine this block to roll a random block from the pool')
    }
  } else if (STATE.config?.island_template_mode) {
    tell(source, `§eRandom block placement: §7not set §e| pool: §f${STATE.pool.length} §eblocks`)
    tell(source, '§7Create a §foneblock_island §7(stand on center dirt) or run §f/randomblock setbelow')
  } else {
    tell(source, '§eRandom block placement: §7not set §7— use §f/randomblock setbelow')
  }

  return 1
}

function cmdPoolEnable(source, args) {
  var pools = modPoolsApi()
  var player = requirePlayer(source)
  var mod = null
  var flag = null

  if (!pools || !pools.enableModForTeam) {
    tell(source, '§cMod pool gating is not loaded.')
    return 0
  }

  if (!player) return 0

  if (args.length < 2) {
    tell(source, '§cUsage: §f/randomblock poolenable <mod> <true|false>')
    return 0
  }

  mod = args[0]
  flag = String(args[1]).toLowerCase()

  if (flag === 'true' || flag === '1' || flag === 'on' || flag === 'yes') {
    pools.enableModForTeam(player, mod, true)
    return 1
  }

  if (flag === 'false' || flag === '0' || flag === 'off' || flag === 'no') {
    if (!pools.disableModForTeam(player, mod, true)) {
      tell(
        source,
        '§cCould not disable §f' +
          mod +
          '§c — not in your team unlocks, unknown namespace, or a starter exception.'
      )
      return 0
    }
    return 1
  }

  tell(source, '§cUsage: §f/randomblock poolenable <mod> <true|false>')
  return 0
}

function cmdPoolsDebugQuests(source, pools, player) {
  var report = null
  var i = 0
  var j = 0
  var quest = null
  var task = null

  if (!pools.dumpQuestUnlockDebug || !pools.buildQuestUnlockDebugReport) {
    tell(source, '§cQuest unlock debug is not loaded.')
    return 0
  }

  report = pools.dumpQuestUnlockDebug(player, player.server)

  tell(source, '§eQuest unlock debug §7(scope ' + report.scope_id + ')')
  tell(source, '§7Trace lines also go to §flogs/kubejs/server.log §7when quest_unlock_trace_log is true')

  for (i = 0; i < (report.quests || []).length; i++) {
    quest = report.quests[i]
    tell(
      source,
      '§f' +
        quest.quest_id +
        ' §7-> §f' +
        quest.mod +
        ' §7| completed=' +
        (quest.quest_completed ? '§ayes' : '§cno') +
        '§7 ready=' +
        (quest.quest_ready ? '§ayes' : '§cno') +
        '§7 pool=' +
        (quest.mod_unlocked ? '§aON' : '§cOFF')
    )
    tell(source, '§7  handlers: §f' + (quest.task_ids || []).join(', '))

    for (j = 0; j < (quest.tasks || []).length; j++) {
      task = quest.tasks[j]
      tell(
        source,
        '§7  task §f' +
          task.task_id +
          ' §7progress §f' +
          task.progress +
          '/' +
          task.max_progress +
          ' §7completed=' +
          (task.task_completed ? '§ayes' : '§cno')
      )
    }
  }

  return 1
}

function cmdPoolsDebugComplete(source, pools, summary, extraArgs) {
  var modArg = extraArgs.length ? String(extraArgs[0]) : ''
  var blockPage = extraArgs.length > 1 ? Math.max(0, Number.parseInt(extraArgs[1], 10) || 0) : 0
  var report = pools.dumpModPoolsDebugComplete(summary.scopeId)
  var mods = report.mods || []
  var resolved = null
  var modEntry = null
  var blockPageSize = 25
  var start = 0
  var end = 0
  var i = 0
  var j = 0

  if (!modArg) {
    tell(
      source,
      `§eMod pool complete §7(scope ${summary.scopeId})§e — §f${report.total_blocks}§e master blocks, §f${mods.length}§e mods`
    )
    tell(source, '§7Every block id is in §flogs/kubejs/server.log')

    for (i = 0; i < mods.length; i++) {
      tell(
        source,
        `§7${mods[i].status} §f${mods[i].display_name} §7(${mods[i].namespace}) §f${mods[i].block_entries.length} §7blocks ${mods[i].effective ? '§aON' : '§cOFF'}`
      )
    }

    tell(source, '§7Blocks in chat: §f/randomblock pools debug complete <mod>')
    return 1
  }

  resolved = pools.resolveKnownModNamespace(modArg)
  for (i = 0; i < mods.length; i++) {
    if (mods[i].namespace === resolved) {
      modEntry = mods[i]
      break
    }
  }

  if (!modEntry) {
    tell(source, '§cUnknown mod namespace: §f' + modArg)
    return 0
  }

  start = blockPage * blockPageSize
  end = Math.min(modEntry.block_entries.length, start + blockPageSize)

  tell(
    source,
    `§e${modEntry.display_name} §7(${modEntry.namespace})§e — blocks ${start + 1}-${end} of ${modEntry.block_entries.length} ${modEntry.effective ? '§aON' : '§cOFF'}`
  )

  for (j = start; j < end; j++) {
    tell(source, `§7${modEntry.block_entries[j].id} §8w=${modEntry.block_entries[j].weight}`)
  }

  if (end < modEntry.block_entries.length) {
    tell(source, `§7More: §f/randomblock pools debug complete ${modEntry.namespace} ${blockPage + 1}`)
  }

  return 1
}

function cmdPools(source, args) {
  var pools = modPoolsApi()
  var player = requirePlayer(source)
  var sub = args.length ? String(args[0]).toLowerCase() : ''
  var summary = null
  var rows = null
  var i = 0
  var page = 0
  var pageSize = 12
  var start = 0
  var end = 0

  if (!pools || !pools.getEffectivePoolSummaryForPlayer) {
    tell(source, '§cMod pool gating is not loaded.')
    return 0
  }

  if (!player) return 0

  summary = pools.getEffectivePoolSummaryForPlayer(player, player.server)
  rows = summary.rows || []

  if (sub === 'debug') {
    var debugSub = args.length > 1 ? String(args[1]).toLowerCase() : ''

    if (debugSub === 'complete') {
      return cmdPoolsDebugComplete(source, pools, summary, args.slice(2))
    }

    if (debugSub === 'quests') {
      return cmdPoolsDebugQuests(source, pools, player)
    }

    var debugResult = pools.dumpModPoolsDebug(summary.scopeId)
    rows = (debugResult && debugResult.rows) || rows
    page = args.length > 1 ? Math.max(0, Number.parseInt(args[1], 10) || 0) : 0
    pageSize = 20
    start = page * pageSize
    end = Math.min(rows.length, start + pageSize)

    tell(
      source,
      `§eMod pool debug §7(page ${page + 1}, scope ${summary.scopeId})§e — effective §f${summary.effectiveBlocks}§e / master §f${STATE.pool.length}`
    )

    for (i = start; i < end; i++) {
      tell(
        source,
        `§7${rows[i].status} §f${rows[i].display_name} §7(${rows[i].namespace}) §f${rows[i].blocks} §7blocks ${rows[i].effective ? '§aON' : '§cOFF'}`
      )
    }

    if (end < rows.length) {
      tell(source, `§7More mods: §f/randomblock pools debug ${page + 1}`)
    }

    tell(source, '§7Full report copied to §flogs/kubejs/server.log')
    return 1
  }

  if (sub === 'list') {
    page = args.length > 1 ? Math.max(0, Number.parseInt(args[1], 10) || 0) : 0
    start = page * pageSize
    end = Math.min(rows.length, start + pageSize)

    tell(
      source,
      `§eMod pools §7(page ${page + 1}, scope ${summary.scopeId})§e — effective §f${summary.effectiveBlocks}§e / master §f${STATE.pool.length}`
    )

    for (i = start; i < end; i++) {
      tell(
        source,
        `§7${rows[i].status} §f${rows[i].display_name} §7(${rows[i].namespace}) §f${rows[i].blocks} §7blocks ${rows[i].effective ? '§aON' : '§cOFF'}`
      )
    }

    if (end < rows.length) {
      tell(source, `§7More mods: §f/randomblock pools list ${page + 1}`)
    }

    return 1
  }

  tell(
    source,
    `§eMod pools §7(${summary.scopeId})§e — effective §f${summary.effectiveBlocks}§e blocks, master §f${STATE.pool.length}§e, mods §f${summary.masterMods}`
  )
  tell(
    source,
    `§7Statuses: vanilla + §f${summary.starterExceptions} §7exceptions, §f${summary.unlockedMods} §7unlocked, §f${summary.lockedMods} §7locked`
  )
  tell(
    source,
    '§7Use §f/randomblock pools list §7| §f/randomblock pools debug §7| §f/randomblock pools debug quests §7| §f/randomblock pools debug complete'
  )
  return 1
}

function cmdHelp(source) {
  tell(
    source,
    '§e/randomblock setbelow §7| §e/randomblock set <x> <y> <z> §7| §e/randomblock info §7| §e/randomblock revert §7| §e/randomblock reload'
  )
  tell(
    source,
    '§e/randomblock counter §7| §e/randomblock poolenable <mod> <true|false> §7| §e/randomblock pools §7| §e/randomblock pools debug quests'
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
    case 'counter':
      return cmdCounter(source)
    case 'poolenable':
      return cmdPoolEnable(source, parsed.args)
    case 'pools':
      return cmdPools(source, parsed.args)
    case 'help':
      return cmdHelp(source)
    default:
      tell(source, `§cUnknown subcommand §f${sub}§c. Use §f/randomblock §cfor help.`)
      return 0
  }
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
registerAutoSetbelowWatcher()

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
  const breaker = event.player
  var counters = countersApi()

  if (breaker && counters && counters.onRandomBlockMined) {
    counters.onRandomBlockMined(breaker, event.server)
  }
  const fallback = getInitialBlock()
  var modPoolsPick = modPoolsApi()
  const nextId =
    breaker && modPoolsPick && modPoolsPick.pickRandomBlockIdForPlayer
      ? modPoolsPick.pickRandomBlockIdForPlayer(breaker, event.server, fallback)
      : pickRandomBlockId()
  const poolSize = STATE.pool.length
  var pickMeta =
    modPoolsPick && modPoolsPick.getLastModPoolPickMeta
      ? modPoolsPick.getLastModPoolPickMeta()
      : {
          poolSize: poolSize,
          scopeId: '',
          namespace: '',
          roll: STATE._lastRoll,
          totalWeight: STATE._lastTotalWeight,
          pickedWeight: STATE._lastPickedWeight
        }
  var effectiveSize = pickMeta.poolSize || poolSize
  var roll = pickMeta.roll != null ? pickMeta.roll : STATE._lastRoll
  var totalWeight = pickMeta.totalWeight || STATE._lastTotalWeight || STATE.totalWeight || 0
  var pickedWeight = pickMeta.pickedWeight || STATE._lastPickedWeight || getWeight(nextId, STATE.config)
  var chancePct = formatPickChancePercent(pickedWeight, totalWeight)
  var rolledNamespace = pickMeta.namespace || String(nextId).split(':')[0]

  event.server.scheduleInTicks(1, () => {
    level.getBlock(coords.x, coords.y, coords.z).set(nextId)
    console.info(
      `[RandomOneBlock] Replaced broken block at ${coords.x} ${coords.y} ${coords.z} with ${nextId} (effectivePool=${effectiveSize}, master=${poolSize}, roll=${roll}/${totalWeight}, w=${pickedWeight}, chance=${chancePct}, scope=${pickMeta.scopeId || 'global'}, mod=${rolledNamespace})`
    )

    if (isFallingBlockId(nextId)) {
      scheduleGravityRecovery(event.server, level, coords)
    }
  })
})