// priority: 1
// Randon One Block — Randon Atlas: unique center-block rolls + endgame set progress
// Loads after mod pools (3). Called from break handler after pick.

const ATLAS_CONFIG_FILE = 'random_one_block_atlas.json'
const ATLAS_QUESTS_FILE = 'random_one_block_atlas_quests.json'
const TEAM_ATLAS_FILE = 'random_one_block_team_atlas.json'
const ATLAS_WRITE_EVERY_NEW = 25
const ATLAS_WRITE_EVERY_BREAKS = 100
const ATLAS_MISSING_DEFAULT_LIMIT = 12

const DEFAULT_ATLAS_CONFIG = {
  endgame_set_id: 'randon_atlas_v1',
  require_mod_unlocked: true,
  seal: {
    enabled: true,
    item_id: 'kubejs:atlas_seal',
    announce: true
  },
  entries: []
}

const ATLAS_STATE = {
  config: null,
  questMap: null,
  allTeamAtlas: null,
  teamCache: {},
  dirtyScopes: {},
  breaksSinceWrite: {}
}

function atlasClone(obj) {
  return JsonIO.parse(JsonIO.toString(obj == null ? {} : obj))
}

function atlasRead(filename) {
  if (typeof RandonOneBlockConfigIO !== 'undefined' && RandonOneBlockConfigIO.read) {
    return RandonOneBlockConfigIO.read(filename)
  }
  return null
}

function atlasWrite(filename, payload) {
  if (typeof RandonOneBlockConfigIO !== 'undefined' && RandonOneBlockConfigIO.write) {
    return RandonOneBlockConfigIO.write(filename, payload)
  }
  return false
}

function atlasReadField(obj, key) {
  if (!obj) return null
  try {
    if (obj[key] != null && obj[key] !== undefined) return obj[key]
  } catch (ignored) {}
  try {
    if (obj.get && typeof obj.get === 'function') return obj.get(key)
  } catch (ignored2) {}
  return null
}

function atlasToArray(value) {
  var out = []
  var i = 0
  var size = 0

  if (value == null || value === undefined) return out

  if (Array.isArray(value)) {
    for (i = 0; i < value.length; i++) {
      if (value[i] != null) out.push(value[i])
    }
    return out
  }

  try {
    if (typeof value.size === 'function' && typeof value.get === 'function') {
      size = value.size()
      for (i = 0; i < size; i++) {
        if (value.get(i) != null) out.push(value.get(i))
      }
    }
  } catch (ignored) {}

  return out
}

function atlasNormalizeEntry(raw) {
  var id = null
  var group = null
  var requiresMod = null

  if (!raw) return null
  id = atlasReadField(raw, 'id')
  if (id == null) return null
  id = String(id).trim()
  if (!id || id.indexOf(':') < 0) return null

  group = atlasReadField(raw, 'group')
  requiresMod = atlasReadField(raw, 'requires_mod')

  return {
    id: id,
    group: group != null ? String(group) : '',
    requires_mod: requiresMod != null && String(requiresMod).trim() ? String(requiresMod).trim().toLowerCase() : null
  }
}

function sanitizeAtlasConfig(raw) {
  var next = raw ? atlasClone(raw) : atlasClone(DEFAULT_ATLAS_CONFIG)
  var list = atlasToArray(atlasReadField(next, 'entries'))
  var entries = []
  var i = 0
  var entry = null
  var seal = atlasReadField(next, 'seal') || {}
  var pf = atlasReadField(next, 'player_facing') || {}

  next.endgame_set_id =
    atlasReadField(next, 'endgame_set_id') != null
      ? String(atlasReadField(next, 'endgame_set_id'))
      : 'randon_atlas_v1'
  next.require_mod_unlocked = atlasReadField(next, 'require_mod_unlocked') !== false

  for (i = 0; i < list.length; i++) {
    entry = atlasNormalizeEntry(list[i])
    if (entry) entries.push(entry)
  }
  next.entries = entries

  next.seal = {
    enabled: atlasReadField(seal, 'enabled') !== false,
    item_id:
      atlasReadField(seal, 'item_id') != null
        ? String(atlasReadField(seal, 'item_id'))
        : pf && atlasReadField(pf, 'atlas_seal_id')
          ? String(atlasReadField(pf, 'atlas_seal_id'))
          : 'kubejs:atlas_seal',
    announce: atlasReadField(seal, 'announce') !== false
  }

  if (!entries.length) {
    console.warn(
      '[RandomOneBlock] Atlas endgame set has 0 entries — check kubejs/config/' + ATLAS_CONFIG_FILE
    )
  }

  return next
}

