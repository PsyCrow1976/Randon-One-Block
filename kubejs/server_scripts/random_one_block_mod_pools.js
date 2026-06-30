// priority: 3
// Randon One Block — per-team mod namespace gating for the random block pool
// KubeJS loads higher priority first — must load before random_one_block_quest_unlocks.js

const MOD_POOLS_CONFIG_FILE = 'random_one_block_mod_pools.json'
const TEAM_UNLOCKS_FILE = 'random_one_block_team_unlocks.json'
const VANILLA_NAMESPACE = 'minecraft'
const PACK_POOL_ALWAYS_ENABLED = ['elevatorid', 'kubejs', 'uncraftingtable']

const DEFAULT_MOD_POOLS_CONFIG = {
  mod_pool_gating_enabled: true,
  quest_unlock_trace_log: true,
  unlock_scope: 'team',
  starter_exceptions: {
    enabled: ['elevatorid', 'kubejs', 'uncraftingtable'],
    mods_with_minable_blocks: ['minecraft', 'elevatorid', 'kubejs', 'uncraftingtable']
  },
  force_disabled_mods: [
    'c',
    'ftbchunks',
    'ftblibrary',
    'ftbquests',
    'ftbteams',
    'ftbxmodcompat',
    'neoforge',
    'rhino'
  ],
  mod_display_names: {
    exdeorum: 'Ex Deorum',
    sophisticatedstorage: 'Sophisticated Storage'
  },
  quest_unlock_map: {
    '1D5A582F52D7CB30': 'sophisticatedstorage',
    '5F76BA38891F3B07': 'exdeorum'
  },
  quest_task_fallback: {
    '1D5A582F52D7CB30': ['1A2B3C4D5E6F7081'],
    '5F76BA38891F3B07': ['1A85CE9EB3CAAD93']
  }
}

const MOD_POOL_STATE = {
  config: null,
  masterByMod: {},
  modStats: {},
  modNamespaces: [],
  teamUnlockCache: {},
  teamPoolCache: {},
  allTeamUnlocks: null
}

function modPoolsCloneConfig(config) {
  return JsonIO.parse(JsonIO.toString(config))
}

function kubejsConfigPath(filename) {
  if (typeof RandonOneBlockConfigIO !== 'undefined' && RandonOneBlockConfigIO.path) {
    return RandonOneBlockConfigIO.path(filename)
  }
  return null
}

function readKubejsConfigJson(filename) {
  if (typeof RandonOneBlockConfigIO !== 'undefined' && RandonOneBlockConfigIO.read) {
    return RandonOneBlockConfigIO.read(filename)
  }
  return null
}

function writeKubejsConfigJson(filename, payload) {
  if (typeof RandonOneBlockConfigIO !== 'undefined' && RandonOneBlockConfigIO.write) {
    return RandonOneBlockConfigIO.write(filename, payload)
  }
  return false
}

function readConfigObjectField(obj, key) {
  if (!obj) return null

  try {
    if (obj[key] != null && obj[key] !== undefined) return obj[key]
  } catch (ignored) {}

  try {
    if (obj.get && typeof obj.get === 'function') return obj.get(key)
  } catch (ignored2) {}

  return null
}

function readConfigStringMap(obj, key) {
  var raw = readConfigObjectField(obj, key)
  var out = {}
  var iter = null
  var entry = null
  var k = null

  if (!raw) return out

  try {
    for (k in raw) {
      if (Object.prototype.hasOwnProperty.call(raw, k)) out[String(k)] = String(raw[k])
    }
    if (Object.keys(out).length) return out
  } catch (ignored) {}

  try {
    if (raw.entrySet && typeof raw.entrySet === 'function') {
      iter = raw.entrySet().iterator()
      while (iter.hasNext()) {
        entry = iter.next()
        out[String(entry.getKey())] = String(entry.getValue())
      }
    }
  } catch (ignored2) {}

  return out
}

function coerceConfigStringMapValue(raw) {
  var out = {}
  var cloned = null
  var iter = null
  var entry = null
  var k = null

  if (!raw) return out

  try {
    cloned = modPoolsCloneConfig(raw)
    for (k in cloned) {
      if (Object.prototype.hasOwnProperty.call(cloned, k)) out[String(k)] = String(cloned[k])
    }
    if (Object.keys(out).length) return out
  } catch (ignored) {}

  try {
    for (k in raw) {
      if (Object.prototype.hasOwnProperty.call(raw, k)) out[String(k)] = String(raw[k])
    }
    if (Object.keys(out).length) return out
  } catch (ignored2) {}

  try {
    if (raw.entrySet && typeof raw.entrySet === 'function') {
      iter = raw.entrySet().iterator()
      while (iter.hasNext()) {
        entry = iter.next()
        out[String(entry.getKey())] = String(entry.getValue())
      }
    }
  } catch (ignored3) {}

  return out
}

function coerceConfigStringList(value) {
  var out = []
  var i = 0
  var size = 0

  if (!value) return out

  if (Array.isArray(value)) {
    for (i = 0; i < value.length; i++) {
      if (value[i] != null && value[i] !== undefined) out.push(String(value[i]))
    }
    return out
  }

  try {
    if (typeof value.size === 'function' && typeof value.get === 'function') {
      size = value.size()
      for (i = 0; i < size; i++) {
        if (value.get(i) != null) out.push(String(value.get(i)))
      }
      return out
    }
  } catch (ignored) {}

  try {
    if (value.length != null) {
      for (i = 0; i < value.length; i++) {
        if (value[i] != null && value[i] !== undefined) out.push(String(value[i]))
      }
    }
  } catch (ignored2) {}

  return out
}

function getStarterExceptionsFromConfig(config) {
  var raw = config ? config.starter_exceptions : null
  var enabled = null

  if (!raw) return []

  enabled = coerceConfigStringList(readConfigObjectField(raw, 'enabled'))
  if (enabled.length) return enabled

  return coerceConfigStringList(raw)
}

function getPackAlwaysEnabledMods(config) {
  var merged = []
  var seen = {}
  var i = 0
  var mod = null
  var fromConfig = getStarterExceptionsFromConfig(config)

  for (i = 0; i < PACK_POOL_ALWAYS_ENABLED.length; i++) {
    mod = normalizeModNamespace(PACK_POOL_ALWAYS_ENABLED[i])
    if (!seen[mod]) {
      seen[mod] = true
      merged.push(mod)
    }
  }

  for (i = 0; i < fromConfig.length; i++) {
    mod = normalizeModNamespace(fromConfig[i])
    if (!seen[mod]) {
      seen[mod] = true
      merged.push(mod)
    }
  }

  return merged
}

