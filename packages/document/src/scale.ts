import { distance, type Vec2 } from '@cabul8r/geometry'

/** Millimeters of paper per PDF point (1 pt = 1/72"). */
export const PAPER_MM_PER_POINT = 25.4 / 72

/**
 * How a sheet's paper space maps to the real world. `ratio` is real length ÷ paper length,
 * so 1/4" = 1'-0" is 48 and 1:50 is 50.
 */
export interface Calibration {
  ratio: number
  method: 'preset' | 'measured'
  /** Preset id when picked from the list. */
  presetId?: string
}

export interface ScalePreset {
  id: string
  label: string
  group: 'Architectural' | 'Engineering' | 'Metric'
  ratio: number
}

const arch = (label: string, paperInches: number): ScalePreset => ({
  id: `arch-${label}`,
  label: `${label} = 1'-0"`,
  group: 'Architectural',
  ratio: 12 / paperInches,
})
const eng = (feet: number): ScalePreset => ({
  id: `eng-${feet}`,
  label: `1" = ${feet}'`,
  group: 'Engineering',
  ratio: feet * 12,
})
const metric = (n: number): ScalePreset => ({
  id: `metric-${n}`,
  label: `1:${n}`,
  group: 'Metric',
  ratio: n,
})

export const SCALE_PRESETS: readonly ScalePreset[] = [
  arch('1/16"', 1 / 16),
  arch('3/32"', 3 / 32),
  arch('1/8"', 1 / 8),
  arch('3/16"', 3 / 16),
  arch('1/4"', 1 / 4),
  arch('3/8"', 3 / 8),
  arch('1/2"', 1 / 2),
  arch('3/4"', 3 / 4),
  arch('1"', 1),
  arch('1 1/2"', 1.5),
  arch('3"', 3),
  { id: 'arch-half', label: 'Half size (1:2)', group: 'Architectural', ratio: 2 },
  { id: 'arch-full', label: 'Full size (1:1)', group: 'Architectural', ratio: 1 },
  ...[10, 20, 30, 40, 50, 60, 100].map(eng),
  ...[5, 10, 20, 25, 50, 100, 200, 500, 1000].map(metric),
]

export const presetCalibration = (preset: ScalePreset): Calibration => ({
  ratio: preset.ratio,
  method: 'preset',
  presetId: preset.id,
})

/** Calibrate from two sheet points whose real distance is known. */
export function measuredCalibration(a: Vec2, b: Vec2, realMm: number): Calibration {
  const paperMm = distance(a, b) * PAPER_MM_PER_POINT
  if (paperMm <= 0) throw new Error('Pick two different points')
  if (!(realMm > 0)) throw new Error('Enter a length greater than zero')
  return { ratio: realMm / paperMm, method: 'measured' }
}

/** The preset closest to `ratio`, when within `tolerance` (fractional, default 1%). */
export function nearestPreset(ratio: number, tolerance = 0.01): ScalePreset | undefined {
  let best: ScalePreset | undefined
  let bestErr = Infinity
  for (const p of SCALE_PRESETS) {
    const err = Math.abs(p.ratio - ratio) / p.ratio
    if (err < bestErr) [best, bestErr] = [p, err]
  }
  return bestErr <= tolerance ? best : undefined
}

/** Human label: the preset name, "≈ preset (measured)", or a custom 1:N ratio. */
export function describeCalibration(cal: Calibration | undefined): string {
  if (!cal) return 'No scale'
  const exact = cal.presetId ? SCALE_PRESETS.find((p) => p.id === cal.presetId) : undefined
  if (exact) return exact.label
  const near = nearestPreset(cal.ratio)
  if (near) return `≈ ${near.label} (measured)`
  return `1:${cal.ratio >= 10 ? cal.ratio.toFixed(1) : cal.ratio.toFixed(3)} (measured)`
}

export const paperLengthMm = (points: number): number => points * PAPER_MM_PER_POINT
export const realLengthMm = (points: number, cal: Calibration): number =>
  points * PAPER_MM_PER_POINT * cal.ratio
