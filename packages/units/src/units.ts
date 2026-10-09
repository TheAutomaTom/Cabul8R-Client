/** Canonical real-world length unit for Cabul8R is the millimeter. */
export type LengthUnit = 'in' | 'ft' | 'mm' | 'cm' | 'm'

export type UnitSystem = 'imperial' | 'metric'

/** Exact millimeters per unit (1 in = 25.4 mm by definition). */
export const MM_PER: Readonly<Record<LengthUnit, number>> = {
  in: 25.4,
  ft: 304.8,
  mm: 1,
  cm: 10,
  m: 1000,
}

export const DEFAULT_UNIT: Readonly<Record<UnitSystem, LengthUnit>> = {
  imperial: 'in',
  metric: 'mm',
}

export const toMm = (value: number, unit: LengthUnit): number => value * MM_PER[unit]
export const fromMm = (mm: number, unit: LengthUnit): number => mm / MM_PER[unit]