function sanitizeModPoolsConfig(config) {
  var next = modPoolsCloneConfig(config)
  var alwaysEnabled = getPackAlwaysEnabledMods(next)
  var forceDisabled = coerceConfigStringList(next.force_disabled_mods)
  var cleaned = []
  var removed = []
  var i = 0
  var mod = null
  var changed = false

  for (i = 0; i < forceDisabled.length; i++) {
    mod = normalizeModNamespace(forceDisabled[i])
    if (modPoolsListIncludes(alwaysEnabled, mod)) {
      removed.push(mod)
      changed = true
      continue
    }
    cleaned.push(mod)
  }

  if (changed) {
    next.force_disabled_mods = cleaned
    writeKubejsConfigJson(MOD_POOLS_CONFIG_FILE, next)
    console.warn(
      '[RandomOneBlock] Removed starter exceptions from force_disabled_mods: ' + removed.join(', ')
    )
  }

  return next
}

function loadModPoolsConfig() {
  var config = readKubejsConfigJson(MOD_POOLS_CONFIG_FILE)

  if (!config) {
    console.warn(
      '[RandomOneBlock] Mod pools config not found, creating default at kubejs/config/' + MOD_POOLS_CONFIG_FILE
    )
    config = modPoolsCloneConfig(DEFAULT_MOD_POOLS_CONFIG)
    writeKubejsConfigJson(MOD_POOLS_CONFIG_FILE, config)
    return config
  }

  return sanitizeModPoolsConfig(config)
}

function ensureModPoolsConfig() {
  if (!MOD_POOL_STATE.config) {
    MOD_POOL_STATE.config = loadModPoolsConfig()
  }
  return MOD_POOL_STATE.config
}

function isModPoolGatingEnabled() {
  var config = ensureModPoolsConfig()
  return config.mod_pool_gating_enabled !== false
}

function blockNamespace(blockId) {
  if (!blockId) return ''
  var text = String(blockId)
  var idx = text.indexOf(':')
  if (idx < 0) return text.toLowerCase()
  return text.substring(0, idx).toLowerCase()
}

function normalizeModNamespace(mod) {
  return String(mod || '')
    .trim()
    .toLowerCase()
}

function modPoolsListIncludes(list, value) {
  if (!list || !list.length) return false
  var normalized = normalizeModNamespace(value)
  var i = 0

  for (i = 0; i < list.length; i++) {
    if (normalizeModNamespace(list[i]) === normalized) return true
  }

  return false
}

function getModDisplayName(namespace) {
  var config = ensureModPoolsConfig()
  var names = config.mod_display_names || {}
  var key = normalizeModNamespace(namespace)

  if (names[key]) return String(names[key])
  if (key === VANILLA_NAMESPACE) return 'Vanilla'
  return key
}

function readObjectStringField(obj, names) {
  var i = 0
  var value = null

  if (!obj) return null

  for (i = 0; i < names.length; i++) {
    try {
      if (obj[names[i]] != null && obj[names[i]] !== undefined) {
        return String(obj[names[i]])
      }
    } catch (ignored) {}

    try {
      if (obj['get' + names[i]] && typeof obj['get' + names[i]] === 'function') {
        value = obj['get' + names[i]]()
        if (value != null) return String(value)
      }
    } catch (ignored2) {}

    try {
      var method = obj.getClass().getMethod('get' + names[i])
      value = method.invoke(obj)
      if (value != null) return String(value)
    } catch (ignored3) {}
  }

  return null
}

function resolvePlayerUuid(player) {
  var uuid = null
  var $UUID = null
  var text = null

  if (!player) return null

  try {
    uuid = player.uuid
    if (uuid != null) {
      if (typeof uuid === 'string') {
        $UUID = Java.loadClass('java.util.UUID')
        return $UUID.fromString(uuid)
      }
      return uuid
    }
  } catch (ignored) {}

  try {
    if (player.getUUID) return player.getUUID()
  } catch (ignored2) {}

  try {
    if (player.getUuid) return player.getUuid()
  } catch (ignored3) {}

  return null
}

function getPlayerUuidString(player) {
  var uuid = resolvePlayerUuid(player)

  if (!uuid) return 'unknown-player'

  try {
    return String(uuid)
  } catch (ignored) {}

  try {
    return uuid.toString()
  } catch (ignored2) {}

  return 'unknown-player'
}

function resolveFtbQuestTeamData(player) {
  var FTBQuestsAPI = Java.tryLoadClass('dev.ftb.mods.ftbquests.api.FTBQuestsAPI')
  var questFile = null
  var uuid = null

  if (!player) return null

  try {
    if (typeof FTBQuests !== 'undefined' && FTBQuests.getData) {
      return FTBQuests.getData(player)
    }
  } catch (ignored) {}

  if (!FTBQuestsAPI) return null

  try {
    questFile = FTBQuestsAPI.api().getQuestFile(false)
    uuid = resolvePlayerUuid(player)
    if (questFile && uuid) return questFile.getOrCreateTeamData(uuid)
  } catch (ignored2) {}

  return null
}

function resolveHavenTeamScopeId(player, server) {
  if (!player || typeof getHavenTeam !== 'function') return null

  var team = getHavenTeam(player, server)
  var teamId = null

  if (!team) return null

  teamId = readObjectStringField(team, ['TeamId', 'Id', 'UUID', 'Uuid', 'Name'])
  if (teamId) return 'haven-' + teamId

  try {
    return 'haven-' + String(team)
  } catch (ignored) {}

  return null
}

function resolveFtbTeamScopeId(player) {
  var FTBTeams = Java.tryLoadClass('dev.ftb.mods.ftbteams.api.FTBTeamsAPI')
  var team = null
  var teamId = null
  var uuid = null

  if (!FTBTeams || !player) return null

  try {
    uuid = resolvePlayerUuid(player)
    if (uuid) team = FTBTeams.api().getManager().getTeamForPlayerID(uuid).orElse(null)
  } catch (ignored) {}

  if (!team) return null

  teamId = readObjectStringField(team, ['Id', 'ShortId', 'Name'])
  if (teamId) return 'ftbteam-' + teamId

  try {
    return 'ftbteam-' + String(team.getId())
  } catch (ignored2) {}

  return null
}

function getPlayerUnlockScopeId(player) {
  return 'player-' + getPlayerUuidString(player)
}

function resolvePlayerServer(player, server) {
  if (server) return server
  if (player && player.server) return player.server
  return null
}

function getUnlockScopeId(player, server) {
  var havenScope = resolveHavenTeamScopeId(player, server)
  if (havenScope) return havenScope

  var ftbScope = resolveFtbTeamScopeId(player)
  if (ftbScope) return ftbScope

  return getPlayerUnlockScopeId(player)
}

