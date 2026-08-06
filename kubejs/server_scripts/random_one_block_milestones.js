// priority: 1
// Randon One Block — mine milestones: auto pool unlocks + choice tokens
// Loads after mod pools (3) and quest unlocks (2). Counters (4) call processAfterMine at runtime.

const MILESTONES_CONFIG_FILE = 'random_one_block_milestones.json'

const DEFAULT_MILESTONES_CONFIG = {
  enabled: true,
  milestone_auto_unlocks: [
    {
      threshold: 500,
      mods: ['utility'],
      message: 'BBL Utility blocks can now roll from the center block.'
    },
    {
      threshold: 2500,
      mods: ['easyoregeneration'],
      message: 'Easy Ore Generation blocks join the random pool.'
    }
  ],
  milestone_choices: [
    {
      threshold: 1000,
      token_id: 'choice_1k',
      eligible_mods: ['darkutils', 'apotheosis'],
      mod_packages: {
        apotheosis: ['apotheosis', 'apothic_enchanting']
      },
      description:
        'First crack in the void — pick Dark Utils or Apotheosis (includes Enchanting)'
    },
    {
      threshold: 5000,
      token_id: 'choice_5k',
      eligible_mods: ['darkutils', 'apotheosis'],
      mod_packages: {
        apotheosis: ['apotheosis', 'apothic_enchanting']
      },
      description:
        'The tear widens — unlock the remaining support pool (Dark Utils or Apotheosis)'
    }
  ],
  milestone_messages: [
    {
      threshold: 100,
      message: 'The void notices your island — 100 Randon Mined.'
    }
  ],
  // IDs must match config/ftbquests/quests/chapters/randon_mined.json5 (FTB may regenerate)
  ftb_quest_hooks: {
    100: '70A74D8F9AE4A94A',
    500: '354911A44E0FE192',
    1000: '4F8ACEF07DC37A1F',
    2500: '052F6E722C91858A',
    5000: '461A129540477F54'
  },
  // Custom tasks (not checkmarks) — progress only when team Randon Mined >= threshold
  ftb_mine_count_tasks: {
    '4F0A96F8B052E85E': 100,
    '036077D54B54F1F1': 500,
    '284BB242E685CD86': 1000,
    '6FCA2BE21E690252': 2500,
    '7F7295BF1DFDA590': 5000
  },
  ftb_choice_quest_by_token: {
    choice_1k: {
      darkutils: '3406FF862E0E55FB',
      apotheosis: '32BD86CB337AB9F0'
    },
    choice_5k: {
      darkutils: '5C61885CB786A9FA',
      apotheosis: '39A188E8418C47B7'
    }
  },
  ftb_choice_tasks: {
    '70C16F9FB9166093': 'darkutils',
    '2F21027BA89D32B8': 'apotheosis',
    '16688F671F62C49F': 'darkutils',
    '29C704D46039E1FC': 'apotheosis'
  },
  ftb_choice_task_to_quest: {
    '70C16F9FB9166093': '3406FF862E0E55FB',
    '2F21027BA89D32B8': '32BD86CB337AB9F0',
    '16688F671F62C49F': '5C61885CB786A9FA',
    '29C704D46039E1FC': '39A188E8418C47B7'
  },
  echo: {
    enabled: false,
    threshold: 100000,
    block_id: 'kubejs:echo_block',
    force_on_break: true
  }
}

const MILESTONE_STATE = {
  config: null,
  choiceHandlersRegistered: false,
  choiceInProgress: false
}

function milestonesClone(obj) {
  return JsonIO.parse(JsonIO.toString(obj == null ? {} : obj))
}

function milestonesReadConfig(filename) {
  if (typeof RandonOneBlockConfigIO !== 'undefined' && RandonOneBlockConfigIO.read) {
    return RandonOneBlockConfigIO.read(filename)
  }
  return null
}

function milestonesWriteConfig(filename, payload) {
  if (typeof RandonOneBlockConfigIO !== 'undefined' && RandonOneBlockConfigIO.write) {
    return RandonOneBlockConfigIO.write(filename, payload)
  }
  return false
}

function milestonesReadField(obj, key) {
  if (!obj) return null
  try {
    if (obj[key] != null && obj[key] !== undefined) return obj[key]
  } catch (ignored) {}
  try {
    if (obj.get && typeof obj.get === 'function') return obj.get(key)
  } catch (ignored2) {}
  return null
}

/**
 * Coerce JS arrays or Java Lists (JsonIO) into a plain JS array of elements.
 * Array.isArray is false for KubeJS/Java lists — never rely on it alone.
 */
function milestonesToArray(value) {
  var out = []
  var i = 0
  var size = 0

  if (value == null || value === undefined) return out

  if (Array.isArray(value)) {
    for (i = 0; i < value.length; i++) {
      if (value[i] != null && value[i] !== undefined) out.push(value[i])
    }
    return out
  }

  try {
    if (typeof value.size === 'function' && typeof value.get === 'function') {
      size = value.size()
      for (i = 0; i < size; i++) {
        if (value.get(i) != null) out.push(value.get(i))
      }
      return out
    }
  } catch (ignored) {}

  try {
    if (value.length != null && typeof value !== 'string') {
      for (i = 0; i < value.length; i++) {
        if (value[i] != null && value[i] !== undefined) out.push(value[i])
      }
    }
  } catch (ignored2) {}

  return out
}

function milestonesStringList(value) {
  var out = []
  var i = 0
  var part = null
  var seen = {}
  var list = milestonesToArray(value)

  for (i = 0; i < list.length; i++) {
    if (list[i] == null || list[i] === undefined) continue
    part = String(list[i]).trim().toLowerCase()
    if (!part || seen[part]) continue
    seen[part] = true
    out.push(part)
  }

  return out
}

function milestonesStringMapOfLists(value) {
  var out = {}
  var k = null
  var cloned = null
  var raw = null

  if (!value) return out

  try {
    cloned = milestonesClone(value)
    for (k in cloned) {
      if (!Object.prototype.hasOwnProperty.call(cloned, k)) continue
      out[String(k).toLowerCase()] = milestonesStringList(cloned[k])
    }
  } catch (ignored) {
    try {
      for (k in value) {
        if (!Object.prototype.hasOwnProperty.call(value, k)) continue
        out[String(k).toLowerCase()] = milestonesStringList(value[k])
      }
    } catch (ignored2) {}
  }

  return out
}

