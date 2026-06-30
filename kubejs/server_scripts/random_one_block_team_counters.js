// priority: 4
// Randon One Block — per-team blocks mined counter (island/team scope, not per-player)

const TEAM_COUNTERS_FILE = 'random_one_block_team_counters.json'
const COUNTER_SYNC_CHANNEL = 'random_one_block_counter'

const COUNTER_STATE = {
  allTeamCounters: null,
  teamCounterCache: {}
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

function cloneCounterData(data) {
  return JsonIO.parse(JsonIO.toString(data == null ? {} : data))
}

function resolveScopeId(player, server) {
  var pools = typeof RandonOneBlockPools !== 'undefined' ? RandonOneBlockPools : null
  if (!pools || !pools.resolveUnlockScopeId || !player) return 'unknown'
  return pools.resolveUnlockScopeId(player, server)
}

function readHudConfigFromMainConfig() {
  var config = null
  var hud = null
  var rawEnabled = null

  if (typeof RandonOneBlockConfigIO !== 'undefined' && RandonOneBlockConfigIO.read) {
    config = RandonOneBlockConfigIO.read('random_one_block.json')
  }

  hud = config && config.randon_counter_hud ? config.randon_counter_hud : {}

  rawEnabled = hud.enabled
  if (rawEnabled === false) {
    return { enabled: false }
  }

  if (rawEnabled == null) {
    return { enabled: true }
  }

  return {
    enabled: String(rawEnabled).toLowerCase() !== 'false'
  }
}

function loadAllTeamCounters() {
  if (COUNTER_STATE.allTeamCounters) return COUNTER_STATE.allTeamCounters

  var data = readKubejsConfigJson(TEAM_COUNTERS_FILE)
  if (!data) data = {}
  else data = cloneCounterData(data)

  COUNTER_STATE.allTeamCounters = data
  return data
}

function defaultTeamCounterData(scopeId) {
  return {
    scope_id: String(scopeId),
    blocks_mined: 0,
    updated_at: new Date().toISOString()
  }
}

function normalizeTeamCounterRecord(scopeId, data) {
  var mined = 0

  if (data && data.blocks_mined != null) {
    mined = Math.max(0, Math.floor(Number(data.blocks_mined) || 0))
  }

  return {
    scope_id: String(scopeId),
    blocks_mined: mined,
    updated_at: new Date().toISOString()
  }
}

function loadTeamCounter(scopeId) {
  if (!scopeId) return defaultTeamCounterData('unknown')

  if (COUNTER_STATE.teamCounterCache[scopeId]) {
    return COUNTER_STATE.teamCounterCache[scopeId]
  }

  var all = loadAllTeamCounters()
  var data = all[scopeId]

  if (!data) {
    data = defaultTeamCounterData(scopeId)
  }

  data = normalizeTeamCounterRecord(scopeId, data)
  COUNTER_STATE.teamCounterCache[scopeId] = data
  return data
}

function saveTeamCounter(scopeId, data) {
  if (!scopeId || !data) return

  var all = loadAllTeamCounters()
  var record = normalizeTeamCounterRecord(scopeId, data)

  all[scopeId] = record
  COUNTER_STATE.teamCounterCache[scopeId] = record
  COUNTER_STATE.allTeamCounters = all
  writeKubejsConfigJson(TEAM_COUNTERS_FILE, cloneCounterData(all))
}

function getTeamBlocksMined(scopeId) {
  return loadTeamCounter(scopeId).blocks_mined
}

function incrementTeamCounter(scopeId) {
  var record = loadTeamCounter(scopeId)
  record.blocks_mined = record.blocks_mined + 1
  saveTeamCounter(scopeId, record)
  return record.blocks_mined
}

function invalidateTeamCounterCache() {
  COUNTER_STATE.allTeamCounters = null
  COUNTER_STATE.teamCounterCache = {}
}

function buildCounterSyncPayload(count, hud) {
  return {
    count: Math.max(0, Math.floor(Number(count) || 0)),
    enabled: hud.enabled ? 1 : 0
  }
}

function sendCounterSync(player, count, hud) {
  if (!player || !player.sendData) return

  try {
    player.sendData(COUNTER_SYNC_CHANNEL, buildCounterSyncPayload(count, hud || readHudConfigFromMainConfig()))
  } catch (ignored) {}
}

function syncCounterForPlayer(player, server) {
  if (!player) return

  var scopeId = resolveScopeId(player, server)
  sendCounterSync(player, getTeamBlocksMined(scopeId), readHudConfigFromMainConfig())
}

function syncCounterForScope(server, scopeId) {
  if (!server || !scopeId) return

  var players = null
  var i = 0
  var player = null
  var playerScope = null
  var count = getTeamBlocksMined(scopeId)
  var hud = readHudConfigFromMainConfig()

  try {
    players = server.players
  } catch (ignored) {}

  if (!players || !players.size) return

  for (i = 0; i < players.size(); i++) {
    player = players.get(i)
    playerScope = resolveScopeId(player, server)
    if (playerScope === scopeId) {
      sendCounterSync(player, count, hud)
    }
  }
}

function broadcastHudConfig(server) {
  if (!server) return

  var players = null
  var i = 0

  try {
    players = server.players
  } catch (ignored) {}

  if (!players || !players.size) return

  for (i = 0; i < players.size(); i++) {
    syncCounterForPlayer(players.get(i), server)
  }
}

function onRandomBlockMined(player, server) {
  if (!player) return 0

  var scopeId = resolveScopeId(player, server)
  var count = incrementTeamCounter(scopeId)
  syncCounterForScope(server, scopeId)
  return count
}

var RandonOneBlockCounters = {
  channel: COUNTER_SYNC_CHANNEL,
  getTeamBlocksMined: getTeamBlocksMined,
  incrementTeamCounter: incrementTeamCounter,
  loadTeamCounter: loadTeamCounter,
  invalidateTeamCounterCache: invalidateTeamCounterCache,
  readHudConfigFromMainConfig: readHudConfigFromMainConfig,
  syncCounterForPlayer: syncCounterForPlayer,
  syncCounterForScope: syncCounterForScope,
  broadcastHudConfig: broadcastHudConfig,
  onRandomBlockMined: onRandomBlockMined,
  resolveScopeId: resolveScopeId
}

PlayerEvents.loggedIn(function (event) {
  event.server.scheduleInTicks(20, function () {
    syncCounterForPlayer(event.player, event.server)
  })
})

ServerEvents.loaded(function (event) {
  broadcastHudConfig(event.server)
})