function normalizeTeamUnlockRecord(scopeId, data) {
  var mods = coerceConfigStringList(data && data.enabled_mods ? data.enabled_mods : [])

  return {
    scope: String((data && data.scope) || ensureModPoolsConfig().unlock_scope || 'team'),
    scope_id: String(scopeId),
    enabled_mods: mods,
    updated_at: new Date().toISOString()
  }
}

function mergePlayerScopeUnlocks(player, server, teamScopeId) {
  var playerScope = getPlayerUnlockScopeId(player)
  var teamUnlocks = null
  var playerUnlocks = null
  var i = 0
  var changed = false

  if (!teamScopeId || teamScopeId === playerScope) return teamScopeId

  teamUnlocks = normalizeTeamUnlockRecord(teamScopeId, loadTeamUnlocks(teamScopeId))
  playerUnlocks = normalizeTeamUnlockRecord(playerScope, loadTeamUnlocks(playerScope))

  for (i = 0; i < playerUnlocks.enabled_mods.length; i++) {
    if (!modPoolsListIncludes(teamUnlocks.enabled_mods, playerUnlocks.enabled_mods[i])) {
      teamUnlocks.enabled_mods.push(playerUnlocks.enabled_mods[i])
      changed = true
    }
  }

  if (changed) {
    teamUnlocks.enabled_mods.sort()
    saveTeamUnlocks(teamScopeId, teamUnlocks)
    console.info('[RandomOneBlock] Merged player-scope unlocks into ' + teamScopeId)
  }

  return teamScopeId
}

function resolveUnlockScopeId(player, server) {
  var resolvedServer = resolvePlayerServer(player, server)
  var scopeId = getUnlockScopeId(player, resolvedServer)

  if (scopeId.indexOf('haven-') === 0 || scopeId.indexOf('ftbteam-') === 0) {
    return mergePlayerScopeUnlocks(player, resolvedServer, scopeId)
  }

  return scopeId
}

function getQuestUnlockMap() {
  return coerceConfigStringMapValue(readConfigObjectField(ensureModPoolsConfig(), 'quest_unlock_map'))
}

function loadAllTeamUnlocks() {
  if (MOD_POOL_STATE.allTeamUnlocks) return MOD_POOL_STATE.allTeamUnlocks

  var data = readKubejsConfigJson(TEAM_UNLOCKS_FILE)
  if (!data) data = {}
  else data = modPoolsCloneConfig(data)

  MOD_POOL_STATE.allTeamUnlocks = data
  return data
}

function defaultTeamUnlockData(scopeId) {
  return {
    scope: ensureModPoolsConfig().unlock_scope || 'team',
    scope_id: scopeId,
    enabled_mods: [],
    updated_at: new Date().toISOString()
  }
}

function loadTeamUnlocks(scopeId) {
  if (!scopeId) return defaultTeamUnlockData('unknown')

  if (MOD_POOL_STATE.teamUnlockCache[scopeId]) {
    return MOD_POOL_STATE.teamUnlockCache[scopeId]
  }

  var all = loadAllTeamUnlocks()
  var data = all[scopeId]

  if (!data) {
    data = defaultTeamUnlockData(scopeId)
  }

  data = normalizeTeamUnlockRecord(scopeId, data)
  MOD_POOL_STATE.teamUnlockCache[scopeId] = data
  return data
}

function saveTeamUnlocks(scopeId, data) {
  if (!scopeId || !data) return

  var all = loadAllTeamUnlocks()
  var record = normalizeTeamUnlockRecord(scopeId, data)

  all[scopeId] = record
  MOD_POOL_STATE.teamUnlockCache[scopeId] = record
  MOD_POOL_STATE.allTeamUnlocks = all
  invalidateTeamPoolCache(scopeId)
  writeKubejsConfigJson(TEAM_UNLOCKS_FILE, modPoolsCloneConfig(all))
}

function invalidateTeamPoolCache(scopeId) {
  if (!scopeId) return
  delete MOD_POOL_STATE.teamPoolCache[scopeId]
}

function invalidateAllTeamPoolCaches() {
  MOD_POOL_STATE.teamPoolCache = {}
  MOD_POOL_STATE.teamUnlockCache = {}
  MOD_POOL_STATE.allTeamUnlocks = null
}

function getForceDisabledMods() {
  var raw = coerceConfigStringList(ensureModPoolsConfig().force_disabled_mods)
  var alwaysEnabled = getPackAlwaysEnabledMods(ensureModPoolsConfig())
  var cleaned = []
  var i = 0
  var mod = null

  for (i = 0; i < raw.length; i++) {
    mod = normalizeModNamespace(raw[i])
    if (modPoolsListIncludes(alwaysEnabled, mod)) continue
    cleaned.push(mod)
  }

  return cleaned
}

function getStarterExceptionsRaw() {
  return ensureModPoolsConfig().starter_exceptions
}

function getStarterExceptions() {
  return getPackAlwaysEnabledMods(ensureModPoolsConfig())
}

function getModsWithMinableBlocks() {
  var raw = getStarterExceptionsRaw()
  if (!raw) return []

  if (coerceConfigStringList(raw).length) return []

  return coerceConfigStringList(readConfigObjectField(raw, 'mods_with_minable_blocks'))
}

function isForceDisabledMod(namespace) {
  var mod = normalizeModNamespace(namespace)

  // starter_exceptions.enabled intentionally overrides force_disabled_mods
  if (modPoolsListIncludes(getStarterExceptions(), mod)) return false

  return modPoolsListIncludes(getForceDisabledMods(), mod)
}

function getModPoolStatus(namespace, scopeId) {
  var mod = normalizeModNamespace(namespace)

  if (mod === VANILLA_NAMESPACE) return 'vanilla'
  if (modPoolsListIncludes(getStarterExceptions(), mod)) return 'exception'

  var unlocks = loadTeamUnlocks(scopeId)
  if (modPoolsListIncludes(unlocks.enabled_mods || [], mod)) return 'unlocked'

  return 'locked'
}

function isNamespaceEffective(namespace, scopeId) {
  var status = getModPoolStatus(namespace, scopeId)
  if (status === 'locked') return false
  return !isForceDisabledMod(namespace)
}

function getEnabledNamespacesForScope(scopeId) {
  var enabled = {}
  var unlocks = loadTeamUnlocks(scopeId)
  var exceptions = getStarterExceptions()
  var i = 0

  enabled[VANILLA_NAMESPACE] = true

  for (i = 0; i < exceptions.length; i++) {
    enabled[normalizeModNamespace(exceptions[i])] = true
  }

  for (i = 0; i < (unlocks.enabled_mods || []).length; i++) {
    enabled[normalizeModNamespace(unlocks.enabled_mods[i])] = true
  }

  return enabled
}

