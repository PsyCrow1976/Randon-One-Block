// priority: 0
// Randon One Block — team mine counter (overlay message above hotbar)

const COUNTER_SYNC_CHANNEL = 'random_one_block_counter'

const $Minecraft = Java.loadClass('net.minecraft.client.Minecraft')

const HUD_STATE = {
  count: 0,
  enabled: true
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
  if (typeof value === 'number') return value !== 0
  return String(value).toLowerCase() === 'true'
}

function readIntTag(data, key, fallback) {
  if (!data) return fallback

  try {
    if (data.getInt) return coerceJavaInt(data.getInt(key), fallback)
  } catch (ignored) {}

  try {
    if (data.getByte) return coerceJavaInt(data.getByte(key), fallback)
  } catch (ignored2) {}

  try {
    if (data[key] != null) return coerceJavaInt(data[key], fallback)
  } catch (ignored3) {}

  return fallback
}

function readBoolTag(data, key, fallback) {
  if (!data) return fallback

  try {
    if (data.getBoolean) return coerceJavaBool(data.getBoolean(key), fallback)
  } catch (ignored) {}

  try {
    if (data.getByte) return coerceJavaInt(data.getByte(key), 0) !== 0
  } catch (ignored2) {}

  try {
    if (data[key] != null) return coerceJavaBool(data[key], fallback)
  } catch (ignored3) {}

  return fallback
}

function applyCounterPayload(data) {
  HUD_STATE.count = readIntTag(data, 'count', 0)
  HUD_STATE.enabled = readBoolTag(data, 'enabled', true)
}

function getMc() {
  return $Minecraft.getInstance()
}

function shouldShowCounter(mc) {
  if (!HUD_STATE.enabled) return false
  if (!mc || !mc.player) return false

  try {
    if (mc.options.hideGui) return false
  } catch (ignored) {}

  if (mc.screen != null) return false

  return true
}

function counterOverlayText() {
  return 'Randon Mined : ' + coerceJavaInt(HUD_STATE.count, 0)
}

function updateCounterOverlay() {
  var mc = getMc()
  if (!mc || !mc.gui) return

  if (!shouldShowCounter(mc)) return

  try {
    mc.gui.setOverlayMessage(Text.of(counterOverlayText()), false)
  } catch (e) {
    console.warn('[RandomOneBlock] Counter overlay failed: ' + e)
  }
}

ClientEvents.tick(function () {
  updateCounterOverlay()
})

NetworkEvents.dataReceived(COUNTER_SYNC_CHANNEL, function (event) {
  applyCounterPayload(event.data)
  updateCounterOverlay()
})