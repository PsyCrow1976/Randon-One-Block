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

function coerceJavaInt(value, fallback) {
  var n = 0

  if (value == null) return fallback

  try {
    if (value.isPresent != null) {
      if (typeof value.isPresent === 'function') {
        if (!value.isPresent()) return fallback
        if (value.get) value = value.get()
      } else if (!value.isPresent) {
        return fallback
      } else if (value.get) {
        value = value.get()
      }
    }
  } catch (ignored) {}

  try {
    if (value.orElse != null) value = value.orElse(fallback)
  } catch (ignored2) {}

  n = Number(value)
  if (Number.isNaN(n)) return fallback
  return Math.floor(n)
}

function coerceJavaBool(value, fallback) {
  if (value == null) return fallback

  try {
    if (value.isPresent != null) {
      if (typeof value.isPresent === 'function') {
        if (!value.isPresent()) return fallback
        if (value.get) value = value.get()
      } else if (!value.isPresent) {
        return fallback
      } else if (value.get) {
        value = value.get()
      }
    }
  } catch (ignored) {}

  try {
    if (value.orElse != null) value = value.orElse(fallback)
  } catch (ignored2) {}

  if (value === true || value === false) return value
  return String(value).toLowerCase() === 'true'
}

function readIntTag(data, key, fallback) {
  if (!data) return fallback

  try {
    if (data.getInt) return coerceJavaInt(data.getInt(key), fallback)
  } catch (ignored) {}

  try {
    if (data[key] != null) return coerceJavaInt(data[key], fallback)
  } catch (ignored2) {}

  return fallback
}

function readBoolTag(data, key, fallback) {
  if (!data) return fallback

  try {
    if (data.getBoolean) return coerceJavaBool(data.getBoolean(key), fallback)
  } catch (ignored) {}

  try {
    if (data[key] != null) return coerceJavaBool(data[key], fallback)
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
    var sh = coerceJavaInt(mc.getWindow().getGuiScaledHeight(), 0)
    var offsetX = coerceJavaInt(HUD_STATE.offsetX, 0)
    var offsetY = coerceJavaInt(HUD_STATE.offsetY, -12)
    var count = coerceJavaInt(HUD_STATE.count, 0)
    var x = 10 + offsetX
    var y = sh - 39 + offsetY
    var text = 'Randon Counter : ' + count

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