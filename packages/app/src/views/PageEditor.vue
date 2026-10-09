<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { SheetViewer, type SheetPointerEvent } from '@cabul8r/canvas'
import { describeCalibration, measuredCalibration, paperLengthMm } from '@cabul8r/document'
import {
  ACTUAL_SIZE_ZOOM,
  constrainAngle,
  distance,
  midpoint,
  toScreen,
  type Vec2,
  type View,
} from '@cabul8r/geometry'
import { useWorkbench } from '@cabul8r/workbench'
import DimensionInput from '../components/DimensionInput.vue'
import { pageEditorId, useEditorTools, viewers, type Tool } from '../editors'
import { useLengthFormat } from '../format'
import { measure, usePlans } from '../plans'
import { useSettings } from '../settings'

const props = defineProps<{ pageId: string }>()
const wb = useWorkbench()
const plans = usePlans()
const tools = useEditorTools()
const settings = useSettings()
const fmt = useLengthFormat()

const host = ref<HTMLDivElement>()
const canvas = ref<HTMLCanvasElement>()
const view = ref<View>()
const error = ref<string>()
const page = computed(() => plans.page(props.pageId))
const tool = computed<Tool>(() => tools.tools[props.pageId] ?? 'pan')
const measurements = computed(() => plans.measurementsFor(props.pageId))

/** First point of a calibrate/measure gesture, the live pointer, and a line awaiting a length. */
const pending = ref<Vec2>()
const hover = ref<Vec2>()
const calibrating = ref<{ a: Vec2; b: Vec2 }>()
const knownLength = ref<number>()

let viewer: SheetViewer | undefined
let resizeObserver: ResizeObserver | undefined

const CALIBRATE_COLOR = '#e8730c'
const MEASURE_COLOR = '#0a6fd1'

function setTool(t: Tool) {
  tools.setTool(props.pageId, t)
  cancelGesture()
}

function cancelGesture() {
  pending.value = undefined
  hover.value = undefined
  calibrating.value = undefined
}

const pointFor = (e: SheetPointerEvent): Vec2 =>
  pending.value && e.original.shiftKey ? constrainAngle(pending.value, e.sheet, 45) : e.sheet

function onPointerDown(e: SheetPointerEvent) {
  if (tool.value === 'pan' || calibrating.value) return
  const p = pointFor(e)
  if (!pending.value) {
    pending.value = p
    return
  }
  const a = pending.value
  if (distance(a, p) * (view.value?.zoom ?? 1) < 3) return // ignore accidental double clicks
  pending.value = undefined
  if (tool.value === 'measure') plans.addMeasurement(props.pageId, a, p)
  else {
    knownLength.value = undefined
    calibrating.value = { a, b: p }
  }
}

function onPointerMove(e: SheetPointerEvent) {
  if (tool.value !== 'pan' && !calibrating.value) hover.value = pointFor(e)
}

function applyCalibration(mm: number) {
  const line = calibrating.value
  if (!line) return
  try {
    plans.setCalibration(props.pageId, measuredCalibration(line.a, line.b, mm))
    calibrating.value = undefined
    setTool('measure')
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

const popoverStyle = computed(() => {
  if (!calibrating.value || !view.value) return undefined
  const p = toScreen(view.value, midpoint(calibrating.value.a, calibrating.value.b))
  return { left: `${p.x}px`, top: `${p.y + 18}px` }
})

const calibratingPaper = computed(() =>
  calibrating.value
    ? fmt.paper(paperLengthMm(distance(calibrating.value.a, calibrating.value.b)))
    : '',
)

const zoomPercent = computed(() =>
  view.value ? Math.round((view.value.zoom / ACTUAL_SIZE_ZOOM) * 100) : 100,
)

/** Label lines for a segment: scaled length first (when calibrated), then the drawn length. */
function labels(a: Vec2, b: Vec2): string[] {
  if (!page.value) return []
  const { paperMm, realMm } = measure(page.value, { a, b })
  return realMm === undefined
    ? [`${fmt.paper(paperMm)} paper`]
    : [fmt.real(realMm), `${fmt.paper(paperMm)} drawn`]
}

function drawSegment(
  ctx: CanvasRenderingContext2D,
  v: View,
  a: Vec2,
  b: Vec2,
  color: string,
  text: string[],
  dashed = false,
) {
  const p = toScreen(v, a)
  const q = toScreen(v, b)
  const len = Math.hypot(q.x - p.x, q.y - p.y) || 1
  const n = { x: (-(q.y - p.y) / len) * 6, y: ((q.x - p.x) / len) * 6 }
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.setLineDash(dashed ? [6, 4] : [])
  ctx.beginPath()
  ctx.moveTo(p.x, p.y)
  ctx.lineTo(q.x, q.y)
  ctx.stroke()
  ctx.setLineDash([])
  for (const e of [p, q]) {
    ctx.beginPath()
    ctx.moveTo(e.x - n.x, e.y - n.y)
    ctx.lineTo(e.x + n.x, e.y + n.y)
    ctx.stroke()
  }
  if (text.length) {
    const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
    ctx.font = '600 12px var(--vscode-font-family), system-ui, sans-serif'
    const primary = ctx.measureText(text[0]!).width
    ctx.font = '11px system-ui, sans-serif'
    const secondary = text[1] ? ctx.measureText(text[1]).width : 0
    const w = Math.max(primary, secondary) + 12
    const h = text[1] ? 34 : 20
    const x = m.x - w / 2
    const y = m.y - h - 6
    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)'
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, 4)
    ctx.fill()
    ctx.stroke()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = '#1f1f1f'
    ctx.font = '600 12px system-ui, sans-serif'
    ctx.fillText(text[0]!, m.x, y + 4)
    if (text[1]) {
      ctx.fillStyle = '#616161'
      ctx.font = '11px system-ui, sans-serif'
      ctx.fillText(text[1], m.x, y + 19)
    }
  }
  ctx.restore()
}

