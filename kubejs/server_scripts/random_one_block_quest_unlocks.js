// priority: 2
// Randon One Block — FTB Quest completion hooks for mod pool unlocks
// KubeJS loads higher priority first — mod_pools.js (3) must load before this file.
//
// FTBQuestsEvents.completed fires on TASK completion (task hex id), not quest id.
// Register one handler per task for each quest in quest_unlock_map; unlock when the quest is complete.

var RANDOM_ONE_BLOCK_QUEST_HANDLER_COUNT = 0

function registerRandomOneBlockQuestUnlocks() {
  var pools = typeof RandonOneBlockPools !== 'undefined' ? RandonOneBlockPools : null
  var map = null
  var questId = null
  var questHex = null
  var taskIds = null
  var count = 0
  var i = 0
  var registered = []

  if (!pools || !pools.unlockModPoolForQuestId) {
    console.warn('[RandomOneBlock] Quest unlock script loaded before mod pools — handlers not registered')
    return
  }

  if (typeof FTBQuestsEvents === 'undefined' || !FTBQuestsEvents.completed) {
    console.warn('[RandomOneBlock] FTBQuestsEvents unavailable — quest auto-unlocks disabled (use poolenable commands)')
    return
  }

  map = pools.getQuestUnlockMap()

  for (questId in map) {
    if (!map.hasOwnProperty(questId)) continue
    questHex = pools.parseFtbQuestIdHex(questId)
    taskIds = pools.discoverQuestTaskHexIds ? pools.discoverQuestTaskHexIds(questHex) : []

    if (!taskIds.length) {
      console.warn(
        '[RandomOneBlock] No FTB task ids for quest ' + questHex + ' — unlock will rely on login backfill only'
      )
      continue
    }

    for (i = 0; i < taskIds.length; i++) {
      ;(function (boundTaskId, boundQuestId) {
        FTBQuestsEvents.completed(boundTaskId, function (event) {
          var player = pools.resolveQuestEventPlayer ? pools.resolveQuestEventPlayer(event) : null
          var server = null

          if (pools.logQuestUnlockTrace) {
            pools.logQuestUnlockTrace('task_event', {
              task: boundTaskId,
              quest: boundQuestId
            })
          }

          if (!player) {
            if (pools.logQuestUnlockTrace) {
              pools.logQuestUnlockTrace('task_event_no_player', {
                task: boundTaskId,
                quest: boundQuestId
              })
            }
            return
          }

          server = pools.resolveQuestEventServer ? pools.resolveQuestEventServer(event, player) : null

          if (pools.tryUnlockQuestForPlayer && pools.tryUnlockQuestForPlayer(player, boundQuestId, true, server, 'task_event')) {
            return
          }

          if (pools.scheduleQuestUnlockAttempts) {
            pools.scheduleQuestUnlockAttempts(player, boundQuestId, server, 'task_event_retry')
          }
        })
      })(taskIds[i], questHex)
      registered.push(taskIds[i] + '->' + questHex)
      count++
    }
  }

  RANDOM_ONE_BLOCK_QUEST_HANDLER_COUNT = count
  console.info('[RandomOneBlock] Registered ' + count + ' FTB task unlock handler(s) for mod pools')
  if (registered.length) {
    console.info('[RandomOneBlock] Quest unlock handlers: ' + registered.join(', '))
  } else {
    console.warn('[RandomOneBlock] No quest task handlers registered — will retry on server load')
  }
}

registerRandomOneBlockQuestUnlocks()

function backfillQuestUnlocksDelayed(player, server, delayTicks) {
  var pools = typeof RandonOneBlockPools !== 'undefined' ? RandonOneBlockPools : null
  var ticks = delayTicks == null ? 40 : Number(delayTicks)

  if (!pools || !pools.backfillQuestUnlocksForPlayer || !player || !server) return

  server.scheduleInTicks(Math.max(1, ticks), function () {
    if (pools.logQuestUnlockTrace) {
      pools.logQuestUnlockTrace('backfill_run', {
        player: pools.getPlayerUuidString ? pools.getPlayerUuidString(player) : 'unknown-player'
      })
    }
    pools.backfillQuestUnlocksForPlayer(player)
  })
}

PlayerEvents.loggedIn(function (event) {
  backfillQuestUnlocksDelayed(event.player, event.server, 40)
})

ServerEvents.loaded(function (event) {
  var pools = typeof RandonOneBlockPools !== 'undefined' ? RandonOneBlockPools : null
  var players = null
  var i = 0

  if (RANDOM_ONE_BLOCK_QUEST_HANDLER_COUNT === 0) {
    registerRandomOneBlockQuestUnlocks()
  }

  if (!pools || !pools.backfillQuestUnlocksForPlayer || !event.server) return

  try {
    players = event.server.players
  } catch (ignored) {}

  if (!players || !players.size) return

  for (i = 0; i < players.size(); i++) {
    backfillQuestUnlocksDelayed(players.get(i), event.server, 60)
  }
})