function loadAtlasConfig() {
  var config = atlasRead(ATLAS_CONFIG_FILE)

  if (!config) {
    console.warn(
      '[RandomOneBlock] Atlas config not found, creating stub at kubejs/config/' + ATLAS_CONFIG_FILE
    )
    config = atlasClone(DEFAULT_ATLAS_CONFIG)
    atlasWrite(ATLAS_CONFIG_FILE, config)
  }

  return sanitizeAtlasConfig(config)
}

function ensureAtlasConfig() {
  if (!ATLAS_STATE.config) {
    ATLAS_STATE.config = loadAtlasConfig()
  }
  return ATLAS_STATE.config
}

function loadAtlasQuestMap() {
  var raw = atlasRead(ATLAS_QUESTS_FILE)
  var map = {}
  var qbb = null
  var k = null

  if (!raw) {
    ATLAS_STATE.questMap = { quest_by_block: {} }
    return ATLAS_STATE.questMap
  }

  try {
    qbb = atlasReadField(raw, 'quest_by_block') || raw.quest_by_block
    if (qbb) {
      var cloned = atlasClone(qbb)
      for (k in cloned) {
        if (Object.prototype.hasOwnProperty.call(cloned, k) && cloned[k] != null) {
          map[String(k)] = String(cloned[k]).trim().toUpperCase()
        }
      }
    }
  } catch (ignored) {}

  ATLAS_STATE.questMap = {
    chapter_id: atlasReadField(raw, 'chapter_id') != null ? String(atlasReadField(raw, 'chapter_id')) : '',
    intro_quest_id:
      atlasReadField(raw, 'intro_quest_id') != null ? String(atlasReadField(raw, 'intro_quest_id')) : '',
    quest_by_block: map
  }
  return ATLAS_STATE.questMap
}

function ensureAtlasQuestMap() {
  if (!ATLAS_STATE.questMap) loadAtlasQuestMap()
  return ATLAS_STATE.questMap
}

function reloadAtlasConfig() {
  ATLAS_STATE.config = loadAtlasConfig()
  loadAtlasQuestMap()
  console.info(
    '[RandomOneBlock] Atlas config loaded: set=' +
      ATLAS_STATE.config.endgame_set_id +
      ', entries=' +
      (ATLAS_STATE.config.entries || []).length +
      ', ftb_pages=' +
      Object.keys((ATLAS_STATE.questMap && ATLAS_STATE.questMap.quest_by_block) || {}).length
  )
  return ATLAS_STATE.config
}

function getPlayerCommandName(player) {
  if (!player) return null
  try {
    if (player.username != null) return String(player.username)
  } catch (ignored) {}
  try {
    if (player.name && player.name.string) return String(player.name.string)
  } catch (ignored2) {}
  try {
    if (player.getGameProfile) return String(player.getGameProfile().getName())
  } catch (ignored3) {}
  return null
}

function completeFtbQuestForPlayer(player, questId, server) {
  var name = getPlayerCommandName(player)
  var qid = String(questId || '')
    .trim()
    .toUpperCase()
  var cmds = []
  var i = 0

  if (!player || !qid) return
  if (!server || !server.runCommandSilent) {
    try {
      if (player.server && player.server.runCommandSilent) server = player.server
    } catch (ignored) {}
  }
  if (!server || !server.runCommandSilent || !name) return

  cmds = [
    'ftbquests change_progress ' + name + ' complete ' + qid,
    'execute as ' + name + ' run ftbquests change_progress @s complete ' + qid
  ]
  for (i = 0; i < cmds.length; i++) {
    try {
      server.runCommandSilent(cmds[i])
    } catch (ignored2) {}
  }
}

function completeFtbQuestForScope(server, scopeId, questId) {
  var players = null
  var i = 0
  var player = null
  var pools = poolsApi()
  var playerScope = null

  if (!server || !questId) return
  try {
    players = server.players
  } catch (ignored) {}
  if (!players || !players.size) return

  for (i = 0; i < players.size(); i++) {
    player = players.get(i)
    playerScope = null
    try {
      if (pools && pools.resolveUnlockScopeId) {
        playerScope = pools.resolveUnlockScopeId(player, server)
      }
    } catch (ignored2) {}
    if (playerScope === scopeId) {
      completeFtbQuestForPlayer(player, questId, server)
    }
  }
}

