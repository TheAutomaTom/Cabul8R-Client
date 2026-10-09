export interface Vec2 {
  x: number
  y: number
}

export const vec = (x: number, y: number): Vec2 => ({ x, y })
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y })
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y })
export const scale = (a: Vec2, k: number): Vec2 => ({ x: a.x * k, y: a.y * k })
export const distance = (a: Vec2, b: Vec2): number => Math.hypot(b.x - a.x, b.y - a.y)
export const midpoint = (a: Vec2, b: Vec2): Vec2 => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

/** Constrain `p` so the segment from `origin` snaps to the nearest multiple of `stepDeg`. */
export function constrainAngle(origin: Vec2, p: Vec2, stepDeg = 45): Vec2 {
  const d = sub(p, origin)
  const len = Math.hypot(d.x, d.y)
  if (len === 0) return p
  const step = (stepDeg * Math.PI) / 180
  const angle = Math.round(Math.atan2(d.y, d.x) / step) * step
  return { x: origin.x + len * Math.cos(angle), y: origin.y + len * Math.sin(angle) }
}