function milestonesNormalizeAutoUnlock(entry) {
  if (!entry) return null
  var threshold = Math.floor(Number(milestonesReadField(entry, 'threshold')))
  var mods = milestonesStringList(milestonesReadField(entry, 'mods'))
  var message = milestonesReadField(entry, 'message')
  if (!(threshold > 0)) return null
  return {
    threshold: threshold,
    mods: mods,
    message: message != null ? String(message) : ''
  }
}

function milestonesNormalizeChoice(entry) {
  if (!entry) return null
  var threshold = Math.floor(Number(milestonesReadField(entry, 'threshold')))
  var tokenId = milestonesReadField(entry, 'token_id')
  var eligible = milestonesStringList(milestonesReadField(entry, 'eligible_mods'))
  var packages = milestonesStringMapOfLists(milestonesReadField(entry, 'mod_packages'))
  var description = milestonesReadField(entry, 'description')
  if (!(threshold > 0) || !tokenId) return null
  return {
    threshold: threshold,
    token_id: String(tokenId).trim(),
    eligible_mods: eligible,
    mod_packages: packages,
    description: description != null ? String(description) : ''
  }
}

function milestonesNormalizeMessage(entry) {
  if (!entry) return null
  var threshold = Math.floor(Number(milestonesReadField(entry, 'threshold')))
  var message = milestonesReadField(entry, 'message')
  if (!(threshold > 0) || message == null || !String(message).trim()) return null
  return {
    threshold: threshold,
    message: String(message)
  }
}

function sanitizeMilestonesConfig(raw) {
  var next = raw ? milestonesClone(raw) : milestonesClone(DEFAULT_MILESTONES_CONFIG)
  var autos = []
  var choices = []
  var messages = []
  var list = null
  var i = 0
  var item = null
  var echo = null
  var defaults = null

  next.enabled = next.enabled !== false

  // JsonIO returns Java Lists — Array.isArray is false; use milestonesToArray
  list = milestonesToArray(milestonesReadField(next, 'milestone_auto_unlocks'))
  for (i = 0; i < list.length; i++) {
    item = milestonesNormalizeAutoUnlock(list[i])
    if (item) autos.push(item)
  }
  next.milestone_auto_unlocks = autos

  list = milestonesToArray(milestonesReadField(next, 'milestone_choices'))
  for (i = 0; i < list.length; i++) {
    item = milestonesNormalizeChoice(list[i])
    if (item) choices.push(item)
  }
  next.milestone_choices = choices

  list = milestonesToArray(milestonesReadField(next, 'milestone_messages'))
  for (i = 0; i < list.length; i++) {
    item = milestonesNormalizeMessage(list[i])
    if (item) messages.push(item)
  }
  next.milestone_messages = messages

  // Safety: file present but lists failed to parse → fall back to pack defaults
  if (!autos.length && !choices.length) {
    defaults = DEFAULT_MILESTONES_CONFIG
    list = milestonesToArray(defaults.milestone_auto_unlocks)
    for (i = 0; i < list.length; i++) {
      item = milestonesNormalizeAutoUnlock(list[i])
      if (item) autos.push(item)
    }
    list = milestonesToArray(defaults.milestone_choices)
    for (i = 0; i < list.length; i++) {
      item = milestonesNormalizeChoice(list[i])
      if (item) choices.push(item)
    }
    list = milestonesToArray(defaults.milestone_messages)
    for (i = 0; i < list.length; i++) {
      item = milestonesNormalizeMessage(list[i])
      if (item) messages.push(item)
    }
    next.milestone_auto_unlocks = autos
    next.milestone_choices = choices
    next.milestone_messages = messages
    console.warn(
      '[RandomOneBlock] Milestones config lists empty after parse — using built-in defaults (' +
        autos.length +
        ' auto, ' +
        choices.length +
        ' choice). Check ' +
        MILESTONES_CONFIG_FILE
    )
  }

  echo = milestonesReadField(next, 'echo') || {}
  var echoThreshold = milestonesReadField(echo, 'threshold')
  var echoBlockId = milestonesReadField(echo, 'block_id')
  var echoForce = milestonesReadField(echo, 'force_on_break')
  var echoEnabled = milestonesReadField(echo, 'enabled')
  next.echo = {
    enabled: !!(echoEnabled === true || echoEnabled === 'true'),
    threshold: Math.max(1, Math.floor(Number(echoThreshold != null ? echoThreshold : 100000) || 100000)),
    block_id: echoBlockId != null ? String(echoBlockId) : 'kubejs:echo_block',
    force_on_break: !(echoForce === false || echoForce === 'false')
  }

  // FTB Quests chapter hooks (Randon Mined tab)
  next.ftb_quest_hooks = milestonesStringMap(milestonesReadField(next, 'ftb_quest_hooks'))
  if (!Object.keys(next.ftb_quest_hooks).length) {
    next.ftb_quest_hooks = milestonesStringMap(DEFAULT_MILESTONES_CONFIG.ftb_quest_hooks)
  }
  next.ftb_mine_count_tasks = milestonesThresholdTaskMap(
    milestonesReadField(next, 'ftb_mine_count_tasks')
  )
  if (!Object.keys(next.ftb_mine_count_tasks).length) {
    next.ftb_mine_count_tasks = milestonesThresholdTaskMap(
      DEFAULT_MILESTONES_CONFIG.ftb_mine_count_tasks
    )
  }
  next.ftb_choice_quest_by_token = milestonesNestedStringMap(
    milestonesReadField(next, 'ftb_choice_quest_by_token')
  )
  if (!Object.keys(next.ftb_choice_quest_by_token).length) {
    next.ftb_choice_quest_by_token = milestonesNestedStringMap(
      DEFAULT_MILESTONES_CONFIG.ftb_choice_quest_by_token
    )
  }
  next.ftb_choice_tasks = milestonesStringMap(milestonesReadField(next, 'ftb_choice_tasks'))
  if (!Object.keys(next.ftb_choice_tasks).length) {
    next.ftb_choice_tasks = milestonesStringMap(DEFAULT_MILESTONES_CONFIG.ftb_choice_tasks)
  }
  next.ftb_choice_task_to_quest = milestonesStringMap(
    milestonesReadField(next, 'ftb_choice_task_to_quest')
  )
  if (!Object.keys(next.ftb_choice_task_to_quest).length) {
    next.ftb_choice_task_to_quest = milestonesStringMap(
      DEFAULT_MILESTONES_CONFIG.ftb_choice_task_to_quest
    )
  }

  return next
}

