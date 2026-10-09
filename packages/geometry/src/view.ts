import type { Vec2 } from './vec'

/**
 * Maps sheet space to screen (CSS pixels): screen = sheet * zoom + (x, y).
 * `zoom` is CSS pixels per PDF point.
 */
export interface View {
  zoom: number
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export const MIN_ZOOM = 0.02
export const MAX_ZOOM = 64
/** Zoom at which a sheet appears at its printed size on a 96 dpi screen. */
export const ACTUAL_SIZE_ZOOM = 96 / 72

export const toScreen = (v: View, p: Vec2): Vec2 => ({
  x: p.x * v.zoom + v.x,
  y: p.y * v.zoom + v.y,
})
export const toSheet = (v: View, p: Vec2): Vec2 => ({
  x: (p.x - v.x) / v.zoom,
  y: (p.y - v.y) / v.zoom,
})

/** Zoom by `factor`, keeping the sheet point under `anchor` (screen) fixed. */
export function zoomAt(v: View, anchor: Vec2, factor: number): View {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * factor))
  const k = zoom / v.zoom
  return { zoom, x: anchor.x - (anchor.x - v.x) * k, y: anchor.y - (anchor.y - v.y) * k }
}

export const panBy = (v: View, dx: number, dy: number): View => ({ ...v, x: v.x + dx, y: v.y + dy })

/** Fit the whole sheet in the viewport, centered, with a margin in CSS pixels. */
export function fitView(sheet: Size, viewport: Size, margin = 24): View {
  const availW = Math.max(1, viewport.width - margin * 2)
  const availH = Math.max(1, viewport.height - margin * 2)
  const zoom = Math.min(
    MAX_ZOOM,
    Math.max(MIN_ZOOM, Math.min(availW / sheet.width, availH / sheet.height)),
  )
  return {
    zoom,
    x: (viewport.width - sheet.width * zoom) / 2,
    y: (viewport.height - sheet.height * zoom) / 2,
  }
}
