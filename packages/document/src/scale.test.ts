import { describe, expect, it } from 'vitest'
import {
  describeCalibration,
  measuredCalibration,
  nearestPreset,
  presetCalibration,
  realLengthMm,
  SCALE_PRESETS,
} from './scale'

const preset = (id: string) => SCALE_PRESETS.find((p) => p.id === id)!

describe('scale presets', () => {
  it('1/4" = 1\'-0" is 48:1', () => {
    expect(preset('arch-1/4"').ratio).toBe(48)
  })

  it('maps paper points to real millimeters', () => {
    // 4" of paper (288 pt) at 1/4" = 1'-0" is 16'-0" = 4876.8 mm.
    expect(realLengthMm(288, presetCalibration(preset('arch-1/4"')))).toBeCloseTo(4876.8, 9)
    expect(realLengthMm(72, presetCalibration(preset('metric-50')))).toBeCloseTo(1270, 9)
  })
})

describe('measured calibration', () => {
  it('derives the ratio from a known length', () => {
    const cal = measuredCalibration({ x: 72, y: 306 }, { x: 360, y: 306 }, 16 * 304.8)
    expect(cal.ratio).toBeCloseTo(48, 9)
    expect(describeCalibration(cal)).toBe(`≈ 1/4" = 1'-0" (measured)`)
  })

  it('handles half-size reprints as a custom ratio', () => {
    const cal = measuredCalibration({ x: 0, y: 0 }, { x: 144, y: 0 }, 16 * 304.8)
    expect(cal.ratio).toBeCloseTo(96, 9) // 1/4" plans printed at half size read as 1/8"
    expect(describeCalibration(cal)).toBe(`≈ 1/8" = 1'-0" (measured)`)
    const odd = measuredCalibration({ x: 0, y: 0 }, { x: 100, y: 0 }, 1234)
    expect(describeCalibration(odd)).toMatch(/^1:\d+\.\d \(measured\)$/)
  })

  it('rejects degenerate input', () => {
    expect(() => measuredCalibration({ x: 1, y: 1 }, { x: 1, y: 1 }, 100)).toThrow()
    expect(() => measuredCalibration({ x: 0, y: 0 }, { x: 9, y: 0 }, 0)).toThrow()
  })

  it('only matches presets within tolerance', () => {
    expect(nearestPreset(48.3)?.id).toBe('arch-1/4"')
    expect(nearestPreset(52)).toBeUndefined()
  })

  it('labels exact presets and missing scales', () => {
    expect(describeCalibration(presetCalibration(preset('eng-20')))).toBe(`1" = 20'`)
    expect(describeCalibration(undefined)).toBe('No scale')
  })
})