/** taskId -> mine threshold number */
function milestonesThresholdTaskMap(value) {
  var out = {}
  var k = null
  var n = 0
  var raw = milestonesStringMap(value)

  for (k in raw) {
    if (!Object.prototype.hasOwnProperty.call(raw, k)) continue
    n = Math.floor(Number(raw[k]))
    if (n > 0) out[String(k)] = n
  }
  return out
}

/** token_id -> { mod -> questId } */
function milestonesNestedStringMap(value) {
  var out = {}
  var k = null
  var inner = null
  var cloned = null

  if (!value) return out

  try {
    cloned = milestonesClone(value)
    for (k in cloned) {
      if (!Object.prototype.hasOwnProperty.call(cloned, k)) continue
      inner = milestonesStringMap(cloned[k])
      if (Object.keys(inner).length) out[String(k)] = inner
    }
  } catch (ignored) {
    try {
      for (k in value) {
        if (!Object.prototype.hasOwnProperty.call(value, k)) continue
        inner = milestonesStringMap(value[k])
        if (Object.keys(inner).length) out[String(k)] = inner
      }
    } catch (ignored2) {}
  }

  return out
}

function milestonesStringMap(value) {
  var out = {}
  var k = null
  var cloned = null
  var iter = null
  var entry = null

  if (!value) return out

  try {
    cloned = milestonesClone(value)
    for (k in cloned) {
      if (!Object.prototype.hasOwnProperty.call(cloned, k)) continue
      if (cloned[k] == null || cloned[k] === undefined) continue
      out[String(k)] = String(cloned[k]).trim()
    }
    if (Object.keys(out).length) return out
  } catch (ignored) {}

  try {
    for (k in value) {
      if (!Object.prototype.hasOwnProperty.call(value, k)) continue
      if (value[k] == null || value[k] === undefined) continue
      out[String(k)] = String(value[k]).trim()
    }
    if (Object.keys(out).length) return out
  } catch (ignored2) {}

  try {
    if (value.entrySet && typeof value.entrySet === 'function') {
      iter = value.entrySet().iterator()
      while (iter.hasNext()) {
        entry = iter.next()
        out[String(entry.getKey())] = String(entry.getValue()).trim()
      }
    }
  } catch (ignored3) {}

  return out
}

function loadMilestonesConfig() {
  var config = milestonesReadConfig(MILESTONES_CONFIG_FILE)

  if (!config) {
    console.warn(
      '[RandomOneBlock] Milestones config not found, creating default at kubejs/config/' +
        MILESTONES_CONFIG_FILE
    )
    config = milestonesClone(DEFAULT_MILESTONES_CONFIG)
    milestonesWriteConfig(MILESTONES_CONFIG_FILE, config)
  }

  return sanitizeMilestonesConfig(config)
}

function ensureMilestonesConfig() {
  if (!MILESTONE_STATE.config) {
    MILESTONE_STATE.config = loadMilestonesConfig()
  }
  return MILESTONE_STATE.config
}

function reloadMilestonesConfig() {
  MILESTONE_STATE.config = loadMilestonesConfig()
  console.info(
    '[RandomOneBlock] Milestones config loaded: ' +
      (MILESTONE_STATE.config.milestone_auto_unlocks || []).length +
      ' auto, ' +
      (MILESTONE_STATE.config.milestone_choices || []).length +
      ' choice token(s)'
  )
  return MILESTONE_STATE.config
}

function isMilestonesEnabled() {
  return ensureMilestonesConfig().enabled !== false
}

function poolsApi() {
  return typeof RandonOneBlockPools !== 'undefined' ? RandonOneBlockPools : null
}

function countersApi() {
  return typeof RandonOneBlockCounters !== 'undefined' ? RandonOneBlockCounters : null
}

function getModDisplayNameSafe(mod) {
  var pools = poolsApi()
  if (pools && pools.getModDisplayName) return pools.getModDisplayName(mod)
  return String(mod || '')
}

function isModUnlockedForScope(scopeId, mod) {
  var pools = poolsApi()
  if (!pools) return false
  if (pools.isModUnlockedForScope) return pools.isModUnlockedForScope(scopeId, mod)
  return false
}

function enableModsForScope(scopeId, mods) {
  var pools = poolsApi()
  var unlocked = []
  var i = 0
  var result = null

  if (!pools || !pools.enableModForScope) return unlocked

  for (i = 0; i < mods.length; i++) {
    result = pools.enableModForScope(scopeId, mods[i], {})
    if (result && result.ok && !result.already) {
      unlocked.push(result.mod)
    } else if (result && result.ok && result.already) {
      // already unlocked — still count as available
    }
  }

  return unlocked
}

function expandModPackage(choiceEntry, pickMod) {
  var packages = choiceEntry && choiceEntry.mod_packages ? choiceEntry.mod_packages : {}
  var key = String(pickMod || '')
    .trim()
    .toLowerCase()
  var pack = packages[key]

  if (pack && pack.length) return pack.slice()
  return [key]
}

function listIncludes(list, value) {
  var i = 0
  var needle = String(value || '')
    .trim()
    .toLowerCase()
  if (!list || !list.length) return false
  for (i = 0; i < list.length; i++) {
    if (
      String(list[i])
        .trim()
        .toLowerCase() === needle
    )
      return true
  }
  return false
}

function numberListIncludes(list, n) {
  var i = 0
  var target = Math.floor(Number(n))
  if (!list || !list.length) return false
  for (i = 0; i < list.length; i++) {
    if (Math.floor(Number(list[i])) === target) return true
  }
  return false
}

