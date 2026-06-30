// priority: 0
// Randon One Block — counter screen text (diagnostic: text1..text12)

const COUNTER_SYNC_CHANNEL = 'random_one_block_counter'

// Set false after you tell us which textN label is visible in-game.
const SHOW_TEXT_DIAGNOSTIC = true

const $NeoForge = Java.loadClass('net.neoforged.neoforge.common.NeoForge')
const $EventPriority = Java.loadClass('net.neoforged.bus.api.EventPriority')
const $RenderGuiEventPre = Java.loadClass('net.neoforged.neoforge.client.event.RenderGuiEvent$Pre')
const $RenderGuiEventPost = Java.loadClass('net.neoforged.neoforge.client.event.RenderGuiEvent$Post')
const $RenderGuiLayerEventPost = Java.loadClass('net.neoforged.neoforge.client.event.RenderGuiLayerEvent$Post')
const $VanillaGuiLayers = Java.loadClass('net.neoforged.neoforge.client.gui.VanillaGuiLayers')
const $Minecraft = Java.loadClass('net.minecraft.client.Minecraft')

const TEXT_COLORS = [
  0xffff5555,
  0xff55ff55,
  0xff5555ff,
  0xffffff55,
  0xffff55ff,
  0xff55ffff,
  0xffffaa00,
  0xffaa55ff,
  0xff00aaaa,
  0xffffffff,
  0xffff8888,
  0xff88ff88
]

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

function getMc() {
  return $Minecraft.getInstance()
}

function shouldDrawInWorld(mc) {
  if (!SHOW_TEXT_DIAGNOSTIC || !HUD_STATE.enabled) return false
  if (!mc || !mc.player) return false

  try {
    if (mc.options.hideGui) return false
  } catch (ignored) {}

  if (mc.screen != null) return false

  return true
}

function counterSuffix() {
  return ' count=' + coerceJavaInt(HUD_STATE.count, 0)
}

function safeDraw(label, drawFn) {
  try {
    drawFn()
  } catch (e) {
    console.warn('[RandomOneBlock] ' + label + ' failed: ' + e)
  }
}

function drawTextString(guiGraphics, mc, line, x, y, color, shadow) {
  guiGraphics.text(mc.font, line, x, y, color, shadow === true)
}

function drawTextComponent(guiGraphics, mc, line, x, y, color, shadow) {
  guiGraphics.text(mc.font, Text.of(line), x, y, color, shadow === true)
}

function drawDiagnosticLine(guiGraphics, index, methodName, x, y) {
  var mc = getMc()
  if (!mc) return

  var color = TEXT_COLORS[(index - 1) % TEXT_COLORS.length]
  var line = 'text' + index + ': ' + methodName + counterSuffix()

  safeDraw('text' + index, function () {
    drawTextString(guiGraphics, mc, line, x, y, color, true)
  })
}

function isPlayerHealthLayer(layerId) {
  return String(layerId) === String($VanillaGuiLayers.PLAYER_HEALTH)
}

function addGameBusListener(eventClass, handler) {
  $NeoForge.EVENT_BUS.addListener($EventPriority.NORMAL, false, eventClass, handler)
}

function renderGuiPreDiagnostics(guiGraphics) {
  var mc = getMc()
  if (!shouldDrawInWorld(mc)) return

  drawDiagnosticLine(guiGraphics, 2, 'RenderGuiEvent.Pre + text()', 10, 25)
  drawDiagnosticLine(guiGraphics, 4, 'RenderGuiEvent.Pre + text() #2', 10, 55)
}

function renderGuiPostDiagnostics(guiGraphics) {
  var mc = getMc()
  if (!shouldDrawInWorld(mc)) return

  var sw = coerceJavaInt(mc.getWindow().getGuiScaledWidth(), 0)
  var sh = coerceJavaInt(mc.getWindow().getGuiScaledHeight(), 0)
  var offsetX = coerceJavaInt(HUD_STATE.offsetX, 0)
  var offsetY = coerceJavaInt(HUD_STATE.offsetY, -12)

  drawDiagnosticLine(guiGraphics, 1, 'RenderGuiEvent.Post + text()', 10, 10)
  drawDiagnosticLine(guiGraphics, 5, 'RenderGuiEvent.Post + text() #2', 10, 70)

  safeDraw('text6', function () {
    guiGraphics.centeredText(
      mc.font,
      'text6: centeredText (Post)' + counterSuffix(),
      Math.floor(sw / 2),
      30,
      TEXT_COLORS[5],
      true
    )
  })

  safeDraw('text7', function () {
    drawTextComponent(guiGraphics, mc, 'text7: Component (Post)' + counterSuffix(), 10, 100, TEXT_COLORS[6], true)
  })

  safeDraw('text8', function () {
    guiGraphics.textWithBackdrop(mc.font, Text.of('text8: textWithBackdrop (Post)' + counterSuffix()), 10, 115, 240, TEXT_COLORS[7])
  })

  safeDraw('text9', function () {
    drawTextString(
      guiGraphics,
      mc,
      'text9: Post above hearts' + counterSuffix(),
      10 + offsetX,
      sh - 51 + offsetY,
      TEXT_COLORS[8],
      true
    )
  })
}

addGameBusListener($RenderGuiEventPre, function (event) {
  renderGuiPreDiagnostics(event.getGuiGraphics())
})

addGameBusListener($RenderGuiEventPost, function (event) {
  renderGuiPostDiagnostics(event.getGuiGraphics())
})

addGameBusListener($RenderGuiLayerEventPost, function (event) {
  if (!isPlayerHealthLayer(event.getName())) return
  var mc = getMc()
  if (!shouldDrawInWorld(mc)) return
  drawDiagnosticLine(event.getGuiGraphics(), 3, 'RenderGuiLayerEvent.Post(PLAYER_HEALTH)', 10, 40)
})

ClientEvents.leftDebugInfo(function (event) {
  if (!SHOW_TEXT_DIAGNOSTIC || !HUD_STATE.enabled) return
  event.lines.add('text10: leftDebugInfo (visible with F3)' + counterSuffix())
})

ClientEvents.tick(function () {
  var mc = getMc()
  if (!shouldDrawInWorld(mc)) return

  safeDraw('text11', function () {
    mc.gui.setOverlayMessage(Text.of('text11: setOverlayMessage (top bar)' + counterSuffix()), false)
  })

  safeDraw('text12', function () {
    mc.gui.setSubtitle(Text.of('text12: setSubtitle (bottom)' + counterSuffix()))
  })
})

NetworkEvents.dataReceived(COUNTER_SYNC_CHANNEL, function (event) {
  applyCounterPayload(event.data)
})

console.info(
  '[RandomOneBlock] Counter text diagnostic enabled (game bus only) — look for text1..text12 (text10 needs F3).'
)