function completeAtlasPageQuest(scopeId, blockId, player, server) {
  var map = ensureAtlasQuestMap()
  var qid = null
  var id = String(blockId || '').trim()

  if (!map || !map.quest_by_block) return
  qid = map.quest_by_block[id]
  if (!qid) return

  if (player) {
    completeFtbQuestForPlayer(player, qid, server)
  } else {
    completeFtbQuestForScope(server, scopeId, qid)
  }
}

/** Backfill: complete FTB page quests for blocks already in team atlas */
function syncAtlasQuestsForScope(scopeId, server) {
  var record = loadTeamAtlas(scopeId)
  var map = ensureAtlasQuestMap()
  var id = null
  var n = 0

  if (!record || !record.blocks || !map || !map.quest_by_block) return 0

  for (id in record.blocks) {
    if (!Object.prototype.hasOwnProperty.call(record.blocks, id)) continue
    if (!record.blocks[id]) continue
    if (!map.quest_by_block[id]) continue
    completeFtbQuestForScope(server, scopeId, map.quest_by_block[id])
    n++
  }
  return n
}

function syncAtlasQuestsForPlayer(player, server) {
  var scopeId = resolveScopeForPlayer(player, server)
  if (!scopeId) return 0
  return syncAtlasQuestsForScope(scopeId, server)
}

function loadAllTeamAtlas() {
  if (ATLAS_STATE.allTeamAtlas) return ATLAS_STATE.allTeamAtlas

  var data = atlasRead(TEAM_ATLAS_FILE)
  if (!data) data = {}
  else data = atlasClone(data)

  ATLAS_STATE.allTeamAtlas = data
  return data
}

function defaultTeamAtlas(scopeId) {
  return {
    scope_id: String(scopeId),
    blocks: {},
    unique_count: 0,
    seal_granted: false,
    updated_at: new Date().toISOString()
  }
}

function normalizeTeamAtlas(scopeId, data) {
  var blocks = {}
  var raw = data && data.blocks ? data.blocks : {}
  var k = null
  var count = 0
  var sealGranted = !!(data && (data.seal_granted === true || data.seal_granted === 'true'))

  try {
    for (k in raw) {
      if (!Object.prototype.hasOwnProperty.call(raw, k)) continue
      if (raw[k] === false || raw[k] === 'false') continue
      blocks[String(k)] = true
      count++
    }
  } catch (ignored) {
    try {
      var cloned = atlasClone(raw)
      for (k in cloned) {
        if (!Object.prototype.hasOwnProperty.call(cloned, k)) continue
        if (cloned[k] === false || cloned[k] === 'false') continue
        blocks[String(k)] = true
        count++
      }
    } catch (ignored2) {}
  }

  return {
    scope_id: String(scopeId),
    blocks: blocks,
    unique_count: count,
    seal_granted: sealGranted,
    updated_at: new Date().toISOString()
  }
}

function loadTeamAtlas(scopeId) {
  if (!scopeId) return defaultTeamAtlas('unknown')

  if (ATLAS_STATE.teamCache[scopeId]) {
    return ATLAS_STATE.teamCache[scopeId]
  }

  var all = loadAllTeamAtlas()
  var data = all[scopeId]
  if (!data) data = defaultTeamAtlas(scopeId)
  data = normalizeTeamAtlas(scopeId, data)
  ATLAS_STATE.teamCache[scopeId] = data
  return data
}

function saveTeamAtlas(scopeId, record) {
  if (!scopeId || !record) return

  var all = loadAllTeamAtlas()
  var normalized = normalizeTeamAtlas(scopeId, record)

  all[scopeId] = normalized
  ATLAS_STATE.teamCache[scopeId] = normalized
  ATLAS_STATE.allTeamAtlas = all
  atlasWrite(TEAM_ATLAS_FILE, atlasClone(all))
  delete ATLAS_STATE.dirtyScopes[scopeId]
  ATLAS_STATE.breaksSinceWrite[scopeId] = 0
}

function markAtlasDirty(scopeId) {
  ATLAS_STATE.dirtyScopes[scopeId] = true
  ATLAS_STATE.breaksSinceWrite[scopeId] = (ATLAS_STATE.breaksSinceWrite[scopeId] || 0) + 1
}

