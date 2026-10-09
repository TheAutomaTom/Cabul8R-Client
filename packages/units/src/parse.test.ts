import { describe, expect, it } from 'vitest'
import { parseLength, type ParseOptions } from './parse'

const imperial: ParseOptions = { system: 'imperial' }
const metric: ParseOptions = { system: 'metric' }

/** Parse in imperial mode and return inches. */
const inches = (input: string): number => {
  const r = parseLength(input, imperial)
  if (!r.ok) throw new Error(`${input}: ${r.error} @${r.index}`)
  return r.mm / 25.4
}

describe('parseLength — imperial', () => {
  it.each([
    ['12', 12],
    ['1.25', 1.25],
    ['.5', 0.5],
    ['3/4', 0.75],
    ['1 1/2', 1.5],
    ['1.1/8', 1.125],
    ['1.15/16', 1 + 15 / 16],
    ['1.25+.5', 1.75],
    ['1.1/8*3', 3.375],
    ['1.1/8 * 3', 3.375],
    ['3*1.1/8', 3.375],
    ['(1+1/2)*2', 3],
    ['10/4', 2.5],
    ['-3/4', -0.75],
    ['2 - -1', 3],
    ['6"', 6],
    ['6in', 6],
    ['6 in', 6],
    ['6 inches', 6],
    ['6″', 6],
    ["1'", 12],
    ['1ft', 12],
    ['2 feet', 24],
    ["1'3", 15],
    ['1\'3"', 15],
    ['1\' 3"', 15],
    ['1\'-3"', 15],
    ['1\'-3 1/2"', 15.5],
    ["1'3.1/2", 15.5],
    ['1\'3.1/2"', 15.5],
    ['5ft 6in', 66],
    ['1\' - 3"', 9], // spaced hyphen is subtraction
    ['1\'-3" + 1.1/8', 16.125],
    ['(1\'6")/2', 9],
    ['(2+1)ft', 36],
    ["12'/4", 36],
    ['12\' / 6"', 24], // ratio, read in the default unit
    ['25.4mm', 1],
    ['1.5/2', 0.75], // improper fraction after the dot: decimal divided by 2
    ['1.25/2', 0.625],
    ['3 × 2', 6],
  ])('%s → %d in', (input, expected) => {
    expect(inches(input)).toBeCloseTo(expected, 10)
  })

  it('uses feet for bare numbers when asked', () => {
    const r = parseLength('2.1/2', { system: 'imperial', defaultUnit: 'ft' })
    expect(r.ok && r.mm).toBeCloseTo(2.5 * 304.8, 10)
  })
})

describe('parseLength — metric', () => {
  it.each([
    ['1200', 1200],
    ['1.2m', 1200],
    ['1m 20cm', 1200],
    ['1m 20cm 5mm', 1205],
    ['30cm', 300],
    ['100+50*2', 200],
    ['1"', 25.4],
  ])('%s → %d mm', (input, expected) => {
    const r = parseLength(input, metric)
    expect(r.ok && r.mm).toBeCloseTo(expected, 10)
  })
})

describe('parseLength — errors', () => {
  it.each([
    ['', 'Enter a length'],
    ['   ', 'Enter a length'],
    ['abc', 'Unknown unit "abc"'],
    ['1/0', 'Division by zero'],
    ['5/(2-2)', 'Division by zero'],
    ["1' * 2'", 'Cannot multiply two lengths'],
    ['2 / 1"', 'Cannot divide a number by a length'],
    ['(1+2', 'Missing ")"'],
    ['1 2', 'Unexpected input'],
    ['1+', 'Expected a number'],
    ['1m 20', 'Missing unit'],
    ['3" 1\'', 'Compound units must get smaller (e.g. 1\'3")'],
    ['1 # 2', 'Unexpected "#"'],
  ])('%j → %s', (input, error) => {
    const r = parseLength(input, imperial)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(error)
  })

  it('reports the error position in the original input', () => {
    const r = parseLength('  1 + #', imperial)
    expect(r).toEqual({ ok: false, error: 'Unexpected "#"', index: 6 })
  })
})