function forEachPlayerInScope(server, scopeId, callback) {
  var players = null
  var i = 0
  var player = null
  var playerScope = null
  var pools = poolsApi()
  var counters = countersApi()

  if (!server || !callback) return

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
      } else if (counters && counters.resolveScopeId) {
        playerScope = counters.resolveScopeId(player, server)
      }
    } catch (ignored2) {}

    if (playerScope === scopeId) {
      callback(player)
    }
  }
}

function notifyScopePlayers(server, scopeId, message) {
  if (!message) return
  forEachPlayerInScope(server, scopeId, function (player) {
    if (player && player.tell) player.tell(Text.of(message))
  })
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
  try {
    if (player.getName) {
      var n = player.getName()
      if (n && n.getString) return String(n.getString())
      return String(n)
    }
  } catch (ignored4) {}
  return null
}

/**
 * Complete an FTB quest for a player (Randon Mined chapter milestones).
 * Uses ftbquests change_progress — best-effort across versions.
 */
function runFtbProgressCommand(player, action, questId, server) {
  var name = getPlayerCommandName(player)
  var qid = String(questId || '')
    .trim()
    .toUpperCase()
  var act = String(action || 'complete')
    .trim()
    .toLowerCase()
  var cmds = []
  var i = 0
  var cmd = null

  if (!player || !qid) return
  if (act !== 'complete' && act !== 'reset') act = 'complete'
  if (!server || !server.runCommandSilent) {
    try {
      if (player.server && player.server.runCommandSilent) server = player.server
    } catch (ignored) {}
  }
  if (!server || !server.runCommandSilent) return
  if (!name) return

  cmds = [
    'ftbquests change_progress ' + name + ' ' + act + ' ' + qid,
    'execute as ' + name + ' run ftbquests change_progress @s ' + act + ' ' + qid
  ]

  for (i = 0; i < cmds.length; i++) {
    cmd = cmds[i]
    try {
      server.runCommandSilent(cmd)
    } catch (ignored2) {}
  }
}

function completeFtbQuestForPlayer(player, questId, server) {
  runFtbProgressCommand(player, 'complete', questId, server)
}

function resetFtbQuestForPlayer(player, questId, server) {
  runFtbProgressCommand(player, 'reset', questId, server)
}

function completeFtbQuestForScope(server, scopeId, questId) {
  forEachPlayerInScope(server, scopeId, function (player) {
    completeFtbQuestForPlayer(player, questId, server)
  })
}

function resetFtbQuestForScope(server, scopeId, questId) {
  forEachPlayerInScope(server, scopeId, function (player) {
    resetFtbQuestForPlayer(player, questId, server)
  })
}

/**
 * After spending a token, complete the chosen claim quest and reset the sibling
 * so only one of the two options stays completed in the quest book.
 */
function applyExclusiveChoiceQuests(scopeId, tokenId, chosenMod, server) {
  var config = ensureMilestonesConfig()
  var byToken = config.ftb_choice_quest_by_token || {}
  var tokenMap = byToken[tokenId] || byToken[String(tokenId).toLowerCase()] || {}
  var mod = null
  var questId = null
  var chosen = String(chosenMod || '')
    .trim()
    .toLowerCase()

  if (!tokenMap || !chosen) return

  for (mod in tokenMap) {
    if (!Object.prototype.hasOwnProperty.call(tokenMap, mod)) continue
    questId = tokenMap[mod]
    if (!questId) continue
    if (
      String(mod)
        .trim()
        .toLowerCase() === chosen
    ) {
      completeFtbQuestForScope(server, scopeId, questId)
    } else {
      resetFtbQuestForScope(server, scopeId, questId)
    }
  }
}

function syncFtbMilestoneQuests(scopeId, blocksMined, server) {
  var config = ensureMilestonesConfig()
  var hooks = config.ftb_quest_hooks || {}
  var byToken = config.ftb_choice_quest_by_token || {}
  var record = loadCounterRecord(scopeId)
  var mined = Math.max(0, Math.floor(Number(blocksMined) || 0))
  var key = null
  var threshold = 0
  var questId = null
  var spent = record.spent_choice_tokens || {}
  var tokenId = null
  var mod = null

  for (key in hooks) {
    if (!Object.prototype.hasOwnProperty.call(hooks, key)) continue
    threshold = Math.floor(Number(key))
    if (!(threshold > 0) || mined < threshold) continue
    questId = hooks[key]
    if (questId) completeFtbQuestForScope(server, scopeId, questId)
  }

  // One claim quest completed, siblings reset (exclusive pick per token)
  for (tokenId in spent) {
    if (!Object.prototype.hasOwnProperty.call(spent, tokenId)) continue
    mod = String(spent[tokenId] || '')
      .trim()
      .toLowerCase()
    if (!mod) continue
    applyExclusiveChoiceQuests(scopeId, tokenId, mod, server)
  }
}

function getEligibleLockedMods(scopeId, choiceEntry) {
  var eligible = (choiceEntry && choiceEntry.eligible_mods) || []
  var out = []
  var i = 0
  var mod = null
  var packageMods = null
  var j = 0
  var anyLocked = false

  for (i = 0; i < eligible.length; i++) {
    mod = eligible[i]
    packageMods = expandModPackage(choiceEntry, mod)
    anyLocked = false
    for (j = 0; j < packageMods.length; j++) {
      if (!isModUnlockedForScope(scopeId, packageMods[j])) {
        anyLocked = true
        break
      }
    }
    if (anyLocked) out.push(mod)
  }

  return out
}

function loadCounterRecord(scopeId) {
  var counters = countersApi()
  if (!counters || !counters.loadTeamCounter) {
    return {
      scope_id: String(scopeId),
      blocks_mined: 0,
      milestones_reached: [],
      unspent_choice_tokens: [],
      spent_choice_tokens: {},
      echo_granted: false
    }
  }
  return counters.loadTeamCounter(scopeId)
}

function saveCounterRecord(scopeId, record) {
  var counters = countersApi()
  if (!counters) return
  if (counters.saveTeamCounterRecord) {
    counters.saveTeamCounterRecord(scopeId, record)
  } else if (counters.saveTeamCounter) {
    counters.saveTeamCounter(scopeId, record)
  }
}