function flushAtlasIfNeeded(scopeId, force, newUnique) {
  var breaks = ATLAS_STATE.breaksSinceWrite[scopeId] || 0
  var dirty = !!ATLAS_STATE.dirtyScopes[scopeId]

  if (!dirty && !force) return
  if (
    force ||
    breaks >= ATLAS_WRITE_EVERY_BREAKS ||
    (newUnique && breaks >= 1 && (newUnique % ATLAS_WRITE_EVERY_NEW === 0 || breaks >= ATLAS_WRITE_EVERY_NEW))
  ) {
    saveTeamAtlas(scopeId, loadTeamAtlas(scopeId))
  }
}

function flushAllDirtyAtlas() {
  var scopeId = null
  for (scopeId in ATLAS_STATE.dirtyScopes) {
    if (!Object.prototype.hasOwnProperty.call(ATLAS_STATE.dirtyScopes, scopeId)) continue
    if (ATLAS_STATE.dirtyScopes[scopeId]) {
      saveTeamAtlas(scopeId, loadTeamAtlas(scopeId))
    }
  }
}

function poolsApi() {
  return typeof RandonOneBlockPools !== 'undefined' ? RandonOneBlockPools : null
}

function isModActiveForAtlas(scopeId, mod) {
  var pools = poolsApi()
  var ns = String(mod || '')
    .trim()
    .toLowerCase()

  if (!ns || ns === 'minecraft') return true
  if (!pools) return true

  try {
    if (pools.isNamespaceEffective) return pools.isNamespaceEffective(ns, scopeId)
  } catch (ignored) {}

  try {
    if (pools.isModUnlockedForScope && pools.isModUnlockedForScope(scopeId, ns)) return true
  } catch (ignored2) {}

  // Starter exceptions are not in enabled_mods but are always on
  return false
}

function getActiveEndgameEntries(scopeId) {
  var config = ensureAtlasConfig()
  var entries = config.entries || []
  var requireUnlock = config.require_mod_unlocked !== false
  var active = []
  var i = 0
  var e = null

  for (i = 0; i < entries.length; i++) {
    e = entries[i]
    if (!e || !e.id) continue
    if (requireUnlock && e.requires_mod && !isModActiveForAtlas(scopeId, e.requires_mod)) {
      continue
    }
    active.push(e)
  }

  return active
}

function countOwnedActive(scopeId, activeEntries) {
  var record = loadTeamAtlas(scopeId)
  var owned = 0
  var i = 0
  var id = null

  for (i = 0; i < activeEntries.length; i++) {
    id = activeEntries[i].id
    if (record.blocks && record.blocks[id]) owned++
  }

  return owned
}

function buildAtlasProgress(scopeId) {
  var active = getActiveEndgameEntries(scopeId)
  var record = loadTeamAtlas(scopeId)
  var owned = countOwnedActive(scopeId, active)
  var total = active.length
  var uniqueTotal = record.unique_count || 0
  var pct = total > 0 ? Math.floor((owned * 100) / total) : 0
  var complete = total > 0 && owned >= total

  return {
    scopeId: scopeId,
    setId: ensureAtlasConfig().endgame_set_id,
    owned: owned,
    active: total,
    percent: pct,
    complete: complete,
    uniqueTotal: uniqueTotal,
    sealGranted: !!record.seal_granted,
    missing: null
  }
}

function getMissingEntries(scopeId, modFilter, limit) {
  var active = getActiveEndgameEntries(scopeId)
  var record = loadTeamAtlas(scopeId)
  var missing = []
  var i = 0
  var e = null
  var filter = modFilter
    ? String(modFilter)
        .trim()
        .toLowerCase()
    : null
  var max = limit > 0 ? limit : ATLAS_MISSING_DEFAULT_LIMIT

  for (i = 0; i < active.length; i++) {
    e = active[i]
    if (record.blocks && record.blocks[e.id]) continue
    if (filter) {
      if (e.requires_mod && e.requires_mod !== filter && e.id.indexOf(filter + ':') !== 0) continue
      if (!e.requires_mod && e.id.indexOf(filter + ':') !== 0) continue
    }
    missing.push(e)
    if (missing.length >= max) break
  }

  return missing
}

