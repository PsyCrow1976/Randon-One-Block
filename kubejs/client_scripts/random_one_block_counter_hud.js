// priority: 0
// Randon One Block — counter screen text (diagnostic: text1..text12)

const COUNTER_SYNC_CHANNEL = 'random_one_block_counter'

// Set false after you tell us which textN label is visible in-game.
const SHOW_TEXT_DIAGNOSTIC = true

const $NeoForge = Java.loadClass('net.neoforged.neoforge.common.NeoForge')
const $EventPriority = Java.loadClass('net.neoforged.bus.api.EventPriority')
const $RegisterGuiLayersEvent = Java.loadClass('net.neoforged.neoforge.client.event.RegisterGuiLayersEvent')
const $GuiLayerOrdering = Java.loadClass('net.neoforged.neoforge.client.event.RegisterGuiLayersEvent$Ordering')
const $RenderGuiEventPre = Java.loadClass('net.neoforged.neoforge.client.event.RenderGuiEvent$Pre')
const $RenderGuiEventPost = Java.loadClass('net.neoforged.neoforge.client.event.RenderGuiEvent$Post')
const $RenderGuiLayerEventPost = Java.loadClass('net.neoforged.neoforge.client.event.RenderGuiLayerEvent$Post')
const $VanillaGuiLayers = Java.loadClass('net.neoforged.neoforge.client.gui.VanillaGuiLayers')
const $Identifier = Java.loadClass('net.minecraft.resources.Identifier')
const $Minecraft = Java.loadClass('net.minecraft.client.Minecraft')

const HUD_LAYER_AFTER_HEALTH = $Identifier.fromNamespaceAndPath('randon_one_block', 'counter_after_health')
const HUD_LAYER_BEFORE_HEALTH = $Identifier.fromNamespaceAndPath('randon_one_block', 'counter_before_health')
const HUD_LAYER_ABOVE_HEALTH = $Identifier.fromNamespaceAndPath('randon_one_block', 'counter_above_health')

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

function renderDiagnosticOnLayer(guiGraphics, textIndex, methodName, y) {
  if (!SHOW_TEXT_DIAGNOSTIC) return
  if (!HUD_STATE.enabled) return

  var mc = getMc()
  if (!shouldDrawInWorld(mc)) return

  drawDiagnosticLine(guiGraphics, textIndex, methodName, 10, y)
}

function renderText7Centered(guiGraphics) {
  if (!SHOW_TEXT_DIAGNOSTIC || !HUD_STATE.enabled) return

  var mc = getMc()
  if (!shouldDrawInWorld(mc)) return

  var sw = coerceJavaInt(mc.getWindow().getGuiScaledWidth(), 0)
  var line = 'text7: centeredText AFTER health' + counterSuffix()

  safeDraw('text7', function () {
    guiGraphics.centeredText(mc.font, line, Math.floor(sw / 2), 30, TEXT_COLORS[6], true)
  })
}

function renderText8Component(guiGraphics) {
  if (!SHOW_TEXT_DIAGNOSTIC || !HUD_STATE.enabled) return

  var mc = getMc()
  if (!shouldDrawInWorld(mc)) return

  var line = 'text8: Component text AFTER health' + counterSuffix()

  safeDraw('text8', function () {
    drawTextComponent(guiGraphics, mc, line, 10, 150, TEXT_COLORS[7], true)
  })
}

function renderText9Backdrop(guiGraphics) {
  if (!SHOW_TEXT_DIAGNOSTIC || !HUD_STATE.enabled) return

  var mc = getMc()
  if (!shouldDrawInWorld(mc)) return

  var line = 'text9: textWithBackdrop AFTER health' + counterSuffix()

  safeDraw('text9', function () {
    guiGraphics.textWithBackdrop(mc.font, Text.of(line), 10, 165, 220, TEXT_COLORS[8])
  })
}

function renderText4PrePost(guiGraphics, index, phaseName, y) {
  if (!SHOW_TEXT_DIAGNOSTIC || !HUD_STATE.enabled) return

  var mc = getMc()
  if (!shouldDrawInWorld(mc)) return

  drawDiagnosticLine(guiGraphics, index, phaseName, 10, y)
}

function isPlayerHealthLayer(layerId) {
  return String(layerId) === String($VanillaGuiLayers.PLAYER_HEALTH)
}

$NeoForge.EVENT_BUS.addListener($RegisterGuiLayersEvent, function (event) {
  event.register(
    $GuiLayerOrdering.AFTER,
    HUD_LAYER_AFTER_HEALTH,
    $VanillaGuiLayers.PLAYER_HEALTH,
    function (guiGraphics, partialTick) {
      renderDiagnosticOnLayer(guiGraphics, 1, 'GuiLayer AFTER health + text()', 10)
      renderText7Centered(guiGraphics)
      renderText8Component(guiGraphics)
      renderText9Backdrop(guiGraphics)
    }
  )

  event.register(
    $GuiLayerOrdering.BEFORE,
    HUD_LAYER_BEFORE_HEALTH,
    $VanillaGuiLayers.PLAYER_HEALTH,
    function (guiGraphics, partialTick) {
      renderDiagnosticOnLayer(guiGraphics, 2, 'GuiLayer BEFORE health + text()', 25)
    }
  )

  event.registerAbove($VanillaGuiLayers.PLAYER_HEALTH, HUD_LAYER_ABOVE_HEALTH, function (guiGraphics, partialTick) {
    renderDiagnosticOnLayer(guiGraphics, 3, 'registerAbove(PLAYER_HEALTH) + text()', 40)
  })
})

$NeoForge.EVENT_BUS.addListener($EventPriority.NORMAL, false, $RenderGuiEventPre, function (event) {
  renderText4PrePost(event.getGuiGraphics(), 4, 'RenderGuiEvent.Pre + text()', 55)
})

$NeoForge.EVENT_BUS.addListener($EventPriority.NORMAL, false, $RenderGuiEventPost, function (event) {
  renderText4PrePost(event.getGuiGraphics(), 5, 'RenderGuiEvent.Post + text()', 70)
})

$NeoForge.EVENT_BUS.addListener($EventPriority.NORMAL, false, $RenderGuiLayerEventPost, function (event) {
  if (!isPlayerHealthLayer(event.getName())) return
  renderText4PrePost(event.getGuiGraphics(), 6, 'RenderGuiLayerEvent.Post(PLAYER_HEALTH)', 85)
})

ClientEvents.leftDebugInfo(function (event) {
  if (!SHOW_TEXT_DIAGNOSTIC || !HUD_STATE.enabled) return
  event.lines.add('text10: leftDebugInfo (visible with F3)' + counterSuffix())
})

ClientEvents.tick(function () {
  var mc = getMc()
  if (!SHOW_TEXT_DIAGNOSTIC || !HUD_STATE.enabled || !shouldDrawInWorld(mc)) return

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
  '[RandomOneBlock] Counter text diagnostic enabled — look for text1..text12 on screen (text10 needs F3). Tell us which labels you see.'
)