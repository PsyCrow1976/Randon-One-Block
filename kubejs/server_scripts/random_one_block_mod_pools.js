// priority: 1
// Randon One Block — per-team mod namespace gating for the random block pool

const MOD_POOLS_CONFIG_FILE = 'random_one_block_mod_pools.json'
const MOD_POOLS_UNLOCK_DIR = 'data/random_one_block_unlocks'
const VANILLA_NAMESPACE = 'minecraft'

const DEFAULT_MOD_POOLS_CONFIG = {
  mod_pool_gating_enabled: true,
  unlock_scope: 'team',
  starter_exceptions: {
    enabled: ['elevatorid', 'uncraftingtable'],
    mods_with_minable_blocks: ['minecraft', 'elevatorid', 'uncraftingtable']
  },
  force_disabled_mods: [
    'c',
    'ftbchunks',
    'ftblibrary',
    'ftbquests',
    'ftbteams',
    'ftbxmodcompat',
    'kubejs',
    'neoforge',
    'rhino'
  ],
  mod_display_names: {},
  quest_unlock_map: {}
}

const MOD_POOL_STATE = {
  config: null,
  masterByMod: {},
  modStats: {},
  modNamespaces: [],
  teamUnlockCache: {},
  teamPoolCache: {}
}

function modPoolsCloneConfig(config) {
  return JsonIO.parse(JsonIO.toString(config))
}

