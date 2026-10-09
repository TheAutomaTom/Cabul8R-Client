import { describe, expect, it } from 'vitest'
import { constrainAngle, distance, fitView, toScreen, toSheet, zoomAt, MAX_ZOOM } from './index'

describe('view transforms', () => {
  const view = { zoom: 2, x: 10, y: 20 }

  it('round-trips sheet and screen points', () => {
    const p = { x: 36, y: 72 }
    expect(toScreen(view, p)).toEqual({ x: 82, y: 164 })
    expect(toSheet(view, toScreen(view, p))).toEqual(p)
  })

  it('keeps the anchor fixed while zooming', () => {
    const anchor = { x: 300, y: 200 }
    const before = toSheet(view, anchor)
    const after = toSheet(zoomAt(view, anchor, 3.7), anchor)
    expect(after.x).toBeCloseTo(before.x, 10)
    expect(after.y).toBeCloseTo(before.y, 10)
  })

  it('clamps zoom', () => {
    expect(zoomAt(view, { x: 0, y: 0 }, 1e9).zoom).toBe(MAX_ZOOM)
  })

  it('fits and centers a sheet', () => {
    const v = fitView({ width: 792, height: 612 }, { width: 1000, height: 700 }, 0)
    // Height-limited: 700/612 < 1000/792.
    expect(v.zoom).toBeCloseTo(700 / 612, 10)
    expect(v.y).toBeCloseTo(0, 10)
    expect(v.x).toBeCloseTo((1000 - 792 * v.zoom) / 2, 10)
  })
})

describe('constrainAngle', () => {
  it('snaps to the nearest 45° while keeping length', () => {
    const p = constrainAngle({ x: 0, y: 0 }, { x: 10, y: 1 })
    expect(p.x).toBeCloseTo(Math.hypot(10, 1), 10)
    expect(p.y).toBeCloseTo(0, 10)
    expect(distance({ x: 0, y: 0 }, constrainAngle({ x: 0, y: 0 }, { x: 7, y: 6 }))).toBeCloseTo(
      Math.hypot(7, 6),
      10,
    )
  })
})