function grantAtlasSealIfNeeded(scopeId, player, server) {
  var config = ensureAtlasConfig()
  var record = loadTeamAtlas(scopeId)
  var progress = null
  var itemId = null
  var seal = config.seal || {}

  if (seal.enabled === false) return false
  if (record.seal_granted) return false

  progress = buildAtlasProgress(scopeId)
  if (!progress.complete) return false

  record.seal_granted = true
  saveTeamAtlas(scopeId, record)

  itemId = seal.item_id || 'kubejs:atlas_seal'

  if (player) {
    try {
      player.give(Item.of(itemId, 1))
    } catch (ignored) {
      try {
        player.inventory.add(Item.of(itemId, 1))
      } catch (ignored2) {}
    }
    if (seal.announce !== false && player.tell) {
      player.tell(
        Text.of(
          '§d[Randon] Atlas complete! §fYou earned the §eAtlas Seal§f (' +
            progress.owned +
            '/' +
            progress.active +
            ').'
        )
      )
    }
  }

  console.info(
    '[RandomOneBlock] Atlas seal granted for ' + scopeId + ' (' + progress.owned + '/' + progress.active + ')'
  )
  try {
    if (typeof RandonOneBlockMilestones !== 'undefined' && RandonOneBlockMilestones.syncEchoQuests) {
      RandonOneBlockMilestones.syncEchoQuests(scopeId, server)
    }
  } catch (echoEndingErr) {
    console.warn('[RandomOneBlock] Randon Ending sync after Atlas seal failed: ' + String(echoEndingErr))
  }
  return true
}

/**
 * Record a unique center-block roll for the team.
 * @returns {{ isNew: boolean, uniqueTotal: number, progress: object }}
 */
function recordAtlasBlock(scopeId, blockId, player, server) {
  var id = String(blockId || '').trim()
  var record = null
  var isNew = false
  var progress = null

  if (!scopeId || !id || id.indexOf(':') < 0) {
    return { isNew: false, uniqueTotal: 0, progress: null }
  }

  record = loadTeamAtlas(scopeId)
  if (!record.blocks) record.blocks = {}

  if (!record.blocks[id]) {
    record.blocks[id] = true
    record.unique_count = (record.unique_count || 0) + 1
    isNew = true
    markAtlasDirty(scopeId)
    ATLAS_STATE.teamCache[scopeId] = record

    // Debounced write; always flush on seal-relevant progress checks every N new uniques
    flushAtlasIfNeeded(scopeId, false, record.unique_count)

    // First-time discovery of an endgame-set entry: light feedback (rate-limited by isNew only)
    progress = buildAtlasProgress(scopeId)
    if (player && player.tell && isEndgameEntryId(id)) {
      var active = getActiveEndgameEntries(scopeId)
      var inActive = false
      var i = 0
      for (i = 0; i < active.length; i++) {
        if (active[i].id === id) {
          inActive = true
          break
        }
      }
      if (inActive) {
        player.tell(
          Text.of(
            '§d[Atlas] §fNew page: §e' +
              id +
              ' §7(' +
              progress.owned +
              '/' +
              progress.active +
              ' · ' +
              progress.percent +
              '%)'
          )
        )
      }
    }

    // FTB "The Atlas" chapter — complete matching page quest for the team
    if (isEndgameEntryId(id)) {
      try {
        completeAtlasPageQuest(scopeId, id, player, server)
      } catch (ftbErr) {
        console.warn('[RandomOneBlock] Atlas FTB page complete failed: ' + String(ftbErr))
      }
    }

    if (progress && progress.complete) {
      flushAtlasIfNeeded(scopeId, true, record.unique_count)
      grantAtlasSealIfNeeded(scopeId, player, server)
    }
  } else {
    markAtlasDirty(scopeId)
    flushAtlasIfNeeded(scopeId, false, 0)
  }

  progress = progress || buildAtlasProgress(scopeId)
  return {
    isNew: isNew,
    uniqueTotal: record.unique_count || 0,
    progress: progress
  }
}

function isEndgameEntryId(blockId) {
  var entries = ensureAtlasConfig().entries || []
  var i = 0
  var id = String(blockId || '')
  for (i = 0; i < entries.length; i++) {
    if (entries[i] && entries[i].id === id) return true
  }
  return false
}

function resolveScopeForPlayer(player, server) {
  var pools = poolsApi()
  if (player && pools && pools.resolveUnlockScopeId) {
    return pools.resolveUnlockScopeId(player, server)
  }
  if (typeof RandonOneBlockCounters !== 'undefined' && RandonOneBlockCounters.resolveScopeId) {
    return RandonOneBlockCounters.resolveScopeId(player, server)
  }
  return null
}

/**
 * Called after a successful center-block roll (same path as Randon Mined increment).
 */
