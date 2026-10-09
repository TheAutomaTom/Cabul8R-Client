import { fitView, panBy, toSheet, zoomAt, type Vec2, type View } from '@cabul8r/geometry'
import { isCancelled, renderRegion, type PDFPageProxy, type RenderTask } from '@cabul8r/pdf'

/** Longest side of the whole-page preview bitmap, in device pixels. */
const PREVIEW_MAX_PX = 3072
/** Idle time before rendering the visible region at full sharpness. */
const SHARPEN_DELAY_MS = 120

export interface SheetPointerEvent {
  /** Pointer position in sheet space (PDF points). */
  sheet: Vec2
  /** Pointer position in CSS pixels relative to the canvas. */
  screen: Vec2
  original: PointerEvent
}

export interface SheetViewerOptions {
  /** Draw markup and tool feedback on top of the sheet. The context is in CSS pixels. */
  drawOverlay?: (ctx: CanvasRenderingContext2D, view: View) => void
  onViewChange?: (view: View) => void
  onPointerDown?: (e: SheetPointerEvent) => void
  onPointerMove?: (e: SheetPointerEvent) => void
  /** Fired after the visible region is rendered sharp, for tests and progress UI. */
  onRendered?: () => void
  /** Left-drag pans (the hand tool). Middle-drag and Space+drag always pan. */
  leftDragPans?: () => boolean
}

interface Rendered {
  canvas: HTMLCanvasElement
  view: View
  dpr: number
}

/**
 * Pan/zoom viewer for one PDF page. Shows a whole-page preview instantly while the view
 * moves, then re-renders just the visible region at screen resolution once it settles.
 */