/**
 * Process all thresholds up to `blocksMined` that have not been recorded yet.
 * Safe to call on login (backfill) and after each center-block mine.
 */
function processMilestonesForScope(scopeId, blocksMined, server, announce) {
  var config = ensureMilestonesConfig()
  var record = null
  var shouldAnnounce = announce !== false
  var crossed = []
  var i = 0
  var auto = null
  var choice = null
  var msg = null
  var unlockedMods = []
  var displayParts = []
  var eligibleLeft = []
  var tokenId = null
  var dirty = false
  var mined = Math.max(0, Math.floor(Number(blocksMined) || 0))

  if (!isMilestonesEnabled() || !scopeId) return { crossed: [] }

  record = loadCounterRecord(scopeId)
  if (!record.milestones_reached) record.milestones_reached = []
  if (!record.unspent_choice_tokens) record.unspent_choice_tokens = []
  if (!record.spent_choice_tokens) record.spent_choice_tokens = {}

  // Collect unique thresholds we care about
  var thresholds = {}
  for (i = 0; i < (config.milestone_auto_unlocks || []).length; i++) {
    thresholds[config.milestone_auto_unlocks[i].threshold] = true
  }
  for (i = 0; i < (config.milestone_choices || []).length; i++) {
    thresholds[config.milestone_choices[i].threshold] = true
  }
  for (i = 0; i < (config.milestone_messages || []).length; i++) {
    thresholds[config.milestone_messages[i].threshold] = true
  }

  var sortedThresholds = Object.keys(thresholds)
    .map(function (k) {
      return Math.floor(Number(k))
    })
    .filter(function (n) {
      return n > 0
    })
    .sort(function (a, b) {
      return a - b
    })

  for (i = 0; i < sortedThresholds.length; i++) {
    var t = sortedThresholds[i]
    if (mined < t) continue
    if (numberListIncludes(record.milestones_reached, t)) continue

    record.milestones_reached.push(t)
    record.milestones_reached.sort(function (a, b) {
      return a - b
    })
    dirty = true
    crossed.push(t)

    // Cosmetic / story messages
    for (var mi = 0; mi < (config.milestone_messages || []).length; mi++) {
      msg = config.milestone_messages[mi]
      if (msg.threshold === t && msg.message && shouldAnnounce) {
        notifyScopePlayers(server, scopeId, '§d[Randon] §f' + msg.message)
      }
    }

    // Auto unlocks
    for (var ai = 0; ai < (config.milestone_auto_unlocks || []).length; ai++) {
      auto = config.milestone_auto_unlocks[ai]
      if (auto.threshold !== t) continue
      unlockedMods = enableModsForScope(scopeId, auto.mods || [])
      displayParts = []
      for (var ui = 0; ui < (auto.mods || []).length; ui++) {
        displayParts.push(getModDisplayNameSafe(auto.mods[ui]) + ' (' + auto.mods[ui] + ')')
      }
      console.info(
        '[RandomOneBlock] Milestone ' +
          t +
          ' auto-unlock for ' +
          scopeId +
          ': ' +
          (auto.mods || []).join(',')
      )
      if (shouldAnnounce) {
        if (auto.message) {
          notifyScopePlayers(server, scopeId, '§a[Randon] §f' + auto.message)
        } else if (displayParts.length) {
          notifyScopePlayers(
            server,
            scopeId,
            '§a[Randon] Milestone §f' +
              t +
              '§a — unlocked: §f' +
              displayParts.join('§7, §f')
          )
        }
      }
    }

    // Choice tokens
    for (var ci = 0; ci < (config.milestone_choices || []).length; ci++) {
      choice = config.milestone_choices[ci]
      if (choice.threshold !== t) continue
      tokenId = choice.token_id
      if (!tokenId) continue

      // Already spent or already holding unspent — do not duplicate
      if (record.spent_choice_tokens && record.spent_choice_tokens[tokenId]) {
        continue
      }
      if (listIncludes(record.unspent_choice_tokens, tokenId)) {
        continue
      }

      eligibleLeft = getEligibleLockedMods(scopeId, choice)
      if (!eligibleLeft.length) {
        console.info(
          '[RandomOneBlock] Milestone ' +
            t +
            ' skipped choice token ' +
            tokenId +
            ' for ' +
            scopeId +
            ' — no locked eligible mods'
        )
        if (shouldAnnounce) {
          notifyScopePlayers(
            server,
            scopeId,
            '§d[Randon] Milestone §f' +
              t +
              '§d reached — all choice pools for this tier already unlocked.'
          )
        }
        continue
      }

      record.unspent_choice_tokens.push(tokenId)
      dirty = true
      console.info(
        '[RandomOneBlock] Milestone ' +
          t +
          ' granted choice token ' +
          tokenId +
          ' for ' +
          scopeId +
          ' (eligible: ' +
          eligibleLeft.join(',') +
          ')'
      )
      if (shouldAnnounce) {
        notifyScopePlayers(
          server,
          scopeId,
          '§d[Randon] Milestone §f' + t + '§d — you earned an unlock choice!'
        )
        if (choice.description) {
          notifyScopePlayers(server, scopeId, '§7' + choice.description)
        }
        notifyScopePlayers(
          server,
          scopeId,
          '§7Eligible: §f' +
            eligibleLeft
              .map(function (m) {
                return getModDisplayNameSafe(m) + ' (' + m + ')'
              })
              .join('§7, §f')
        )
        notifyScopePlayers(
          server,
          scopeId,
          '§7Open quest book tab §eRandon Mined§7 and check a claim quest — or §f/randomblock unlock choose <mod>'
        )
      }
    }
  }

  if (dirty) {
    saveCounterRecord(scopeId, record)
  }

  // Always sync FTB "Randon Mined" chapter for current progress (incl. already-reached thresholds)
  try {
    syncFtbMilestoneQuests(scopeId, mined, server)
  } catch (ftbErr) {
    console.warn('[RandomOneBlock] FTB milestone quest sync failed: ' + String(ftbErr))
  }

  return { crossed: crossed, record: record }
}

function processAfterMine(scopeId, blocksMined, player, server) {
  return processMilestonesForScope(scopeId, blocksMined, server, true)
}

