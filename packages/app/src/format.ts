import { formatLength } from '@cabul8r/units'
import { useSettings } from './settings'

/** Format a real-world length with the user's display settings. */
export function useLengthFormat() {
  const settings = useSettings()
  return {
    real: (mm: number) =>
      formatLength(mm, { style: settings.lengthStyle, denominator: settings.denominator }),
    /** Paper lengths read best as plain inches or millimeters. */
    paper: (mm: number) =>
      settings.system === 'imperial'
        ? formatLength(mm, { style: 'fractional-inch', denominator: settings.denominator })
        : formatLength(mm, { style: 'mm', decimals: 1 }),
  }
}
