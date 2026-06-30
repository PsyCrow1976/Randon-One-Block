// priority: 0
// Randon One Block — FTB Quest completion hooks for mod pool unlocks

function registerRandomOneBlockQuestUnlocks() {
  var pools = global.RandonOneBlockPools
  var config = null
  var map = null
  var questId = null
  var mod = null

  if (!pools || !pools.ensureModPoolsConfig) {
    console.warn('[RandomOneBlock] Quest unlock script loaded before mod pools — handlers not registered')
    return
  }

  if (typeof FTBQuestsEvents === 'undefined' || !FTBQuestsEvents.completed) {
    console.warn('[RandomOneBlock] FTBQuestsEvents unavailable — quest auto-unlocks disabled (use poolenable commands)')
    return
  }

  config = pools.ensureModPoolsConfig()
  map = config.quest_unlock_map || {}

  var signature = JSON.stringify(map)
  if (global.RandonOneBlockQuestUnlockSig === signature) return
  global.RandonOneBlockQuestUnlockSig = signature

  for (questId in map) {
    if (!map.hasOwnProperty(questId)) continue
    mod = map[questId]
    ;(function (boundQuestId, boundMod) {
      FTBQuestsEvents.completed(boundQuestId, event => {
        if (!event || !event.player) return
        pools.enableModForTeam(event.player, boundMod, true)
      })
    })(questId, mod)
  }

  console.info(
    `[RandomOneBlock] Registered ${Object.keys(map).length} FTB quest unlock handler(s) for mod pools`
  )
}

PlayerEvents.loggedIn(event => {
  var pools = global.RandonOneBlockPools
  if (!pools || !pools.backfillQuestUnlocksForPlayer) return
  pools.backfillQuestUnlocksForPlayer(event.player)
})

ServerEvents.loaded(() => {
  registerRandomOneBlockQuestUnlocks()
})

ServerEvents.afterRecipes(() => {
  registerRandomOneBlockQuestUnlocks()
})