function backfillMilestonesForPlayer(player, server) {
  var pools = poolsApi()
  var counters = countersApi()
  var scopeId = null
  var mined = 0

  if (!player) return
  if (pools && pools.resolveUnlockScopeId) {
    scopeId = pools.resolveUnlockScopeId(player, server)
  } else if (counters && counters.resolveScopeId) {
    scopeId = counters.resolveScopeId(player, server)
  }
  if (!scopeId) return

  mined = counters && counters.getTeamBlocksMined ? counters.getTeamBlocksMined(scopeId) : 0
  // Quiet backfill on login (no spam if many thresholds already crossed)
  processMilestonesForScope(scopeId, mined, server, false)
}

function findChoiceByTokenId(tokenId) {
  var config = ensureMilestonesConfig()
  var i = 0
  var id = String(tokenId || '').trim()
  for (i = 0; i < (config.milestone_choices || []).length; i++) {
    if (config.milestone_choices[i].token_id === id) return config.milestone_choices[i]
  }
  return null
}

function findUnspentTokensForMod(scopeId, mod) {
  var record = loadCounterRecord(scopeId)
  var unspent = record.unspent_choice_tokens || []
  var matches = []
  var i = 0
  var choice = null
  var eligible = null
  var needle = String(mod || '')
    .trim()
    .toLowerCase()

  for (i = 0; i < unspent.length; i++) {
    choice = findChoiceByTokenId(unspent[i])
    if (!choice) continue
    eligible = getEligibleLockedMods(scopeId, choice)
    if (listIncludes(eligible, needle) || listIncludes(choice.eligible_mods, needle)) {
      // Prefer still-locked eligible; also allow if package key matches even when listed only
      if (listIncludes(choice.eligible_mods, needle)) {
        matches.push({ token_id: unspent[i], choice: choice, threshold: choice.threshold })
      }
    }
  }

  matches.sort(function (a, b) {
    return a.threshold - b.threshold
  })
  return matches
}

/**
 * Spend one unspent choice token on a mod (or package key).
 * Returns { ok, message, mods }
 */
function chooseUnlock(player, mod, server) {
  var pools = poolsApi()
  var scopeId = null
  var needle = String(mod || '')
    .trim()
    .toLowerCase()
  var matches = []
  var pick = null
  var packageMods = []
  var unlockedNow = []
  var record = null
  var nextUnspent = []
  var i = 0
  var displayParts = []

  if (!player) return { ok: false, message: '§cPlayer required.' }
  if (!needle) return { ok: false, message: '§cUsage: §f/randomblock unlock choose <mod>' }
  if (!isMilestonesEnabled()) return { ok: false, message: '§cMilestones are disabled.' }

  if (pools && pools.resolveUnlockScopeId) {
    scopeId = pools.resolveUnlockScopeId(player, server)
  }
  if (!scopeId) return { ok: false, message: '§cCould not resolve team scope.' }

  matches = findUnspentTokensForMod(scopeId, needle)
  if (!matches.length) {
    return {
      ok: false,
      message:
        '§cNo unspent choice token allows §f' +
        needle +
        '§c (or it is already unlocked). Use §f/randomblock unlock list'
    }
  }

  pick = matches[0]
  packageMods = expandModPackage(pick.choice, needle)

  // Ensure the pick key itself is still an eligible locked option
  if (!listIncludes(getEligibleLockedMods(scopeId, pick.choice), needle)) {
    // If package fully unlocked already
    if (packageMods.every(function (m) {
      return isModUnlockedForScope(scopeId, m)
    })) {
      return {
        ok: false,
        message: '§cThat pool is already unlocked. Pick another: §f/randomblock unlock list'
      }
    }
  }

  unlockedNow = enableModsForScope(scopeId, packageMods)
  record = loadCounterRecord(scopeId)

  // Remove token from unspent, mark spent
  nextUnspent = []
  for (i = 0; i < (record.unspent_choice_tokens || []).length; i++) {
    if (record.unspent_choice_tokens[i] !== pick.token_id) {
      nextUnspent.push(record.unspent_choice_tokens[i])
    }
  }
  record.unspent_choice_tokens = nextUnspent
  if (!record.spent_choice_tokens) record.spent_choice_tokens = {}
  record.spent_choice_tokens[pick.token_id] = needle
  saveCounterRecord(scopeId, record)

  for (i = 0; i < packageMods.length; i++) {
    displayParts.push(getModDisplayNameSafe(packageMods[i]) + ' (' + packageMods[i] + ')')
  }

  console.info(
    '[RandomOneBlock] Choice token ' +
      pick.token_id +
      ' spent by scope ' +
      scopeId +
      ' on ' +
      packageMods.join(',')
  )

  notifyScopePlayers(
    server,
    scopeId,
    '§a[Randon] Unlock choice spent (§f' +
      pick.token_id +
      '§a): §f' +
      displayParts.join('§7, §f')
  )

  // Complete chosen claim quest; reset sibling so only one check stays
  try {
    MILESTONE_STATE.choiceInProgress = true
    applyExclusiveChoiceQuests(scopeId, pick.token_id, needle, server)
    syncFtbMilestoneQuests(scopeId, record.blocks_mined, server)
  } catch (ignoredSync) {
  } finally {
    MILESTONE_STATE.choiceInProgress = false
  }

  return {
    ok: true,
    message:
      '§aUnlocked: §f' +
      displayParts.join('§7, §f') +
      ' §7(token §f' +
      pick.token_id +
      '§7). §eOnly one choice per milestone — the other claim was locked.',
    mods: packageMods,
    token_id: pick.token_id
  }
}

function getTeamMinedForPlayer(player, server) {
  var pools = poolsApi()
  var counters = countersApi()
  var scopeId = null

  if (!player) return 0
  try {
    if (pools && pools.resolveUnlockScopeId) {
      scopeId = pools.resolveUnlockScopeId(player, server || player.server)
    } else if (counters && counters.resolveScopeId) {
      scopeId = counters.resolveScopeId(player, server || player.server)
    }
  } catch (ignored) {}
  if (!scopeId || !counters || !counters.getTeamBlocksMined) return 0
  return counters.getTeamBlocksMined(scopeId)
}

