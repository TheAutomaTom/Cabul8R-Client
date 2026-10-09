import { defineStore } from 'pinia'
import type { LengthStyle, UnitSystem } from '@cabul8r/units'

/** Display preferences. Stored geometry is always metric; these only affect input and display. */
export const useSettings = defineStore('settings', {
  state: () => ({
    system: 'imperial' as UnitSystem,
    imperialStyle: 'architectural' as LengthStyle,
    metricStyle: 'mm' as LengthStyle,
    /** Smallest displayed inch fraction (1/denominator). */
    denominator: 64,
  }),
  getters: {
    lengthStyle: (s): LengthStyle => (s.system === 'imperial' ? s.imperialStyle : s.metricStyle),
    /** Arrow-key nudge step in mm: 1/16" or 1 mm. */
    nudgeMm: (s): number => (s.system === 'imperial' ? 25.4 / 16 : 1),
  },
  actions: {
    toggleSystem() {
      this.system = this.system === 'imperial' ? 'metric' : 'imperial'
    },
  },
})