function updateMasterCatalogFromPool(poolEntries) {
  var masterByMod = {}
  var modStats = {}
  var modNamespaces = []
  var seenMods = {}
  var i = 0
  var entry = null
  var namespace = null

  if (!poolEntries || !poolEntries.length) {
    MOD_POOL_STATE.masterByMod = {}
    MOD_POOL_STATE.modStats = {}
    MOD_POOL_STATE.modNamespaces = []
    return
  }

  for (i = 0; i < poolEntries.length; i++) {
    entry = poolEntries[i]
    if (!entry || !entry.id) continue

    namespace = blockNamespace(entry.id)
    if (!namespace) continue

    if (!masterByMod[namespace]) {
      masterByMod[namespace] = []
      modStats[namespace] = 0
    }

    masterByMod[namespace].push({ id: entry.id, weight: Number(entry.weight) || 1 })
    modStats[namespace]++
  }

  for (namespace in modStats) {
    modNamespaces.push(namespace)
    seenMods[namespace] = true
  }

  modNamespaces.sort()

  MOD_POOL_STATE.masterByMod = masterByMod
  MOD_POOL_STATE.modStats = modStats
  MOD_POOL_STATE.modNamespaces = modNamespaces
  invalidateAllTeamPoolCaches()
}

function buildEffectivePool(scopeId) {
  if (MOD_POOL_STATE.teamPoolCache[scopeId]) {
    return MOD_POOL_STATE.teamPoolCache[scopeId]
  }

  var enabledNamespaces = getEnabledNamespacesForScope(scopeId)
  var pool = []
  var totalWeight = 0
  var namespace = null
  var blocks = null
  var i = 0
  var j = 0
  var blockEntry = null

  for (namespace in enabledNamespaces) {
    if (!enabledNamespaces[namespace]) continue
    if (isForceDisabledMod(namespace)) continue

    blocks = MOD_POOL_STATE.masterByMod[namespace]
    if (!blocks || !blocks.length) continue

    for (j = 0; j < blocks.length; j++) {
      blockEntry = blocks[j]
      if (!blockEntry || !(blockEntry.weight > 0)) continue
      pool.push({ id: blockEntry.id, weight: blockEntry.weight, namespace: namespace })
      totalWeight += Number(blockEntry.weight)
    }
  }

  if (totalWeight <= 0) totalWeight = 1

  var result = {
    pool: pool,
    totalWeight: Math.max(1, Math.floor(totalWeight)),
    scopeId: scopeId
  }

  MOD_POOL_STATE.teamPoolCache[scopeId] = result
  return result
}

function pickRandomBlockIdFromPool(poolData, fallbackId) {
  var pool = poolData.pool
  var totalWeight = poolData.totalWeight
  var roll = 0
  var i = 0
  var entry = null

  if (!pool || !pool.length || totalWeight <= 0) {
    return fallbackId || 'minecraft:dirt'
  }

  if (typeof randomInt === 'function') {
    roll = randomInt(totalWeight)
  } else {
    roll = 0
  }

  MOD_POOL_STATE._lastRoll = roll
  MOD_POOL_STATE._lastScopeId = poolData.scopeId
  MOD_POOL_STATE._lastPoolSize = pool.length
  MOD_POOL_STATE._lastTotalWeight = totalWeight

  MOD_POOL_STATE._lastOriginalRoll = roll

  for (i = 0; i < pool.length; i++) {
    entry = pool[i]
    roll -= Number(entry.weight)
    if (roll < 0) {
      MOD_POOL_STATE._lastNamespace = entry.namespace
      MOD_POOL_STATE._lastPickedId = entry.id
      MOD_POOL_STATE._lastPickedWeight = Number(entry.weight) || 0
      return entry.id
    }
  }

  entry = pool[pool.length - 1]
  MOD_POOL_STATE._lastNamespace = entry.namespace
  MOD_POOL_STATE._lastPickedId = entry.id
  MOD_POOL_STATE._lastPickedWeight = Number(entry.weight) || 0
  return entry.id
}

function pickRandomBlockIdForPlayer(player, server, fallbackId) {
  if (!isModPoolGatingEnabled()) {
    if (typeof pickRandomBlockId === 'function') return pickRandomBlockId()
    return fallbackId || 'minecraft:dirt'
  }

  var scopeId = resolveUnlockScopeId(player, server)
  var effective = buildEffectivePool(scopeId)
  return pickRandomBlockIdFromPool(effective, fallbackId)
}

function resolveKnownModNamespace(mod) {
  var normalized = normalizeModNamespace(mod)
  var namespaces = MOD_POOL_STATE.modNamespaces || []
  var i = 0

  if (!normalized) return null

  for (i = 0; i < namespaces.length; i++) {
    if (namespaces[i] === normalized) return namespaces[i]
  }

  if (normalized === VANILLA_NAMESPACE) return VANILLA_NAMESPACE
  if (MOD_POOL_STATE.modStats[normalized] != null) return normalized

  for (i = 0; i < namespaces.length; i++) {
    if (namespaces[i].indexOf(normalized) >= 0 || normalized.indexOf(namespaces[i]) >= 0) {
      return namespaces[i]
    }
  }

  return normalized
}

function enableModForTeam(player, modNamespace, announce, server) {
  var scopeId = resolveUnlockScopeId(player, server)
  var resolvedMod = resolveKnownModNamespace(modNamespace)
  var unlocks = loadTeamUnlocks(scopeId)
  var displayName = getModDisplayName(resolvedMod)

  if (!resolvedMod) {
    console.warn(`[RandomOneBlock] poolenable ignored — unknown mod namespace: ${modNamespace}`)
    return false
  }

  if (resolvedMod === VANILLA_NAMESPACE) {
    if (announce && player && player.tell) {
      player.tell(Text.of('§7Vanilla blocks are always enabled in the random pool.'))
    }
    return true
  }

  if (modPoolsListIncludes(getStarterExceptions(), resolvedMod)) {
    if (announce && player && player.tell) {
      var starterPool = buildEffectivePool(scopeId)
      player.tell(
        Text.of(
          '§7Starter exception mod §f' +
            displayName +
            ' §7(§f' +
            resolvedMod +
            '§7) is already enabled. Effective pool: §f' +
            starterPool.pool.length +
            '§7 blocks.'
        )
      )
    }
    return true
  }

  if (isForceDisabledMod(resolvedMod)) {
    console.warn(`[RandomOneBlock] poolenable rejected force-disabled mod: ${resolvedMod}`)
    if (announce && player && player.tell) {
      player.tell(Text.of('§cThat mod cannot be enabled in the random pool.'))
    }
    return false
  }

  if (!modPoolsListIncludes(unlocks.enabled_mods, resolvedMod)) {
    unlocks.enabled_mods.push(resolvedMod)
    unlocks.enabled_mods.sort()
    saveTeamUnlocks(scopeId, unlocks)
    console.info(`[RandomOneBlock] Unlocked mod pool for ${scopeId}: ${resolvedMod}`)
  }

  if (announce && player && player.tell) {
    var effective = buildEffectivePool(scopeId)
    player.tell(
      Text.of(
        '§aRandom block pool unlocked: §f' +
          displayName +
          '§a (§f' +
          resolvedMod +
          '§a). Effective pool: §f' +
          effective.pool.length +
          '§a blocks.'
      )
    )
  }

  return true
}