function loadModPoolsConfig() {
  var config = JsonIO.read(MOD_POOLS_CONFIG_FILE)

  if (!config) {
    console.warn(
      `[RandomOneBlock] Mod pools config not found, creating default at kubejs/config/${MOD_POOLS_CONFIG_FILE}`
    )
    config = modPoolsCloneConfig(DEFAULT_MOD_POOLS_CONFIG)
    JsonIO.write(MOD_POOLS_CONFIG_FILE, config)
    return config
  }

  return modPoolsCloneConfig(config)
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

function getPlayerUuidString(player) {
  if (!player) return 'unknown-player'

  try {
    return String(player.getUUID())
  } catch (ignored) {}

  try {
    return String(player.uuid)
  } catch (ignored2) {}

  return 'unknown-player'
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

  if (!FTBTeams || !player) return null

  try {
    team = FTBTeams.api().getManager().getTeamForPlayerID(player.getUUID()).orElse(null)
  } catch (ignored) {}

  if (!team) return null

  teamId = readObjectStringField(team, ['Id', 'ShortId', 'Name'])
  if (teamId) return 'ftbteam-' + teamId

  try {
    return 'ftbteam-' + String(team.getId())
  } catch (ignored2) {}

  return null
}

function getUnlockScopeId(player, server) {
  var havenScope = resolveHavenTeamScopeId(player, server)
  if (havenScope) return havenScope

  var ftbScope = resolveFtbTeamScopeId(player)
  if (ftbScope) return ftbScope

  return 'player-' + getPlayerUuidString(player)
}

function teamUnlockFilePath(scopeId) {
  var safe = String(scopeId || 'unknown')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .substring(0, 120)
  return MOD_POOLS_UNLOCK_DIR + '/' + safe + '.json'
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

  var path = teamUnlockFilePath(scopeId)
  var data = JsonIO.read(path)

  if (!data) {
    data = defaultTeamUnlockData(scopeId)
  } else {
    data = modPoolsCloneConfig(data)
    if (!data.enabled_mods) data.enabled_mods = []
  }

  MOD_POOL_STATE.teamUnlockCache[scopeId] = data
  return data
}

function saveTeamUnlocks(scopeId, data) {
  if (!scopeId || !data) return

  data.scope_id = scopeId
  data.updated_at = new Date().toISOString()
  MOD_POOL_STATE.teamUnlockCache[scopeId] = data
  invalidateTeamPoolCache(scopeId)
  JsonIO.write(teamUnlockFilePath(scopeId), data)
}

function invalidateTeamPoolCache(scopeId) {
  if (!scopeId) return
  delete MOD_POOL_STATE.teamPoolCache[scopeId]
}

function invalidateAllTeamPoolCaches() {
  MOD_POOL_STATE.teamPoolCache = {}
}

function getForceDisabledMods() {
  return ensureModPoolsConfig().force_disabled_mods || []
}

function getStarterExceptionsRaw() {
  return ensureModPoolsConfig().starter_exceptions
}

function getStarterExceptions() {
  var raw = getStarterExceptionsRaw()
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (raw.enabled && Array.isArray(raw.enabled)) return raw.enabled
  return []
}

function getModsWithMinableBlocks() {
  var raw = getStarterExceptionsRaw()
  if (!raw || Array.isArray(raw)) return []
  if (raw.mods_with_minable_blocks && Array.isArray(raw.mods_with_minable_blocks)) {
    return raw.mods_with_minable_blocks
  }
  return []
}

function isForceDisabledMod(namespace) {
  return modPoolsListIncludes(getForceDisabledMods(), namespace)
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

  for (i = 0; i < pool.length; i++) {
    entry = pool[i]
    roll -= Number(entry.weight)
    if (roll < 0) {
      MOD_POOL_STATE._lastNamespace = entry.namespace
      return entry.id
    }
  }

  entry = pool[pool.length - 1]
  MOD_POOL_STATE._lastNamespace = entry.namespace
  return entry.id
}

function pickRandomBlockIdForPlayer(player, server, fallbackId) {
  if (!isModPoolGatingEnabled()) {
    if (typeof pickRandomBlockId === 'function') return pickRandomBlockId()
    return fallbackId || 'minecraft:dirt'
  }

  var scopeId = getUnlockScopeId(player, server)
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

function enableModForTeam(player, modNamespace, announce) {
  var scopeId = getUnlockScopeId(player, player && player.server ? player.server : null)
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

function disableModForTeam(player, modNamespace, announce) {
  var scopeId = getUnlockScopeId(player, player && player.server ? player.server : null)
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
}

function getLastModPoolPickMeta() {
  return {
    scopeId: MOD_POOL_STATE._lastScopeId || '',
    namespace: MOD_POOL_STATE._lastNamespace || '',
    poolSize: MOD_POOL_STATE._lastPoolSize || 0,
    totalWeight: MOD_POOL_STATE._lastTotalWeight || 0,
    roll: MOD_POOL_STATE._lastRoll
  }
}

function getEffectivePoolSummaryForPlayer(player, server) {
  var scopeId = getUnlockScopeId(player, server)
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

function isQuestCompletedForPlayer(player, questId) {
  var FTBQuestsAPI = Java.tryLoadClass('dev.ftb.mods.ftbquests.api.FTBQuestsAPI')
  var questFile = null
  var data = null
  var quest = null

  if (!FTBQuestsAPI || !player || !questId) return false

  try {
    questFile = FTBQuestsAPI.api().getQuestFile(false)
    if (!questFile) return false
    data = questFile.getOrCreateTeamData(player.getUUID())
    if (!data) return false
    quest = questFile.get(questId)
    if (!quest) return false
    return data.isCompleted(quest)
  } catch (ignored) {}

  return false
}

function backfillQuestUnlocksForPlayer(player) {
  var config = ensureModPoolsConfig()
  var map = config.quest_unlock_map || {}
  var questId = null
  var mod = null

  for (questId in map) {
    if (!map.hasOwnProperty(questId)) continue
    mod = map[questId]
    if (!isQuestCompletedForPlayer(player, questId)) continue
    enableModForTeam(player, mod, false)
  }
}

// Shared KubeJS server scope — do not assign to `global` (unmodifiable on reload).
var RandonOneBlockPools = {
  ensureModPoolsConfig: ensureModPoolsConfig,
  reloadModPoolsConfig: reloadModPoolsConfig,
  isModPoolGatingEnabled: isModPoolGatingEnabled,
  updateMasterCatalogFromPool: updateMasterCatalogFromPool,
  getUnlockScopeId: getUnlockScopeId,
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
  getModsWithMinableBlocks: getModsWithMinableBlocks
}