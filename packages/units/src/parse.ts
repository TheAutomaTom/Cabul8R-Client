import { DEFAULT_UNIT, MM_PER, type LengthUnit, type UnitSystem } from './units'

/**
 * Length expression parser for dimension input boxes.
 *
 * Accepted forms (all may be combined with + - * / and parentheses):
 *   12  1.25  .5            plain numbers (bare numbers use the default unit)
 *   3/4                     fraction literal
 *   1 1/2                   mixed number (space separated)
 *   1.1/8                   dotted mixed number = 1 + 1/8, only when N/D is a proper fraction;
 *                           otherwise it is a decimal divided by an integer (1.5/2 = 0.75)
 *   5' 5ft 6" 6in 20mm 2cm 1.2m        unit suffixes (also ′ and ″)
 *   1'3  1'3"  1'-3 1/2"  1'3.1/2  5ft 6in  1m 20cm   compound quantities
 *
 * A hyphen directly after a feet mark (1'-3") separates feet from inches; with spaces
 * around it (1' - 3") it is subtraction.
 */

export interface ParseOptions {
  /** Picks the default unit for bare numbers when `defaultUnit` is not given. */
  system: UnitSystem
  defaultUnit?: LengthUnit
}

export type ParseResult = { ok: true; mm: number } | { ok: false; error: string; index: number }

export class LengthParseError extends Error {
  constructor(
    message: string,
    readonly index: number,
  ) {
    super(message)
  }
}

type Token =
  | {
      kind: 'num'
      value: number
      form: 'int' | 'decimal' | 'fraction' | 'mixed'
      at: number
      spaced: boolean
    }
  | { kind: 'unit'; unit: LengthUnit; at: number; spaced: boolean }
  | { kind: 'op'; op: '+' | '-' | '*' | '/'; at: number; spaced: boolean }
  | { kind: 'lparen' | 'rparen' | 'end'; at: number; spaced: boolean }

const UNIT_WORDS: Readonly<Record<string, LengthUnit>> = {
  in: 'in',
  inch: 'in',
  inches: 'in',
  ft: 'ft',
  foot: 'ft',
  feet: 'ft',
  mm: 'mm',
  cm: 'cm',
  m: 'm',
}

const UNIT_MARKS: Readonly<Record<string, LengthUnit>> = {
  "'": 'ft',
  '′': 'ft',
  '"': 'in',
  '″': 'in',
}

const isDigit = (c: string | undefined): boolean => c !== undefined && c >= '0' && c <= '9'
const isLetter = (c: string | undefined): boolean => c !== undefined && /[a-z]/i.test(c)

function tokenize(src: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  let spaced = false

  const readDigits = (): string => {
    const start = i
    while (isDigit(src[i])) i++
    return src.slice(start, i)
  }

  while (i < src.length) {
    const c = src[i]!
    if (/\s/.test(c)) {
      spaced = true
      i++
      continue
    }
    const at = i

    if (isDigit(c) || (c === '.' && isDigit(src[i + 1]))) {
      const whole = readDigits()
      let frac: string | undefined
      if (src[i] === '.') {
        i++
        frac = readDigits()
      }
      // Fraction literal: N/D or W.N/D, with no whitespace around the slash.
      if (src[i] === '/' && isDigit(src[i + 1]) && whole !== '') {
        const save = i
        i++
        const den = readDigits()
        const d = Number(den)
        if (frac === undefined) {
          if (d === 0) throw new LengthParseError('Division by zero', save)
          tokens.push({ kind: 'num', value: Number(whole) / d, form: 'fraction', at, spaced })
          spaced = false
          continue
        }
        const n = Number(frac)
        if (frac !== '' && n > 0 && n < d) {
          tokens.push({ kind: 'num', value: Number(whole) + n / d, form: 'mixed', at, spaced })
          spaced = false
          continue
        }
        i = save // not a proper fraction: decimal followed by a division operator
      }
      const text = frac === undefined ? whole : `${whole || '0'}.${frac || '0'}`
      tokens.push({
        kind: 'num',
        value: Number(text),
        form: frac === undefined ? 'int' : 'decimal',
        at,
        spaced,
      })
      spaced = false
      continue
    }

    if (c in UNIT_MARKS) {
      tokens.push({ kind: 'unit', unit: UNIT_MARKS[c]!, at, spaced })
      i++
      spaced = false
      continue
    }

    if (isLetter(c)) {
      const start = i
      while (isLetter(src[i])) i++
      const word = src.slice(start, i).toLowerCase()
      const unit = UNIT_WORDS[word]
      if (!unit) throw new LengthParseError(`Unknown unit "${src.slice(start, i)}"`, start)
      tokens.push({ kind: 'unit', unit, at, spaced })
      spaced = false
      continue
    }

    if (c === '+' || c === '-' || c === '*' || c === '/' || c === '×') {
      const op = c === '×' ? '*' : (c as '+' | '-' | '*' | '/')
      tokens.push({ kind: 'op', op, at, spaced })
      i++
      spaced = false
      continue
    }
    if (c === '(' || c === ')') {
      tokens.push({ kind: c === '(' ? 'lparen' : 'rparen', at, spaced })
      i++
      spaced = false
      continue
    }
    throw new LengthParseError(`Unexpected "${c}"`, i)
  }
  tokens.push({ kind: 'end', at: src.length, spaced })
  return tokens
}

/** A value during evaluation: a length in mm, or a unitless scalar. */
interface Value {
  v: number
  length: boolean
}