function disableModForTeam(player, modNamespace, announce, server) {
  var scopeId = resolveUnlockScopeId(player, server)
  var resolvedMod = resolveKnownModNamespace(modNamespace)
  var unlocks = loadTeamUnlocks(scopeId)
  var next = []
  var i = 0
  var changed = false

  if (!resolvedMod || resolvedMod === VANILLA_NAMESPACE) return false
  if (modPoolsListIncludes(getStarterExceptions(), resolvedMod)) {
    if (announce && player && player.tell) {
      player.tell(Text.of('§cStarter exception mods cannot be disabled.'))
    }
    return false
  }

  for (i = 0; i < (unlocks.enabled_mods || []).length; i++) {
    if (normalizeModNamespace(unlocks.enabled_mods[i]) !== resolvedMod) {
      next.push(unlocks.enabled_mods[i])
    } else {
      changed = true
    }
  }

  if (!changed) return false

  unlocks.enabled_mods = next
  saveTeamUnlocks(scopeId, unlocks)

  if (announce && player && player.tell) {
    player.tell(Text.of('§eDisabled random pool mod: §f' + getModDisplayName(resolvedMod)))
  }

  return true
}

function buildModPoolReportRows(scopeId) {
  var rows = []
  var namespaces = MOD_POOL_STATE.modNamespaces || []
  var i = 0
  var namespace = null
  var status = null
  var effective = false
  var blockCount = 0

  for (i = 0; i < namespaces.length; i++) {
    namespace = namespaces[i]
    status = getModPoolStatus(namespace, scopeId)
    effective = isNamespaceEffective(namespace, scopeId)
    blockCount = MOD_POOL_STATE.modStats[namespace] || 0

    rows.push({
      display_name: getModDisplayName(namespace),
      namespace: namespace,
      blocks: blockCount,
      status: status,
      effective: effective
    })
  }

  rows.sort(function (a, b) {
    if (a.status !== b.status) return String(a.status).localeCompare(String(b.status))
    return String(a.display_name).localeCompare(String(b.display_name))
  })

  return rows
}

function dumpModPoolsDebug(scopeId) {
  var rows = buildModPoolReportRows(scopeId)
  var effective = buildEffectivePool(scopeId)
  var i = 0

  console.info('[RandomOneBlock] === Mod pool debug report ===')
  console.info('[RandomOneBlock] scope_id: ' + scopeId)
  console.info('[RandomOneBlock] effective_blocks: ' + effective.pool.length)
  console.info('[RandomOneBlock] effective_weight: ' + effective.totalWeight)
  console.info('[RandomOneBlock] master_mods: ' + rows.length)
  console.info('[RandomOneBlock] display_name | namespace | blocks | status | effective')

  for (i = 0; i < rows.length; i++) {
    console.info(
      '[RandomOneBlock] ' +
        rows[i].display_name +
        ' | ' +
        rows[i].namespace +
        ' | ' +
        rows[i].blocks +
        ' | ' +
        rows[i].status +
        ' | ' +
        (rows[i].effective ? 'ON' : 'OFF')
    )
  }

  console.info('[RandomOneBlock] === End mod pool debug report ===')
  return { rows: rows, scope_id: scopeId }
}

function buildModPoolCompleteReport(scopeId) {
  var rows = buildModPoolReportRows(scopeId)
  var mods = []
  var i = 0
  var j = 0
  var namespace = null
  var masterBlocks = null
  var entries = []
  var totalBlocks = 0

  for (i = 0; i < rows.length; i++) {
    namespace = rows[i].namespace
    masterBlocks = MOD_POOL_STATE.masterByMod[namespace] || []
    entries = []

    for (j = 0; j < masterBlocks.length; j++) {
      entries.push({
        id: masterBlocks[j].id,
        weight: Number(masterBlocks[j].weight) || 1,
        rollable: rows[i].effective
      })
    }

    entries.sort(function (a, b) {
      return String(a.id).localeCompare(String(b.id))
    })

    totalBlocks += entries.length

    mods.push({
      display_name: rows[i].display_name,
      namespace: namespace,
      status: rows[i].status,
      effective: rows[i].effective,
      block_entries: entries
    })
  }

  return { scope_id: scopeId, mods: mods, total_blocks: totalBlocks }
}

function dumpModPoolsDebugComplete(scopeId) {
  var report = buildModPoolCompleteReport(scopeId)
  var effective = buildEffectivePool(scopeId)
  var i = 0
  var j = 0
  var mod = null
  var entry = null

  console.info('[RandomOneBlock] === Mod pool complete debug report ===')
  console.info('[RandomOneBlock] scope_id: ' + scopeId)
  console.info('[RandomOneBlock] effective_blocks: ' + effective.pool.length)
  console.info('[RandomOneBlock] master_blocks: ' + report.total_blocks)
  console.info('[RandomOneBlock] master_mods: ' + report.mods.length)

  for (i = 0; i < report.mods.length; i++) {
    mod = report.mods[i]
    console.info(
      '[RandomOneBlock] --- ' +
        mod.display_name +
        ' (' +
        mod.namespace +
        ') | ' +
        mod.status +
        ' | ' +
        (mod.effective ? 'ON' : 'OFF') +
        ' | ' +
        mod.block_entries.length +
        ' blocks ---'
    )

    for (j = 0; j < mod.block_entries.length; j++) {
      entry = mod.block_entries[j]
      console.info(
        '[RandomOneBlock]   ' +
          entry.id +
          '\tweight=' +
          entry.weight +
          (entry.rollable ? '' : '\t(not in effective pool)')
      )
    }
  }

  console.info('[RandomOneBlock] === End mod pool complete debug report ===')
  return report
}

