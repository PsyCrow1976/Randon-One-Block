// priority: 2
// Randon One Block — FTB Quest completion hooks for mod pool unlocks
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
        var server = null
        if (!event || !event.player) return
        try {
          server = event.server
        } catch (ignored) {}
        if (!server && event.player.server) server = event.player.server
        pools.enableModForTeam(event.player, boundMod, true, server)
      })
    })(questId, mod)
  }

  console.info('[RandomOneBlock] Registered ' + count + ' FTB quest unlock handler(s) for mod pools')
}

registerRandomOneBlockQuestUnlocks()

PlayerEvents.loggedIn(event => {
  var pools = typeof RandonOneBlockPools !== 'undefined' ? RandonOneBlockPools : null
  if (!pools || !pools.backfillQuestUnlocksForPlayer) return
  pools.backfillQuestUnlocksForPlayer(event.player)
})