import { MM_PER } from './units'

export type LengthStyle =
  | 'architectural' // 1'-3 1/2"
  | 'fractional-inch' // 15 1/2"
  | 'decimal-inch' // 15.5"
  | 'decimal-feet' // 1.29'
  | 'mm'
  | 'cm'
  | 'm'

export interface FormatOptions {
  style: LengthStyle
  /** Largest fraction denominator for fractional styles; a power of two. Default 64. */
  denominator?: number
  /** Decimal places for decimal and metric styles. Default 2 (0 for mm). */
  decimals?: number
  /** Architectural only: show 0' when under a foot (0'-3 1/2"). Default false. */
  showZeroFeet?: boolean
}

export interface Fraction {
  sign: 1 | -1
  whole: number
  numerator: number
  denominator: number
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

/** Round a value to the nearest 1/denominator and reduce the fraction. */
export function toFraction(value: number, denominator = 64): Fraction {
  const sign: 1 | -1 = value < 0 ? -1 : 1
  const steps = Math.round(Math.abs(value) * denominator)
  const whole = Math.floor(steps / denominator)
  let numerator = steps % denominator
  let den = denominator
  if (numerator === 0) den = 1
  else {
    const g = gcd(numerator, den)
    numerator /= g
    den /= g
  }
  return { sign: steps === 0 ? 1 : sign, whole, numerator, denominator: den }
}

const fractionText = (f: Pick<Fraction, 'whole' | 'numerator' | 'denominator'>): string => {
  if (f.numerator === 0) return String(f.whole)
  if (f.whole === 0) return `${f.numerator}/${f.denominator}`
  return `${f.whole} ${f.numerator}/${f.denominator}`
}

const trimDecimals = (n: number, decimals: number): string => {
  const text = n.toFixed(decimals)
  return text === `-${(0).toFixed(decimals)}` ? text.slice(1) : text
}

/** Format millimeters for display. */
export function formatLength(mm: number, options: FormatOptions): string {
  const denominator = options.denominator ?? 64
  switch (options.style) {
    case 'architectural': {
      // Round once at inch precision, then split feet and inches so 11 63.9/64" carries to 1'-0".
      const totalSteps = Math.round(Math.abs(mm / MM_PER.in) * denominator)
      const sign = mm < 0 && totalSteps > 0 ? '-' : ''
      const stepsPerFoot = 12 * denominator
      const feet = Math.floor(totalSteps / stepsPerFoot)
      const inches = toFraction((totalSteps % stepsPerFoot) / denominator, denominator)
      if (feet === 0 && !options.showZeroFeet) return `${sign}${fractionText(inches)}"`
      return `${sign}${feet}'-${fractionText(inches)}"`
    }
    case 'fractional-inch': {
      const f = toFraction(mm / MM_PER.in, denominator)
      return `${f.sign < 0 ? '-' : ''}${fractionText(f)}"`
    }
    case 'decimal-inch':
      return `${trimDecimals(mm / MM_PER.in, options.decimals ?? 2)}"`
    case 'decimal-feet':
      return `${trimDecimals(mm / MM_PER.ft, options.decimals ?? 2)}'`
    case 'mm':
      return `${trimDecimals(mm, options.decimals ?? 0)} mm`
    case 'cm':
      return `${trimDecimals(mm / MM_PER.cm, options.decimals ?? 1)} cm`
    case 'm':
      return `${trimDecimals(mm / MM_PER.m, options.decimals ?? 3)} m`
  }
}