function reloadModPoolsConfig() {
  MOD_POOL_STATE.config = loadModPoolsConfig()
  invalidateAllTeamPoolCaches()
  console.info('[RandomOneBlock] Mod pools config path: ' + kubejsConfigPath(MOD_POOLS_CONFIG_FILE))
  console.info(
    '[RandomOneBlock] Mod pool starter exceptions (enabled): ' + getStarterExceptions().join(', ')
  )
  console.info(
    '[RandomOneBlock] Mod pool force_disabled_mods (effective): ' + (getForceDisabledMods() || []).join(', ')
  )
  console.info(
    '[RandomOneBlock] Mod pool quest unlock map: ' + Object.keys(getQuestUnlockMap()).length + ' quest(s)'
  )
}

function getLastModPoolPickMeta() {
  return {
    scopeId: MOD_POOL_STATE._lastScopeId || '',
    namespace: MOD_POOL_STATE._lastNamespace || '',
    poolSize: MOD_POOL_STATE._lastPoolSize || 0,
    totalWeight: MOD_POOL_STATE._lastTotalWeight || 0,
    roll: MOD_POOL_STATE._lastOriginalRoll != null ? MOD_POOL_STATE._lastOriginalRoll : MOD_POOL_STATE._lastRoll,
    pickedId: MOD_POOL_STATE._lastPickedId || '',
    pickedWeight: MOD_POOL_STATE._lastPickedWeight || 0
  }
}

function getEffectivePoolSummaryForPlayer(player, server) {
  var scopeId = resolveUnlockScopeId(player, server)
  var effective = buildEffectivePool(scopeId)
  var rows = buildModPoolReportRows(scopeId)
  var starterCount = 0
  var unlockedCount = 0
  var lockedCount = 0
  var i = 0

  for (i = 0; i < rows.length; i++) {
    if (rows[i].status === 'locked') lockedCount++
    if (rows[i].status === 'unlocked') unlockedCount++
    if (rows[i].status === 'exception') starterCount++
  }

  return {
    scopeId: scopeId,
    masterMods: rows.length,
    effectiveBlocks: effective.pool.length,
    effectiveWeight: effective.totalWeight,
    starterExceptions: starterCount,
    unlockedMods: unlockedCount,
    lockedMods: lockedCount,
    rows: rows
  }
}

function parseFtbQuestIdHex(questId) {
  return String(questId || '')
    .replace(/[^0-9A-Fa-f]/g, '')
    .toUpperCase()
}

function parseFtbQuestIdLong(questId) {
  var hex = parseFtbQuestIdHex(questId)
  var $Long = null

  if (!hex) return null

  try {
    $Long = Java.loadClass('java.lang.Long')
    while (hex.length < 16) hex = '0' + hex
    if (hex.length > 16) hex = hex.substring(hex.length - 16)
    return $Long.parseUnsignedLong(hex, 16)
  } catch (ignored) {}

  return null
}

function resolveQuestObject(questFile, questId) {
  var idLong = parseFtbQuestIdLong(questId)
  var quest = null
  var base = null

  if (!questFile || idLong == null) return null

  try {
    if (questFile.getQuest) quest = questFile.getQuest(idLong)
  } catch (ignored) {}

  if (!quest) {
    try {
      if (questFile.getBase) base = questFile.getBase(idLong)
      if (base) quest = base
    } catch (ignored2) {}
  }

  return quest
}

function firstPlayerFromCollection(players) {
  var i = 0
  var size = 0

  if (!players) return null

  try {
    if (typeof players.size === 'function' && typeof players.get === 'function') {
      size = players.size()
      if (size > 0) return players.get(0)
    }
  } catch (ignored) {}

  try {
    if (players.length > 0) return players[0]
  } catch (ignored2) {}

  try {
    if (players.iterator) {
      var iter = players.iterator()
      if (iter.hasNext()) return iter.next()
    }
  } catch (ignored3) {}

  return null
}

function resolveQuestFileCurrentPlayer() {
  var FTBQuestsAPI = Java.tryLoadClass('dev.ftb.mods.ftbquests.api.FTBQuestsAPI')
  var questFile = null

  if (!FTBQuestsAPI) return null

  try {
    questFile = FTBQuestsAPI.api().getQuestFile(false)
    if (questFile && questFile.getCurrentPlayer) return questFile.getCurrentPlayer()
  } catch (ignored) {}

  return null
}

function resolveQuestEventPlayer(event) {
  var player = null

  if (!event) return null

  try {
    if (event.getPlayer) player = event.getPlayer()
  } catch (ignored) {}

  if (!player) {
    try {
      if (event.getCurrentPlayer) player = event.getCurrentPlayer()
    } catch (ignored2) {}
  }

  if (!player) {
    try {
      if (event.player) player = event.player
    } catch (ignored3) {}
  }

  if (!player) {
    try {
      player = firstPlayerFromCollection(event.getNotifiedPlayers ? event.getNotifiedPlayers() : null)
    } catch (ignored4) {}
  }

  if (!player) {
    try {
      player = firstPlayerFromCollection(event.getOnlineMembers ? event.getOnlineMembers() : null)
    } catch (ignored5) {}
  }

  if (!player) player = resolveQuestFileCurrentPlayer()

  return player
}

function resolveProgressEventPlayer(progressData) {
  var player = null

  if (!progressData) return null

  player = resolveQuestFileCurrentPlayer()
  if (player) return player

  try {
    player = firstPlayerFromCollection(progressData.notifiedPlayers())
    if (player) return player
  } catch (ignored) {}

  try {
    player = firstPlayerFromCollection(progressData.onlineMembers())
    if (player) return player
  } catch (ignored2) {}

  return null
}

function resolveQuestEventServer(event, player) {
  var server = null

  if (!event) return resolvePlayerServer(player, null)

  try {
    if (event.server) server = event.server
  } catch (ignored) {}

  if (!server) {
    try {
      if (event.getServer) server = event.getServer()
    } catch (ignored2) {}
  }

  return resolvePlayerServer(player, server)
}

function resolveProgressEventServer(progressData, player) {
  return resolvePlayerServer(player, null)
}

function lookupQuestUnlockMod(questId) {
  var map = getQuestUnlockMap()
  var normalized = parseFtbQuestIdHex(questId)
  var key = null

  if (!normalized) return null
  if (map[normalized]) return map[normalized]

  for (key in map) {
    if (!map.hasOwnProperty(key)) continue
    if (parseFtbQuestIdHex(key) === normalized) return map[key]
  }

  return null
}

function readConfigMapEntry(raw, key) {
  if (!raw || !key) return null

  try {
    if (raw[key] != null && raw[key] !== undefined) return raw[key]
  } catch (ignored) {}

  try {
    if (raw.get && typeof raw.get === 'function') return raw.get(key)
  } catch (ignored2) {}

  return null
}

