// Lobby plate for the custom Haven spawn island.
// Haven pastes spawn_island.nbt once, corner at (-3, 68, -3). The stone plate sits on
// the impulse command block at local (3, 2, 4), which is world (0, 70, 1).
// A command block is not a player, and Haven's create command requires one, so the
// block runs this public command as the nearest player. The command then runs
//   /havensb island create oneblock_island <that player's name>
// A command block cannot expand %username% by itself.

function spawnIslandPlayerName(player) {
  if (!player) return ''
  try {
    if (player.username) return String(player.username)
  } catch (ignored) {}
  try {
    return String(player.getGameProfile().getName())
  } catch (ignored) {}
  try {
    return String(player.getName().getString())
  } catch (ignored) {}
  return ''
}

ServerEvents.basicPublicCommand('randonspawn', event => {
  const player = event.player
  const name = spawnIslandPlayerName(player)
  if (!player || !/^[A-Za-z0-9_]{1,16}$/.test(name)) {
    console.warn('[SpawnIsland] randonspawn ignored: no player name')
    return
  }

  try {
    player.runCommand('havensb island create oneblock_island ' + name)
  } catch (e) {
    const err = e && e.javaException ? String(e.javaException) : String(e)
    console.error('[SpawnIsland] Island create failed for ' + name + ': ' + err)
  }
})
