// priority: 2
// Randon One Block — FTB Quest completion hooks for mod pool unlocks
// KubeJS loads higher priority first — mod_pools.js (3) must load before this file.
// FTBQuestsEvents.completed must register during script load (not ServerEvents).

function registerRandomOneBlockQuestUnlocks() {
  var pools = typeof RandonOneBlockPools !== 'undefined' ? RandonOneBlockPools : null
  var map = null
  var questId = null
  var mod = null
  var count = 0

  if (!pools || !pools.getQuestUnlockMap) {
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
    mod = map[questId]
    count++
    ;(function (boundQuestId, boundMod) {
      FTBQuestsEvents.completed(boundQuestId, event => {
        var player = pools.resolveQuestEventPlayer ? pools.resolveQuestEventPlayer(event) : null
        var server = null

        if (!player) return

        server = pools.resolveQuestEventServer ? pools.resolveQuestEventServer(event, player) : null
        console.info('[RandomOneBlock] Quest completed unlock: ' + boundQuestId + ' -> ' + boundMod)
        pools.enableModForTeam(player, boundMod, true, server)
      })
    })(questId, mod)
  }

  console.info('[RandomOneBlock] Registered ' + count + ' FTB quest unlock handler(s) for mod pools')
}

registerRandomOneBlockQuestUnlocks()

function backfillQuestUnlocksDelayed(player, server, delayTicks) {
  var pools = typeof RandonOneBlockPools !== 'undefined' ? RandonOneBlockPools : null
  var ticks = delayTicks == null ? 40 : Number(delayTicks)

  if (!pools || !pools.backfillQuestUnlocksForPlayer || !player || !server) return

  server.scheduleInTicks(Math.max(1, ticks), function () {
    pools.backfillQuestUnlocksForPlayer(player)
  })
}

PlayerEvents.loggedIn(event => {
  backfillQuestUnlocksDelayed(event.player, event.server, 40)
})

ServerEvents.loaded(() => {
  var pools = typeof RandonOneBlockPools !== 'undefined' ? RandonOneBlockPools : null
  var server = null
  var players = null
  var i = 0

  if (!pools || !pools.backfillQuestUnlocksForPlayer) return

  try {
    server = Utils.getServer()
  } catch (ignored) {}

  if (!server) return

  try {
    players = server.players
  } catch (ignored2) {}

  if (!players || !players.size) return

  for (i = 0; i < players.size(); i++) {
    backfillQuestUnlocksDelayed(players.get(i), server, 60)
  }
})