function getQuestTaskFallbackList(questId) {
  var normalized = parseFtbQuestIdHex(questId)
  var fileRaw = readConfigObjectField(ensureModPoolsConfig(), 'quest_task_fallback')
  var defaultRaw = DEFAULT_MOD_POOLS_CONFIG.quest_task_fallback
  var entry = readConfigMapEntry(fileRaw, normalized)
  var list = []
  var out = []
  var i = 0
  var taskId = null

  if (entry == null && defaultRaw) {
    entry = readConfigMapEntry(defaultRaw, normalized)
  }

  list = coerceConfigStringList(entry)

  for (i = 0; i < list.length; i++) {
    taskId = parseFtbQuestIdHex(list[i])
    if (taskId) out.push(taskId)
  }

  return out
}

function discoverQuestTaskHexIds(questId) {
  var FTBQuestsAPI = Java.tryLoadClass('dev.ftb.mods.ftbquests.api.FTBQuestsAPI')
  var questFile = null
  var quest = null
  var tasks = null
  var out = []
  var seen = {}
  var i = 0
  var task = null
  var taskId = null
  var iter = null
  var fallback = null

  fallback = getQuestTaskFallbackList(questId)
  for (i = 0; i < fallback.length; i++) {
    if (fallback[i] && !seen[fallback[i]]) {
      seen[fallback[i]] = true
      out.push(fallback[i])
    }
  }

  if (!FTBQuestsAPI) return out

  try {
    questFile = FTBQuestsAPI.api().getQuestFile(false)
  } catch (ignored) {}

  if (!questFile) return out

  quest = resolveQuestObject(questFile, questId)
  if (!quest) return out

  try {
    tasks = quest.getTasks()
  } catch (ignored2) {}

  if (!tasks) return out

  try {
    if (typeof tasks.size === 'function' && typeof tasks.get === 'function') {
      for (i = 0; i < tasks.size(); i++) {
        task = tasks.get(i)
        if (!task) continue
        taskId = parseFtbQuestIdHex(String(task.toString()))
        if (taskId && !seen[taskId]) {
          seen[taskId] = true
          out.push(taskId)
        }
      }
      return out
    }
  } catch (ignored3) {}

  try {
    iter = tasks.iterator()
    while (iter.hasNext()) {
      task = iter.next()
      if (!task) continue
      taskId = parseFtbQuestIdHex(String(task.toString()))
      if (taskId && !seen[taskId]) {
        seen[taskId] = true
        out.push(taskId)
      }
    }
  } catch (ignored4) {}

  return out
}

function isQuestUnlockTraceEnabled() {
  var config = ensureModPoolsConfig()
  return config.quest_unlock_trace_log !== false
}

function logQuestUnlockTrace(message, details) {
  var text = '[RandomOneBlock] Quest unlock trace: ' + String(message || '')
  var key = null

  if (!isQuestUnlockTraceEnabled()) return

  if (details) {
    for (key in details) {
      if (!details.hasOwnProperty(key)) continue
      text += ' | ' + key + '=' + String(details[key])
    }
  }

  console.info(text)
}

function forEachQuestTask(quest, callback) {
  var tasks = null
  var i = 0
  var task = null
  var iter = null

  if (!quest || !callback) return

  try {
    tasks = quest.getTasks()
  } catch (ignored) {}

  if (!tasks) return

  try {
    if (typeof tasks.size === 'function' && typeof tasks.get === 'function') {
      for (i = 0; i < tasks.size(); i++) {
        task = tasks.get(i)
        if (task) callback(task, i)
      }
      return
    }
  } catch (ignored2) {}

  try {
    iter = tasks.iterator()
    while (iter.hasNext()) {
      task = iter.next()
      if (task) callback(task, i++)
    }
  } catch (ignored3) {}
}

function getQuestTaskProgressRows(player, questId) {
  var FTBQuestsAPI = Java.tryLoadClass('dev.ftb.mods.ftbquests.api.FTBQuestsAPI')
  var questFile = null
  var data = null
  var quest = null
  var rows = []

  if (!FTBQuestsAPI || !player || !questId) return rows

  try {
    questFile = FTBQuestsAPI.api().getQuestFile(false)
    if (!questFile) return rows
    data = resolveFtbQuestTeamData(player)
    if (!data) return rows
    quest = resolveQuestObject(questFile, questId)
    if (!quest) return rows

    forEachQuestTask(quest, function (task) {
      var progress = 0
      var maxProgress = 1
      var taskHex = ''
      var complete = false

      try {
        progress = Number(data.getProgress(task))
      } catch (ignored) {}

      try {
        maxProgress = Number(task.getMaxProgress())
      } catch (ignored2) {
        maxProgress = 1
      }

      try {
        taskHex = parseFtbQuestIdHex(String(task.toString()))
      } catch (ignored3) {}

      try {
        complete = data.isCompleted(task)
      } catch (ignored4) {
        complete = progress >= maxProgress && maxProgress > 0
      }

      rows.push({
        task_id: taskHex,
        progress: progress,
        max_progress: maxProgress,
        task_completed: complete
      })
    })
  } catch (ignored5) {}

  return rows
}

function isQuestReadyForUnlock(player, questId) {
  var rows = getQuestTaskProgressRows(player, questId)
  var i = 0

  if (isQuestCompletedForPlayer(player, questId)) return true
  if (!rows.length) return false

  for (i = 0; i < rows.length; i++) {
    if (!rows[i].task_completed && !(rows[i].progress >= rows[i].max_progress && rows[i].max_progress > 0)) {
      return false
    }
  }

  return true
}

function isModUnlockedForPlayer(player, modNamespace, server) {
  var scopeId = resolveUnlockScopeId(player, server)
  var unlocks = loadTeamUnlocks(scopeId)
  return modPoolsListIncludes(unlocks.enabled_mods, modNamespace)
}

function buildQuestUnlockDebugReport(player, server) {
  var map = getQuestUnlockMap()
  var questId = null
  var mod = null
  var rows = []
  var taskRows = []
  var i = 0

  for (questId in map) {
    if (!map.hasOwnProperty(questId)) continue
    mod = map[questId]
    taskRows = getQuestTaskProgressRows(player, questId)
    rows.push({
      quest_id: parseFtbQuestIdHex(questId),
      mod: mod,
      task_ids: discoverQuestTaskHexIds(questId),
      quest_completed: isQuestCompletedForPlayer(player, questId),
      quest_ready: isQuestReadyForUnlock(player, questId),
      mod_unlocked: isModUnlockedForPlayer(player, mod, server),
      tasks: taskRows
    })
  }

  return {
    player: getPlayerUuidString(player),
    scope_id: resolveUnlockScopeId(player, server),
    quests: rows
  }
}

