// priority: 0
// Randon One Block — team mine counter HUD (above health hearts)

const COUNTER_SYNC_CHANNEL = 'random_one_block_counter'

const $NeoForge = Java.loadClass('net.neoforged.neoforge.common.NeoForge')
const $EventPriority = Java.loadClass('net.neoforged.bus.api.EventPriority')
const $RenderGuiEventPost = Java.loadClass('net.neoforged.neoforge.client.event.RenderGuiEvent$Post')
const $Minecraft = Java.loadClass('net.minecraft.client.Minecraft')

const HUD_STATE = {
  count: 0,
  enabled: true,
  offsetX: 0,
  offsetY: -12,
  listenerRegistered: false
}

function readIntTag(data, key, fallback) {
  if (!data) return fallback

  try {
    if (data.getInt) return data.getInt(key)
  } catch (ignored) {}

  try {
    if (data[key] != null) return Math.floor(Number(data[key]) || fallback)
  } catch (ignored2) {}

  return fallback
}

function readBoolTag(data, key, fallback) {
  if (!data) return fallback

  try {
    if (data.getBoolean) return data.getBoolean(key)
  } catch (ignored) {}

  try {
    if (data[key] != null) return !!data[key]
  } catch (ignored2) {}

  return fallback
}

function applyCounterPayload(data) {
  HUD_STATE.count = readIntTag(data, 'count', 0)
  HUD_STATE.enabled = readBoolTag(data, 'enabled', true)
  HUD_STATE.offsetX = readIntTag(data, 'offset_x', 0)
  HUD_STATE.offsetY = readIntTag(data, 'offset_y', -12)
}

function registerHudListener() {
  if (HUD_STATE.listenerRegistered) return
  HUD_STATE.listenerRegistered = true

  $NeoForge.EVENT_BUS.addListener($EventPriority.NORMAL, false, $RenderGuiEventPost, function (event) {
    if (!HUD_STATE.enabled) return

    var mc = $Minecraft.getInstance()
    if (!mc || !mc.player) return

    try {
      if (mc.options.hideGui) return
    } catch (ignored) {}

    if (mc.screen != null) return

    var guiGraphics = event.getGuiGraphics()
    var sh = mc.getWindow().getGuiScaledHeight()
    var x = 10 + HUD_STATE.offsetX
    var y = sh - 39 + HUD_STATE.offsetY
    var text = 'Randon Counter : ' + HUD_STATE.count

    // MC 26+: GuiGraphicsExtractor uses text(), not drawString()
    guiGraphics.text(mc.font, text, x, y, 0xffffff, true)
  })
}

NetworkEvents.dataReceived(COUNTER_SYNC_CHANNEL, function (event) {
  applyCounterPayload(event.data)
  registerHudListener()
})

ClientEvents.tick(function () {
  registerHudListener()
})