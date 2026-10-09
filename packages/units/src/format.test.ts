import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { formatLength, toFraction } from './format'
import { parseLength } from './parse'

const IN = 25.4

describe('toFraction', () => {
  it('reduces fractions', () => {
    expect(toFraction(1.5)).toEqual({ sign: 1, whole: 1, numerator: 1, denominator: 2 })
    expect(toFraction(0.0625)).toEqual({ sign: 1, whole: 0, numerator: 1, denominator: 16 })
    expect(toFraction(-2.75)).toEqual({ sign: -1, whole: 2, numerator: 3, denominator: 4 })
  })

  it('rounds to the nearest step', () => {
    expect(toFraction(1.999, 16)).toEqual({ sign: 1, whole: 2, numerator: 0, denominator: 1 })
    expect(toFraction(-0.001, 16)).toEqual({ sign: 1, whole: 0, numerator: 0, denominator: 1 })
  })
})

describe('formatLength', () => {
  it.each([
    [15.5 * IN, 'architectural', `1'-3 1/2"`],
    [12 * IN, 'architectural', `1'-0"`],
    [3.5 * IN, 'architectural', `3 1/2"`],
    [(11 + 63.9 / 64) * IN, 'architectural', `1'-0"`],
    [-15.5 * IN, 'architectural', `-1'-3 1/2"`],
    [0, 'architectural', `0"`],
    [15.5 * IN, 'fractional-inch', `15 1/2"`],
    [0.75 * IN, 'fractional-inch', `3/4"`],
    [15.5 * IN, 'decimal-inch', `15.50"`],
    [18 * IN, 'decimal-feet', `1.50'`],
    [1205.4, 'mm', '1205 mm'],
    [1205.4, 'cm', '120.5 cm'],
    [1205.4, 'm', '1.205 m'],
    [-0.0001, 'mm', '0 mm'],
  ] as const)('%d mm as %s → %s', (mm, style, expected) => {
    expect(formatLength(mm, { style })).toBe(expected)
  })

  it('shows zero feet when asked', () => {
    expect(formatLength(3.5 * IN, { style: 'architectural', showZeroFeet: true })).toBe(`0'-3 1/2"`)
  })

  it('honors a coarser denominator', () => {
    expect(formatLength((1 + 5 / 64) * IN, { style: 'fractional-inch', denominator: 16 })).toBe(
      `1 1/16"`,
    )
  })
})

describe('imperial ↔ metric round trip', () => {
  // Any length on the 1/64" grid must survive mm storage and come back as the same fraction.
  const sixtyFourths = fc.integer({ min: -100_000, max: 100_000 })

  it('fractional inches survive mm storage', () => {
    fc.assert(
      fc.property(sixtyFourths, (n) => {
        const mm = (n / 64) * IN
        const text = formatLength(mm, { style: 'fractional-inch' })
        const back = parseLength(text, { system: 'imperial' })
        return back.ok && Math.round((back.mm / IN) * 64) === n && Math.abs(back.mm - mm) < 1e-9
      }),
    )
  })

  it('architectural text survives mm storage', () => {
    fc.assert(
      fc.property(sixtyFourths, (n) => {
        const mm = (n / 64) * IN
        const text = formatLength(mm, { style: 'architectural' })
        const back = parseLength(text, { system: 'imperial' })
        return back.ok && Math.abs(back.mm - mm) < 1e-9
      }),
    )
  })
})