/**
 * Custom FTB tasks for mine thresholds — players cannot check them off.
 * Progress completes when team Randon Mined >= threshold.
 */
function registerFtbMineCountCustomTasks() {
  var config = ensureMilestonesConfig()
  var tasks = config.ftb_mine_count_tasks || {}
  var taskId = null
  var threshold = 0
  var count = 0

  if (typeof FTBQuestsEvents === 'undefined' || !FTBQuestsEvents.customTask) {
    console.warn(
      '[RandomOneBlock] FTBQuestsEvents.customTask unavailable — mine-count quests use change_progress only'
    )
    return 0
  }

  for (taskId in tasks) {
    if (!Object.prototype.hasOwnProperty.call(tasks, taskId)) continue
    threshold = Math.floor(Number(tasks[taskId]))
    if (!(threshold > 0)) continue
    ;(function (tid, needMined) {
      FTBQuestsEvents.customTask(tid, function (event) {
        try {
          event.maxProgress = 1
        } catch (ignored) {}
        try {
          if (event.setCheckTimer) event.setCheckTimer(20)
          else event.checkTimer = 20
        } catch (ignored2) {}

        var checker = function (task, player) {
          var mined = 0
          if (!player || !task) return
          mined = getTeamMinedForPlayer(player, null)
          if (mined >= needMined) {
            try {
              task.progress = 1
            } catch (ignored3) {
              try {
                if (task.setProgress) task.setProgress(1)
              } catch (ignored4) {}
            }
          }
        }

        try {
          if (event.setCheck) event.setCheck(checker)
          else event.check = checker
        } catch (ignored5) {
          event.check = checker
        }
      })
    })(String(taskId), threshold)
    count++
  }

  console.info(
    '[RandomOneBlock] Registered ' + count + ' FTB Randon Mined mine-count custom task(s)'
  )
  return count
}

function registerFtbChoiceTaskHandlers() {
  var config = ensureMilestonesConfig()
  var tasks = config.ftb_choice_tasks || {}
  var taskToQuest = config.ftb_choice_task_to_quest || {}
  var taskId = null
  var mod = null
  var count = 0

  if (typeof FTBQuestsEvents === 'undefined' || !FTBQuestsEvents.completed) {
    console.warn(
      '[RandomOneBlock] FTBQuestsEvents unavailable — Randon Mined book choices will not auto-unlock pools'
    )
    return 0
  }

  for (taskId in tasks) {
    if (!Object.prototype.hasOwnProperty.call(tasks, taskId)) continue
    mod = String(tasks[taskId] || '')
      .trim()
      .toLowerCase()
    if (!mod) continue
    ;(function (tid, modNamespace, claimQuestId) {
      FTBQuestsEvents.completed(tid, function (event) {
        var player = null
        var server = null
        var result = null
        var pools = poolsApi()
        var scopeId = null

        if (MILESTONE_STATE.choiceInProgress) return

        try {
          if (typeof RandonOneBlockPools !== 'undefined' && RandonOneBlockPools.resolveQuestEventPlayer) {
            player = RandonOneBlockPools.resolveQuestEventPlayer(event)
          }
        } catch (ignored) {}
        if (!player) {
          try {
            player = event.player
          } catch (ignored2) {}
        }
        try {
          if (typeof RandonOneBlockPools !== 'undefined' && RandonOneBlockPools.resolveQuestEventServer) {
            server = RandonOneBlockPools.resolveQuestEventServer(event)
          }
        } catch (ignored3) {}
        if (!server && player) {
          try {
            server = player.server
          } catch (ignored4) {}
        }

        if (!player) return

        MILESTONE_STATE.choiceInProgress = true
        try {
          result = chooseUnlock(player, modNamespace, server)
          if (result && result.message && player.tell) {
            player.tell(Text.of(result.message))
          }
          if (result && !result.ok) {
            // Undo the checkmark — no token left / invalid pick
            if (claimQuestId) {
              resetFtbQuestForPlayer(player, claimQuestId, server)
            }
            console.info(
              '[RandomOneBlock] FTB choice task ' +
                tid +
                ' -> ' +
                modNamespace +
                ' failed (quest reset): ' +
                result.message
            )
          } else if (result && result.ok) {
            // chooseUnlock already applied exclusive complete/reset for the team
            try {
              if (pools && pools.resolveUnlockScopeId) {
                scopeId = pools.resolveUnlockScopeId(player, server)
              }
            } catch (ignored5) {}
            if (scopeId && result.token_id) {
              applyExclusiveChoiceQuests(scopeId, result.token_id, modNamespace, server)
            }
          }
        } catch (err) {
          console.warn('[RandomOneBlock] FTB choice task handler error: ' + String(err))
          if (claimQuestId) {
            try {
              resetFtbQuestForPlayer(player, claimQuestId, server)
            } catch (ignored6) {}
          }
        } finally {
          MILESTONE_STATE.choiceInProgress = false
        }
      })
    })(String(taskId), mod, taskToQuest[taskId] || taskToQuest[String(taskId).toUpperCase()] || null)
    count++
  }

  console.info('[RandomOneBlock] Registered ' + count + ' FTB Randon Mined choice task handler(s)')
  return count
}