function onRandomBlockRolled(player, server, blockId) {
  var scopeId = resolveScopeForPlayer(player, server)
  if (!scopeId) return null
  return recordAtlasBlock(scopeId, blockId, player, server)
}

function buildAtlasStatusLines(player, server) {
  var scopeId = resolveScopeForPlayer(player, server)
  var progress = null
  var lines = []

  if (!scopeId) {
    return ['§cCould not resolve team scope.']
  }

  progress = buildAtlasProgress(scopeId)
  lines.push(
    '§eRandon Atlas §7(' +
      progress.setId +
      ') §7scope §f' +
      scopeId
  )
  lines.push(
    '§7Endgame set: §f' +
      progress.owned +
      '§7/§f' +
      progress.active +
      ' §7(§f' +
      progress.percent +
      '%§7) · unique center rolls: §f' +
      progress.uniqueTotal
  )
  if (progress.complete) {
    lines.push(
      progress.sealGranted
        ? '§aAtlas complete — seal already granted.'
        : '§aAtlas complete — seal pending grant.'
    )
  } else {
    lines.push(
      '§7Missing sample: §f/randomblock atlas missing §7[mod] · unlocks expand the active set'
    )
  }
  return lines
}

function buildAtlasMissingLines(player, server, modFilter, limit) {
  var scopeId = resolveScopeForPlayer(player, server)
  var missing = []
  var lines = []
  var i = 0
  var e = null
  var progress = null

  if (!scopeId) {
    return ['§cCould not resolve team scope.']
  }

  progress = buildAtlasProgress(scopeId)
  missing = getMissingEntries(scopeId, modFilter, limit || ATLAS_MISSING_DEFAULT_LIMIT)

  lines.push(
    '§eAtlas missing §7(' +
      progress.owned +
      '/' +
      progress.active +
      ' active' +
      (modFilter ? ', filter §f' + modFilter : '') +
      '§7) — showing up to §f' +
      (limit || ATLAS_MISSING_DEFAULT_LIMIT)
  )

  if (!missing.length) {
    lines.push(
      progress.complete
        ? '§aNo missing active entries — Atlas complete!'
        : '§7No missing entries match (or none active yet). Unlock more mod pools to expand the set.'
    )
    return lines
  }

  for (i = 0; i < missing.length; i++) {
    e = missing[i]
    lines.push(
      '§7- §f' +
        e.id +
        (e.requires_mod ? ' §8[' + e.requires_mod + ']' : '') +
        (e.group ? ' §8(' + e.group + ')' : '')
    )
  }

  return lines
}

function invalidateAtlasCache() {
  ATLAS_STATE.allTeamAtlas = null
  ATLAS_STATE.teamCache = {}
  ATLAS_STATE.dirtyScopes = {}
  ATLAS_STATE.breaksSinceWrite = {}
}

var RandonOneBlockAtlas = {
  ensureAtlasConfig: ensureAtlasConfig,
  reloadAtlasConfig: reloadAtlasConfig,
  loadTeamAtlas: loadTeamAtlas,
  recordAtlasBlock: recordAtlasBlock,
  onRandomBlockRolled: onRandomBlockRolled,
  buildAtlasProgress: buildAtlasProgress,
  buildAtlasStatusLines: buildAtlasStatusLines,
  buildAtlasMissingLines: buildAtlasMissingLines,
  getMissingEntries: getMissingEntries,
  getActiveEndgameEntries: getActiveEndgameEntries,
  grantAtlasSealIfNeeded: grantAtlasSealIfNeeded,
  flushAllDirtyAtlas: flushAllDirtyAtlas,
  invalidateAtlasCache: invalidateAtlasCache,
  syncAtlasQuestsForPlayer: syncAtlasQuestsForPlayer,
  syncAtlasQuestsForScope: syncAtlasQuestsForScope
}

ServerEvents.loaded(function () {
  reloadAtlasConfig()
})

ServerEvents.afterRecipes(function () {
  reloadAtlasConfig()
})

// Flush dirty atlas on player leave
PlayerEvents.loggedOut(function (event) {
  try {
    flushAllDirtyAtlas()
  } catch (ignored) {}
})

// Backfill FTB Atlas page quests for rolls already in team data
PlayerEvents.loggedIn(function (event) {
  event.server.scheduleInTicks(60, function () {
    try {
      syncAtlasQuestsForPlayer(event.player, event.server)
    } catch (ignored) {}
  })
})
