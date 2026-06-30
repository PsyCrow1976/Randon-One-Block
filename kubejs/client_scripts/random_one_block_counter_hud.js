// priority: 0
// Randon One Block — team mine counter HUD (above health hearts)

const COUNTER_SYNC_CHANNEL = 'random_one_block_counter'
const HUD_TEXT_COLOR = 0xffffffff

const $NeoForge = Java.loadClass('net.neoforged.neoforge.common.NeoForge')
const $RegisterGuiLayersEvent = Java.loadClass('net.neoforged.neoforge.client.event.RegisterGuiLayersEvent')
const $GuiLayerOrdering = Java.loadClass('net.neoforged.neoforge.client.event.RegisterGuiLayersEvent$Ordering')
const $VanillaGuiLayers = Java.loadClass('net.neoforged.neoforge.client.gui.VanillaGuiLayers')
const $Identifier = Java.loadClass('net.minecraft.resources.Identifier')
const $Minecraft = Java.loadClass('net.minecraft.client.Minecraft')

const HUD_LAYER_ID = $Identifier.fromNamespaceAndPath('randon_one_block', 'counter_hud')

const HUD_STATE = {
  count: 0,
  enabled: true,
  offsetX: 0,
  offsetY: -12
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
  HUD_STATE.offsetX = readIntTag(data, 'offset_x', 0)
  HUD_STATE.offsetY = readIntTag(data, 'offset_y', -12)
}

function shouldRenderHud(mc) {
  if (!HUD_STATE.enabled) return false
  if (!mc || !mc.player) return false

  try {
    if (mc.options.hideGui) return false
  } catch (ignored) {}

  if (mc.screen != null) return false

  return true
}

function renderCounterHud(guiGraphics, partialTick) {
  var mc = $Minecraft.getInstance()
  if (!shouldRenderHud(mc)) return

  var sh = coerceJavaInt(mc.getWindow().getGuiScaledHeight(), 0)
  var offsetX = coerceJavaInt(HUD_STATE.offsetX, 0)
  var offsetY = coerceJavaInt(HUD_STATE.offsetY, -12)
  var count = coerceJavaInt(HUD_STATE.count, 0)
  var x = 10 + offsetX
  var y = sh - 51 + offsetY
  var text = 'Randon Counter : ' + count

  // MC 26: ARGB color (alpha in high byte) and GuiGraphicsExtractor.text()
  guiGraphics.text(mc.font, text, x, y, HUD_TEXT_COLOR, true)
}

$NeoForge.EVENT_BUS.addListener($RegisterGuiLayersEvent, function (event) {
  event.register($GuiLayerOrdering.AFTER, HUD_LAYER_ID, $VanillaGuiLayers.PLAYER_HEALTH, function (guiGraphics, partialTick) {
    renderCounterHud(guiGraphics, partialTick)
  })
})

NetworkEvents.dataReceived(COUNTER_SYNC_CHANNEL, function (event) {
  applyCounterPayload(event.data)
})