function drawOverlay(ctx: CanvasRenderingContext2D, v: View) {
  for (const m of measurements.value) drawSegment(ctx, v, m.a, m.b, MEASURE_COLOR, labels(m.a, m.b))
  if (calibrating.value) {
    drawSegment(ctx, v, calibrating.value.a, calibrating.value.b, CALIBRATE_COLOR, [])
  } else if (pending.value && hover.value) {
    const color = tool.value === 'calibrate' ? CALIBRATE_COLOR : MEASURE_COLOR
    const text =
      tool.value === 'calibrate'
        ? [`${fmt.paper(paperLengthMm(distance(pending.value, hover.value)))} drawn`]
        : labels(pending.value, hover.value)
    drawSegment(ctx, v, pending.value, hover.value, color, text, true)
  }
}

function onKeydown(e: KeyboardEvent) {
  if (wb.state.activeEditor !== pageEditorId(props.pageId)) return
  if (e.key === 'Escape' && (pending.value || calibrating.value)) {
    cancelGesture()
    viewer?.requestDraw()
  }
}

onMounted(async () => {
  try {
    const pdfPage = await plans.pdfPage(props.pageId)
    if (!canvas.value || !host.value) return
    viewer = new SheetViewer(canvas.value, pdfPage, {
      drawOverlay,
      onPointerDown,
      onPointerMove,
      leftDragPans: () => tool.value === 'pan',
      onViewChange: (v) => {
        view.value = { ...v }
        tools.zoom[props.pageId] = v.zoom
        if (canvas.value) canvas.value.dataset.view = JSON.stringify(v)
      },
    })
    viewers.set(props.pageId, viewer)
    resizeObserver = new ResizeObserver(() => {
      const r = host.value?.getBoundingClientRect()
      if (r) viewer?.resize(r.width, r.height)
    })
    resizeObserver.observe(host.value)
  } catch (e) {
    error.value = `Could not open this page: ${e instanceof Error ? e.message : String(e)}`
  }
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  resizeObserver?.disconnect()
  viewer?.dispose()
  viewers.delete(props.pageId)
})

watch(
  () => [
    measurements.value,
    page.value?.calibration,
    pending.value,
    hover.value,
    calibrating.value,
    settings.system,
    settings.lengthStyle,
    settings.denominator,
  ],
  () => viewer?.requestDraw(),
  { deep: true },
)

const hint = computed(() => {
  if (calibrating.value) return 'Enter the real length of the line you drew.'
  if (tool.value === 'calibrate')
    return pending.value
      ? 'Click the second point. Hold Shift to snap to 45°. Esc cancels.'
      : 'Calibrate: click two points a known distance apart.'
  if (tool.value === 'measure')
    return page.value?.calibration
      ? 'Measure: click two points. Hold Shift to snap to 45°.'
      : 'No scale set. Lengths are shown as drawn on paper. Calibrate or pick a scale first.'
  return 'Drag to pan, scroll to zoom. Middle-drag or Space+drag pans with any tool.'
})

const toolButtons: { tool: Tool; icon: string; title: string }[] = [
  { tool: 'pan', icon: 'move', title: 'Pan (H)' },
  { tool: 'calibrate', icon: 'symbol-ruler', title: 'Calibrate Scale (K)' },
  { tool: 'measure', icon: 'arrow-both', title: 'Measure (M)' },
]
</script>