function buildMilestonesStatus(player, server) {
  var config = ensureMilestonesConfig()
  var pools = poolsApi()
  var counters = countersApi()
  var scopeId = null
  var record = null
  var mined = 0
  var lines = []
  var i = 0
  var choice = null
  var auto = null
  var eligible = []
  var unspent = []
  var spent = {}
  var reached = []

  if (pools && pools.resolveUnlockScopeId) {
    scopeId = pools.resolveUnlockScopeId(player, server)
  }
  record = loadCounterRecord(scopeId)
  mined = record.blocks_mined || 0
  unspent = record.unspent_choice_tokens || []
  spent = record.spent_choice_tokens || {}
  reached = record.milestones_reached || []

  lines.push('§eRandon milestones §7(scope §f' + scopeId + '§7) — mined §f' + mined)
  lines.push(
    '§7Reached: §f' +
      (reached.length
        ? reached
            .map(function (n) {
              return Number(n)
            })
            .join('§7, §f')
        : 'none')
  )

  for (i = 0; i < (config.milestone_auto_unlocks || []).length; i++) {
    auto = config.milestone_auto_unlocks[i]
    lines.push(
      '§7Auto §f' +
        auto.threshold +
        '§7: §f' +
        (auto.mods || []).join(', ') +
        (numberListIncludes(reached, auto.threshold) ? ' §a(done)' : ' §e(pending)')
    )
  }

  for (i = 0; i < (config.milestone_choices || []).length; i++) {
    choice = config.milestone_choices[i]
    eligible = getEligibleLockedMods(scopeId, choice)
    if (spent[choice.token_id]) {
      lines.push(
        '§7Choice §f' +
          choice.threshold +
          ' §7(' +
          choice.token_id +
          '): §aspent on §f' +
          spent[choice.token_id]
      )
    } else if (listIncludes(unspent, choice.token_id)) {
      lines.push(
        '§7Choice §f' +
          choice.threshold +
          ' §7(' +
          choice.token_id +
          '): §eUNSPENT §7— eligible: §f' +
          (eligible.length ? eligible.join(', ') : 'none left')
      )
    } else if (mined >= choice.threshold) {
      lines.push(
        '§7Choice §f' +
          choice.threshold +
          ' §7(' +
          choice.token_id +
          '): §7reached (token pending backfill)'
      )
    } else {
      lines.push(
        '§7Choice §f' +
          choice.threshold +
          ' §7(' +
          choice.token_id +
          '): §8locked §7(' +
          (choice.threshold - mined) +
          ' left)'
      )
    }
  }

  if (unspent.length) {
    lines.push('§dUnspent tokens: §f' + unspent.join(', '))
  } else {
    lines.push('§7Unspent tokens: none')
  }

  return { scopeId: scopeId, mined: mined, lines: lines, record: record }
}

function buildUnlockListStatus(player, server) {
  var config = ensureMilestonesConfig()
  var pools = poolsApi()
  var scopeId = null
  var record = null
  var lines = []
  var i = 0
  var j = 0
  var choice = null
  var auto = null
  var eligible = []
  var mod = null
  var packageMods = []
  var unlocked = false
  var seen = {}

  if (pools && pools.resolveUnlockScopeId) {
    scopeId = pools.resolveUnlockScopeId(player, server)
  }
  record = loadCounterRecord(scopeId)

  lines.push('§eMilestone unlock options §7(scope §f' + scopeId + '§7)')

  // Auto mods
  for (i = 0; i < (config.milestone_auto_unlocks || []).length; i++) {
    auto = config.milestone_auto_unlocks[i]
    for (j = 0; j < (auto.mods || []).length; j++) {
      mod = auto.mods[j]
      if (seen[mod]) continue
      seen[mod] = true
      unlocked = isModUnlockedForScope(scopeId, mod)
      lines.push(
        (unlocked ? '§aON  ' : '§cOFF ') +
          '§f' +
          getModDisplayNameSafe(mod) +
          ' §7(' +
          mod +
          ') §8auto @ ' +
          auto.threshold
      )
    }
  }

  // Choice mods
  for (i = 0; i < (config.milestone_choices || []).length; i++) {
    choice = config.milestone_choices[i]
    for (j = 0; j < (choice.eligible_mods || []).length; j++) {
      mod = choice.eligible_mods[j]
      if (seen[mod]) continue
      seen[mod] = true
      packageMods = expandModPackage(choice, mod)
      unlocked = packageMods.every(function (m) {
        return isModUnlockedForScope(scopeId, m)
      })
      lines.push(
        (unlocked ? '§aON  ' : '§cOFF ') +
          '§f' +
          getModDisplayNameSafe(mod) +
          ' §7(' +
          mod +
          ')' +
          (packageMods.length > 1
            ? ' §8→ ' + packageMods.join('+')
            : '') +
          ' §8choice'
      )
    }
  }

  eligible = []
  for (i = 0; i < (record.unspent_choice_tokens || []).length; i++) {
    choice = findChoiceByTokenId(record.unspent_choice_tokens[i])
    if (!choice) continue
    var left = getEligibleLockedMods(scopeId, choice)
    for (j = 0; j < left.length; j++) {
      if (!listIncludes(eligible, left[j])) eligible.push(left[j])
    }
  }

  if (eligible.length) {
    lines.push(
      '§dYou can choose now: §f' +
        eligible.join(', ') +
        ' §7→ §f/randomblock unlock choose <mod>'
    )
  } else if ((record.unspent_choice_tokens || []).length) {
    lines.push('§7You have unspent tokens but no locked eligible mods remain.')
  } else {
    lines.push('§7No unspent choice tokens. Keep mining for milestones.')
  }

  return { scopeId: scopeId, lines: lines }
}

var RandonOneBlockMilestones = {
  ensureMilestonesConfig: ensureMilestonesConfig,
  reloadMilestonesConfig: reloadMilestonesConfig,
  isMilestonesEnabled: isMilestonesEnabled,
  processAfterMine: processAfterMine,
  processMilestonesForScope: processMilestonesForScope,
  backfillMilestonesForPlayer: backfillMilestonesForPlayer,
  chooseUnlock: chooseUnlock,
  buildMilestonesStatus: buildMilestonesStatus,
  buildUnlockListStatus: buildUnlockListStatus,
  getEligibleLockedMods: getEligibleLockedMods,
  syncFtbMilestoneQuests: syncFtbMilestoneQuests
}

// Register FTB handlers at script load (FTB requires this timing — not after /reload only)
try {
  ensureMilestonesConfig()
  registerFtbMineCountCustomTasks()
  registerFtbChoiceTaskHandlers()
  MILESTONE_STATE.choiceHandlersRegistered = true
} catch (regErr) {
  console.warn('[RandomOneBlock] FTB Randon Mined handler registration failed: ' + String(regErr))
}

PlayerEvents.loggedIn(function (event) {
  event.server.scheduleInTicks(40, function () {
    try {
      backfillMilestonesForPlayer(event.player, event.server)
    } catch (ignored) {}
  })
})

ServerEvents.loaded(function () {
  reloadMilestonesConfig()
})

ServerEvents.afterRecipes(function () {
  reloadMilestonesConfig()
})
