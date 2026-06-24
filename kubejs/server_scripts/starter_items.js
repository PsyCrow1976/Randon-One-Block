// priority: 1
// Starter inventory — FTB Quest book in hotbar slot 0

const STARTER_BOOK_KEY = 'random_one_block_starter_book'
const QUEST_BOOK = 'ftbquests:book'

function slotStackId(stack) {
  if (!stack || stack.isEmpty()) return ''

  try {
    if (stack.id) return String(stack.id)
  } catch (ignored) {}

  try {
    if (stack.getItem && stack.getItem().getDescriptionId) {
      return String(stack.getItem().getDescriptionId())
    }
  } catch (ignored2) {}

  return ''
}

function readPersistentBoolean(player, key) {
  if (!player || !player.persistentData) return false

  try {
    var raw = player.persistentData.getBoolean(key)
    if (raw === true) return true
    if (raw === false) return false

    try {
      if (raw != null && raw.isPresent) return raw.isPresent() ? !!raw.get() : false
    } catch (ignored) {}
  } catch (ignored2) {}

  return false
}

function giveStarterQuestBook(player) {
  if (!player) return false

  var current = null

  try {
    current = player.inventory.getStackInSlot(0)
    if (!current.isEmpty() && slotStackId(current) === QUEST_BOOK) {
      return true
    }

    player.inventory.setStackInSlot(0, Item.of(QUEST_BOOK, 1))
    player.persistentData.putBoolean(STARTER_BOOK_KEY, true)
    console.info('[StarterItems] Placed FTB Quest book in hotbar slot 0')
    return true
  } catch (e) {
    const err = e && e.javaException ? String(e.javaException) : String(e)
    console.error(`[StarterItems] Failed to give quest book: ${err}`)
    return false
  }
}

PlayerEvents.loggedIn(event => {
  if (readPersistentBoolean(event.player, STARTER_BOOK_KEY)) {
    return
  }

  event.server.scheduleInTicks(40, () => {
    giveStarterQuestBook(event.player)
  })
})