<template>
  <div class="page-editor">
    <div class="toolbar" role="toolbar" aria-label="Page tools">
      <button
        v-for="b in toolButtons"
        :key="b.tool"
        class="wb-icon-button tool"
        :class="{ active: tool === b.tool }"
        :title="b.title"
        :aria-label="b.title"
        :aria-pressed="tool === b.tool"
        @click="setTool(b.tool)"
      >
        <span class="codicon" :class="'codicon-' + b.icon" />
      </button>
      <span class="divider" />
      <button
        class="wb-icon-button"
        title="Zoom Out"
        aria-label="Zoom Out"
        @click="viewer?.zoomBy(1 / 1.25)"
      >
        <span class="codicon codicon-zoom-out" />
      </button>
      <span class="zoom" data-testid="zoom">{{ zoomPercent }}%</span>
      <button
        class="wb-icon-button"
        title="Zoom In"
        aria-label="Zoom In"
        @click="viewer?.zoomBy(1.25)"
      >
        <span class="codicon codicon-zoom-in" />
      </button>
      <button
        class="wb-icon-button"
        title="Fit Page"
        aria-label="Fit Page"
        @click="viewer?.fitPage()"
      >
        <span class="codicon codicon-screen-normal" />
      </button>
      <span class="hint">{{ hint }}</span>
      <button
        class="scale-chip"
        :class="{ missing: !page?.calibration }"
        title="Set Scale"
        data-testid="page-scale"
        @click="wb.commands.execute('cabul8r.page.setScale', pageId)"
      >
        <span
          class="codicon"
          :class="page?.calibration ? 'codicon-symbol-ruler' : 'codicon-warning'"
        />
        {{ describeCalibration(page?.calibration) }}
      </button>
    </div>
    <div
      ref="host"
      class="canvas-host"
      :class="{ crosshair: tool !== 'pan' }"
      @contextmenu="
        wb.showContextMenu($event, [
          { command: 'cabul8r.page.setScale', args: [pageId] },
          { command: 'cabul8r.page.calibrate', args: [pageId] },
          { command: 'cabul8r.page.measure', args: [pageId] },
          { separator: true },
          {
            command: 'cabul8r.page.clearMeasurements',
            args: [pageId],
            disabled: !measurements.length,
          },
          { separator: true },
          { command: 'cabul8r.view.fitPage' },
        ])
      "
    >
      <canvas ref="canvas" data-testid="page-canvas" />
      <p v-if="error" class="error">{{ error }}</p>
      <form
        v-if="calibrating"
        class="popover"
        :style="popoverStyle"
        data-testid="calibrate-popover"
        @submit.prevent="knownLength !== undefined && applyCalibration(knownLength)"
        @keydown.esc="cancelGesture"
      >
        <DimensionInput
          v-model="knownLength"
          label="Known length"
          autofocus
          @submit="applyCalibration"
        />
        <span class="drawn">Drawn on paper: {{ calibratingPaper }}</span>
        <div class="actions">
          <button type="submit" class="wb-button" :disabled="knownLength === undefined">
            Set Scale
          </button>
          <button type="button" class="wb-button secondary" @click="cancelGesture">Cancel</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.page-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 32px;
  padding: 0 8px;
  border-bottom: 1px solid var(--vscode-editorGroupHeader-tabsBorder);
}
.tool.active {
  color: var(--vscode-button-foreground);
  background: var(--vscode-button-background);
}
.divider {
  width: 1px;
  height: 16px;
  margin: 0 6px;
  background: var(--vscode-widget-border);
}
.zoom {
  min-width: 44px;
  text-align: center;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.hint {
  flex: 1;
  min-width: 0;
  margin-left: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}
.scale-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font: inherit;
  font-size: 12px;
  color: inherit;
  background: transparent;
  border: 1px solid var(--vscode-widget-border);
  border-radius: 10px;
  cursor: pointer;
  white-space: nowrap;
}
.scale-chip.missing {
  color: var(--vscode-statusBarItem-warningForeground);
}
.scale-chip:hover {
  background: var(--vscode-list-hoverBackground);
}
.canvas-host {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.canvas-host.crosshair canvas {
  cursor: crosshair;
}
canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  touch-action: none;
}
.error {
  position: absolute;
  inset: 0;
  margin: auto;
  height: fit-content;
  text-align: center;
  color: var(--vscode-errorForeground);
}
.popover {
  position: absolute;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  color: var(--vscode-foreground);
  background: var(--vscode-menu-background);
  border: 1px solid var(--vscode-menu-border);
  border-radius: 6px;
  box-shadow: 0 2px 8px var(--vscode-widget-shadow);
}
.drawn {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}
.actions {
  display: flex;
  gap: 6px;
}
</style>