function dumpQuestUnlockDebug(player, server) {
  var report = buildQuestUnlockDebugReport(player, server)
  var i = 0
  var j = 0
  var quest = null
  var task = null

  console.info('[RandomOneBlock] === Quest unlock debug report ===')
  console.info('[RandomOneBlock] player: ' + report.player)
  console.info('[RandomOneBlock] scope_id: ' + report.scope_id)

  for (i = 0; i < report.quests.length; i++) {
    quest = report.quests[i]
    console.info(
      '[RandomOneBlock] quest ' +
        quest.quest_id +
        ' -> ' +
        quest.mod +
        ' | completed=' +
        quest.quest_completed +
        ' ready=' +
        quest.quest_ready +
        ' unlocked=' +
        quest.mod_unlocked +
        ' handlers=' +
        (quest.task_ids || []).join(',')
    )

    for (j = 0; j < (quest.tasks || []).length; j++) {
      task = quest.tasks[j]
      console.info(
        '[RandomOneBlock]   task ' +
          task.task_id +
          ' progress=' +
          task.progress +
          '/' +
          task.max_progress +
          ' completed=' +
          task.task_completed
      )
    }
  }

  console.info('[RandomOneBlock] === End quest unlock debug report ===')
  return report
}

function unlockModPoolForQuestId(player, questId, announce, server) {
  var mod = lookupQuestUnlockMod(questId)

  if (!mod || !player) return false

  if (isModUnlockedForPlayer(player, mod, server)) {
    logQuestUnlockTrace('already_unlocked', {
      quest: parseFtbQuestIdHex(questId),
      mod: mod
    })
    return true
  }

  console.info('[RandomOneBlock] Quest completed unlock: ' + parseFtbQuestIdHex(questId) + ' -> ' + mod)
  return enableModForTeam(player, mod, announce !== false, server)
}

function tryUnlockQuestForPlayer(player, questId, announce, server, reason) {
  var mod = lookupQuestUnlockMod(questId)
  var questHex = parseFtbQuestIdHex(questId)

  if (!player || !mod) {
    logQuestUnlockTrace('try_skip_missing', { reason: reason, quest: questHex, mod: mod || 'none' })
    return false
  }

  if (!isQuestReadyForUnlock(player, questId)) {
    logQuestUnlockTrace('try_skip_not_ready', {
      reason: reason,
      quest: questHex,
      completed: isQuestCompletedForPlayer(player, questId)
    })
    return false
  }

  logQuestUnlockTrace('try_unlock', { reason: reason, quest: questHex, mod: mod })
  return unlockModPoolForQuestId(player, questId, announce, server)
}

function scheduleQuestUnlockAttempts(player, questId, server, reason) {
  var delays = [1, 5, 20]
  var i = 0

  if (!player || !server || !server.scheduleInTicks) return

  for (i = 0; i < delays.length; i++) {
    ;(function (delayTicks, attemptReason) {
      server.scheduleInTicks(delayTicks, function () {
        tryUnlockQuestForPlayer(player, questId, true, server, attemptReason + '@' + delayTicks + 't')
      })
    })(delays[i], reason)
  }
}

function isQuestCompletedForPlayer(player, questId) {
  var FTBQuestsAPI = Java.tryLoadClass('dev.ftb.mods.ftbquests.api.FTBQuestsAPI')
  var questFile = null
  var data = null
  var quest = null

  if (!FTBQuestsAPI || !player || !questId) return false

  try {
    questFile = FTBQuestsAPI.api().getQuestFile(false)
    if (!questFile) return false
    data = resolveFtbQuestTeamData(player)
    if (!data) return false
    quest = resolveQuestObject(questFile, questId)
    if (!quest) return false
    return data.isCompleted(quest)
  } catch (ignored) {}

  return false
}

function backfillQuestUnlocksForPlayer(player) {
  var map = getQuestUnlockMap()
  var questId = null
  var server = resolvePlayerServer(player, null)

  for (questId in map) {
    if (!map.hasOwnProperty(questId)) continue
    if (!isQuestReadyForUnlock(player, questId)) continue
    tryUnlockQuestForPlayer(player, questId, false, server, 'backfill')
  }
}

// Shared KubeJS server scope — do not assign to `global` (unmodifiable on reload).
var RandonOneBlockPools = {
  ensureModPoolsConfig: ensureModPoolsConfig,
  reloadModPoolsConfig: reloadModPoolsConfig,
  isModPoolGatingEnabled: isModPoolGatingEnabled,
  updateMasterCatalogFromPool: updateMasterCatalogFromPool,
  getUnlockScopeId: getUnlockScopeId,
  resolveUnlockScopeId: resolveUnlockScopeId,
  enableModForTeam: enableModForTeam,
  disableModForTeam: disableModForTeam,
  pickRandomBlockIdForPlayer: pickRandomBlockIdForPlayer,
  getEffectivePoolSummaryForPlayer: getEffectivePoolSummaryForPlayer,
  dumpModPoolsDebug: dumpModPoolsDebug,
  dumpModPoolsDebugComplete: dumpModPoolsDebugComplete,
  buildModPoolReportRows: buildModPoolReportRows,
  buildModPoolCompleteReport: buildModPoolCompleteReport,
  backfillQuestUnlocksForPlayer: backfillQuestUnlocksForPlayer,
  getLastModPoolPickMeta: getLastModPoolPickMeta,
  resolveKnownModNamespace: resolveKnownModNamespace,
  getModsWithMinableBlocks: getModsWithMinableBlocks,
  getQuestUnlockMap: getQuestUnlockMap,
  lookupQuestUnlockMod: lookupQuestUnlockMod,
  unlockModPoolForQuestId: unlockModPoolForQuestId,
  discoverQuestTaskHexIds: discoverQuestTaskHexIds,
  isQuestCompletedForPlayer: isQuestCompletedForPlayer,
  isQuestReadyForUnlock: isQuestReadyForUnlock,
  tryUnlockQuestForPlayer: tryUnlockQuestForPlayer,
  scheduleQuestUnlockAttempts: scheduleQuestUnlockAttempts,
  buildQuestUnlockDebugReport: buildQuestUnlockDebugReport,
  dumpQuestUnlockDebug: dumpQuestUnlockDebug,
  logQuestUnlockTrace: logQuestUnlockTrace,
  parseFtbQuestIdHex: parseFtbQuestIdHex,
  getPlayerUuidString: getPlayerUuidString,
  resolveQuestEventPlayer: resolveQuestEventPlayer,
  resolveQuestEventServer: resolveQuestEventServer
}

ServerEvents.loaded(event => {
  reloadModPoolsConfig()
})