class Parser {
  private pos = 0

  constructor(
    private readonly tokens: Token[],
    private readonly defaultMm: number,
  ) {}

  parse(): number {
    const result = this.expr()
    const t = this.peek()
    if (t.kind !== 'end') throw new LengthParseError('Unexpected input', t.at)
    const mm = result.length ? result.v : result.v * this.defaultMm
    if (!Number.isFinite(mm)) throw new LengthParseError('Result is not a finite number', 0)
    return mm
  }

  private peek(offset = 0): Token {
    return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)]!
  }

  private next(): Token {
    return this.tokens[this.pos++]!
  }

  private asLength(x: Value): number {
    return x.length ? x.v : x.v * this.defaultMm
  }

  private expr(): Value {
    let left = this.term()
    for (;;) {
      const t = this.peek()
      if (t.kind !== 'op' || (t.op !== '+' && t.op !== '-')) return left
      this.next()
      const right = this.term()
      const sign = t.op === '+' ? 1 : -1
      if (!left.length && !right.length) left = { v: left.v + sign * right.v, length: false }
      else left = { v: this.asLength(left) + sign * this.asLength(right), length: true }
    }
  }

  private term(): Value {
    let left = this.factor()
    for (;;) {
      const t = this.peek()
      if (t.kind !== 'op' || (t.op !== '*' && t.op !== '/')) return left
      this.next()
      const right = this.factor()
      if (t.op === '*') {
        if (left.length && right.length)
          throw new LengthParseError('Cannot multiply two lengths', t.at)
        left = { v: left.v * right.v, length: left.length || right.length }
      } else {
        if (right.v === 0) throw new LengthParseError('Division by zero', t.at)
        if (!left.length && right.length)
          throw new LengthParseError('Cannot divide a number by a length', t.at)
        // length / length is a ratio; length / number stays a length
        left = { v: left.v / right.v, length: left.length && !right.length }
      }
    }
  }

  private factor(): Value {
    const t = this.peek()
    if (t.kind === 'op' && (t.op === '-' || t.op === '+')) {
      this.next()
      const inner = this.factor()
      return t.op === '-' ? { v: -inner.v, length: inner.length } : inner
    }
    return this.primary()
  }

  private primary(): Value {
    const t = this.next()
    if (t.kind === 'lparen') {
      const inner = this.expr()
      const close = this.next()
      if (close.kind !== 'rparen') throw new LengthParseError('Missing ")"', close.at)
      const unit = this.peek()
      if (unit.kind === 'unit' && !inner.length) {
        this.next()
        return { v: inner.v * MM_PER[unit.unit], length: true }
      }
      return inner
    }
    if (t.kind === 'num') return this.quantity(t)
    throw new LengthParseError('Expected a number', t.at)
  }

  /** A number, an optional spaced fraction (mixed number), and an optional unit. */
  private number(first: Extract<Token, { kind: 'num' }>): number {
    let value = first.value
    const t = this.peek()
    if (first.form === 'int' && t.kind === 'num' && t.form === 'fraction' && t.spaced) {
      this.next()
      value += t.value
    }
    return value
  }

  private quantity(first: Extract<Token, { kind: 'num' }>): Value {
    const value = this.number(first)
    const unitTok = this.peek()
    if (unitTok.kind !== 'unit') return { v: value, length: false }
    this.next()
    let mm = value * MM_PER[unitTok.unit]
    let lastUnit = unitTok.unit

    // Compound quantity: 1'3", 1'-3 1/2", 5ft 6in, 1m 20cm
    for (;;) {
      const t = this.peek()
      let numTok: Token | undefined
      if (t.kind === 'num') {
        numTok = t
      } else if (
        lastUnit === 'ft' &&
        t.kind === 'op' &&
        t.op === '-' &&
        !t.spaced &&
        this.peek(1).kind === 'num' &&
        !this.peek(1).spaced
      ) {
        this.next() // feet-inches separator hyphen
        numTok = this.peek()
      }
      if (!numTok || numTok.kind !== 'num') break
      this.next()
      const part = this.number(numTok)
      const u = this.peek()
      let unit: LengthUnit
      if (u.kind === 'unit') {
        this.next()
        unit = u.unit
      } else if (lastUnit === 'ft') {
        unit = 'in'
      } else {
        throw new LengthParseError('Missing unit', numTok.at)
      }
      if (MM_PER[unit] >= MM_PER[lastUnit])
        throw new LengthParseError('Compound units must get smaller (e.g. 1\'3")', u.at)
      mm += part * MM_PER[unit]
      lastUnit = unit
    }
    return { v: mm, length: true }
  }
}

/** Parse a length expression to millimeters. Throws {@link LengthParseError}. */
export function parseLengthOrThrow(input: string, options: ParseOptions): number {
  const trimmed = input.trim()
  if (trimmed === '') throw new LengthParseError('Enter a length', 0)
  const unit = options.defaultUnit ?? DEFAULT_UNIT[options.system]
  return new Parser(tokenize(trimmed), MM_PER[unit]).parse()
}

/** Parse a length expression to millimeters, returning an error instead of throwing. */
export function parseLength(input: string, options: ParseOptions): ParseResult {
  try {
    return { ok: true, mm: parseLengthOrThrow(input, options) }
  } catch (e) {
    if (e instanceof LengthParseError) {
      const offset = input.length - input.trimStart().length
      return { ok: false, error: e.message, index: e.index + offset }
    }
    throw e
  }
}