export class SheetViewer {
  view: View = { zoom: 1, x: 0, y: 0 }
  private width = 0
  private height = 0
  private dpr = 1
  private preview?: Rendered
  private sharp?: Rendered
  private task?: RenderTask
  private sharpenTimer?: ReturnType<typeof setTimeout>
  private frame = 0
  private fitted = false
  private disposed = false
  private spaceDown = false
  private readonly cleanup: (() => void)[] = []

  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly page: PDFPageProxy,
    private readonly options: SheetViewerOptions = {},
  ) {
    this.bindInput()
    void this.renderPreview()
  }

  get sheetSize() {
    const { width, height } = this.page.getViewport({ scale: 1 })
    return { width, height }
  }

  /** Call when the canvas's CSS size or the device pixel ratio changes. */
  resize(width: number, height: number, dpr = window.devicePixelRatio || 1): void {
    if (width === this.width && height === this.height && dpr === this.dpr) return
    this.width = width
    this.height = height
    this.dpr = dpr
    this.canvas.width = Math.round(width * dpr)
    this.canvas.height = Math.round(height * dpr)
    if (!this.fitted && width > 0 && height > 0) {
      this.fitted = true
      this.view = fitView(this.sheetSize, { width, height })
    }
    this.viewChanged()
  }

  setView(view: View): void {
    this.view = view
    this.viewChanged()
  }

  fitPage(): void {
    this.setView(fitView(this.sheetSize, { width: this.width, height: this.height }))
  }

  zoomBy(factor: number, anchor: Vec2 = { x: this.width / 2, y: this.height / 2 }): void {
    this.setView(zoomAt(this.view, anchor, factor))
  }

  /** Redraw the overlay without re-rendering the PDF. */
  requestDraw(): void {
    if (this.frame) return
    this.frame = requestAnimationFrame(() => {
      this.frame = 0
      this.draw()
    })
  }

  dispose(): void {
    this.disposed = true
    this.task?.cancel()
    clearTimeout(this.sharpenTimer)
    cancelAnimationFrame(this.frame)
    for (const fn of this.cleanup) fn()
  }

  private viewChanged(): void {
    this.options.onViewChange?.(this.view)
    this.requestDraw()
    clearTimeout(this.sharpenTimer)
    this.sharpenTimer = setTimeout(() => void this.renderSharp(), SHARPEN_DELAY_MS)
  }

  private async renderPreview(): Promise<void> {
    const { width, height } = this.sheetSize
    const zoom = Math.min(PREVIEW_MAX_PX / Math.max(width, height), 4)
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(width * zoom)
    canvas.height = Math.ceil(height * zoom)
    try {
      await renderRegion(this.page, canvas, zoom, 0, 0).promise
    } catch (e) {
      if (isCancelled(e)) return
      throw e
    }
    if (this.disposed) return
    this.preview = { canvas, view: { zoom, x: 0, y: 0 }, dpr: 1 }
    this.requestDraw()
  }

  private async renderSharp(): Promise<void> {
    if (this.disposed || this.width === 0) return
    this.task?.cancel()
    const view = { ...this.view }
    const dpr = this.dpr
    const canvas = document.createElement('canvas')
    canvas.width = this.canvas.width
    canvas.height = this.canvas.height
    const task = renderRegion(this.page, canvas, view.zoom * dpr, view.x * dpr, view.y * dpr)
    this.task = task
    try {
      await task.promise
    } catch (e) {
      if (isCancelled(e)) return
      throw e
    }
    if (this.disposed || this.task !== task) return
    this.sharp = { canvas, view, dpr }
    this.requestDraw()
    this.canvas.dataset.rendered = 'true'
    this.options.onRendered?.()
  }

  /** Draw a rendered bitmap where its sheet area falls in the current view. */
  private blit(ctx: CanvasRenderingContext2D, r: Rendered): void {
    // Bitmap pixel (0,0) sits at sheet point -offset/zoom of the view it was rendered for.
    const renderZoom = r.view.zoom * r.dpr
    const origin = { x: (-r.view.x * r.dpr) / renderZoom, y: (-r.view.y * r.dpr) / renderZoom }
    const k = this.view.zoom / renderZoom
    ctx.drawImage(
      r.canvas,
      origin.x * this.view.zoom + this.view.x,
      origin.y * this.view.zoom + this.view.y,
      r.canvas.width * k,
      r.canvas.height * k,
    )
  }

  private draw(): void {
    const ctx = this.canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.clearRect(0, 0, this.width, this.height)

    const { width, height } = this.sheetSize
    const v = this.view
    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
    ctx.shadowBlur = 12
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(v.x, v.y, width * v.zoom, height * v.zoom)
    ctx.restore()

    ctx.save()
    ctx.beginPath()
    ctx.rect(v.x, v.y, width * v.zoom, height * v.zoom)
    ctx.clip()
    ctx.imageSmoothingQuality = 'high'
    if (this.preview) this.blit(ctx, this.preview)
    if (this.sharp && this.sharp.dpr === this.dpr) this.blit(ctx, this.sharp)
    ctx.restore()

    this.options.drawOverlay?.(ctx, v)
  }

  private bindInput(): void {
    const c = this.canvas
    const on = <K extends keyof HTMLElementEventMap>(
      target: HTMLElement | Window,
      type: K,
      fn: (e: HTMLElementEventMap[K]) => void,
      opts?: AddEventListenerOptions,
    ) => {
      target.addEventListener(type, fn as EventListener, opts)
      this.cleanup.push(() => target.removeEventListener(type, fn as EventListener, opts))
    }
    const local = (e: MouseEvent): Vec2 => {
      const r = c.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const pointer = (e: PointerEvent): SheetPointerEvent => {
      const screen = local(e)
      return { screen, sheet: toSheet(this.view, screen), original: e }
    }

    on(
      c,
      'wheel',
      (e) => {
        e.preventDefault()
        // Trackpad pinch arrives as ctrl+wheel with small deltas; a mouse wheel notch is ~100.
        const delta = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY
        this.zoomBy(Math.exp(-delta * (e.ctrlKey ? 0.01 : 0.0015)), local(e))
      },
      { passive: false },
    )

    let panning: { last: Vec2; id: number } | undefined
    on(c, 'pointerdown', (e) => {
      const pan =
        e.button === 1 || (e.button === 0 && (this.spaceDown || !!this.options.leftDragPans?.()))
      if (pan) {
        e.preventDefault()
        c.setPointerCapture(e.pointerId)
        panning = { last: { x: e.clientX, y: e.clientY }, id: e.pointerId }
        c.style.cursor = 'grabbing'
        return
      }
      if (e.button === 0) {
        // Keep focus where tools put it (e.g. a length popover) instead of the click's default.
        e.preventDefault()
        this.options.onPointerDown?.(pointer(e))
      }
    })
    on(c, 'pointermove', (e) => {
      if (panning && e.pointerId === panning.id) {
        this.setView(panBy(this.view, e.clientX - panning.last.x, e.clientY - panning.last.y))
        panning.last = { x: e.clientX, y: e.clientY }
        return
      }
      this.options.onPointerMove?.(pointer(e))
    })
    const endPan = (e: PointerEvent) => {
      if (!panning || e.pointerId !== panning.id) return
      panning = undefined
      c.style.cursor = ''
    }
    on(c, 'pointerup', endPan)
    on(c, 'pointercancel', endPan)
    on(c, 'auxclick', (e) => e.button === 1 && e.preventDefault())

    on(window, 'keydown', (e) => {
      if (e.code === 'Space' && !isTyping(e.target)) {
        this.spaceDown = true
        if (!panning) c.style.cursor = 'grab'
      }
    })
    on(window, 'keyup', (e) => {
      if (e.code === 'Space') {
        this.spaceDown = false
        if (!panning) c.style.cursor = ''
      }
    })
  }
}

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && !!target.closest('input, textarea, [contenteditable]')
