/**
 * User-configurable object types and properties.
 *
 * Code refers to object types and properties only by stable ids. Every name a person sees
 * (type labels such as "Planset" and "Page", property labels, choice labels) comes from a
 * taxonomy that organizations can edit, and values are stored by property id. Renaming
 * anything therefore never rewrites data. Defaults ship as importable modules.
 */

export type PropertyType = 'text' | 'number' | 'length' | 'date' | 'boolean' | 'choice'

export interface Choice {
  id: string
  label: string
}

export interface PropertyDefinition {
  id: string
  label: string
  type: PropertyType
  description?: string
  choices?: Choice[]
}

export interface ObjectTypeDefinition {
  /** Stable id used by code; never shown. */
  id: string
  label: string
  pluralLabel: string
  properties: PropertyDefinition[]
}

/** A shareable bundle of type and property definitions, e.g. a best-practice starter set. */
export interface TaxonomyModule {
  id: string
  name: string
  version: string
  description: string
  objectTypes: ObjectTypeDefinition[]
}

/** Property values keyed by property id. */
export type PropertyValues = Record<string, string | number | boolean | null>

/** Object types the app itself depends on. Organizations relabel them; they cannot remove them. */
export const CORE_TYPES = { planset: 'planset', page: 'page' } as const

/** Disciplines per the US National CAD Standard sheet-identification convention. */
const NCS_DISCIPLINES: Choice[] = [
  ['G', 'General'],
  ['H', 'Hazardous Materials'],
  ['V', 'Survey/Mapping'],
  ['B', 'Geotechnical'],
  ['W', 'Civil Works'],
  ['C', 'Civil'],
  ['L', 'Landscape'],
  ['S', 'Structural'],
  ['A', 'Architectural'],
  ['I', 'Interiors'],
  ['Q', 'Equipment'],
  ['F', 'Fire Protection'],
  ['P', 'Plumbing'],
  ['D', 'Process'],
  ['M', 'Mechanical'],
  ['E', 'Electrical'],
  ['T', 'Telecommunications'],
  ['R', 'Resource'],
  ['X', 'Other Disciplines'],
  ['Z', 'Contractor/Shop Drawings'],
  ['O', 'Operations'],
].map(([id, label]) => ({ id: id!, label: label! }))

export const CORE_MODULE: TaxonomyModule = {
  id: 'cabul8r.core',
  name: 'Cabul8R defaults',
  version: '1.0.0',
  description:
    'Plansets and pages with sheet identification based on the US National CAD Standard.',
  objectTypes: [
    {
      id: CORE_TYPES.planset,
      label: 'Planset',
      pluralLabel: 'Plansets',
      properties: [
        {
          id: 'planset.issue',
          label: 'Issue',
          type: 'text',
          description: 'e.g. Bid Set, IFC, Addendum 2',
        },
        { id: 'planset.issueDate', label: 'Issue Date', type: 'date' },
        { id: 'planset.architect', label: 'Architect', type: 'text' },
      ],
    },
    {
      id: CORE_TYPES.page,
      label: 'Page',
      pluralLabel: 'Pages',
      properties: [
        { id: 'page.sheetNumber', label: 'Sheet Number', type: 'text', description: 'e.g. A-101' },
        { id: 'page.sheetTitle', label: 'Sheet Title', type: 'text' },
        { id: 'page.discipline', label: 'Discipline', type: 'choice', choices: NCS_DISCIPLINES },
        { id: 'page.revision', label: 'Revision', type: 'text' },
      ],
    },
  ],
}

/** The active taxonomy: modules merged in order, later modules overriding labels and adding properties. */
export class Taxonomy {
  private readonly types = new Map<string, ObjectTypeDefinition>()

  constructor(modules: TaxonomyModule[] = [CORE_MODULE]) {
    for (const m of modules) this.import(m)
  }

  import(module: TaxonomyModule): void {
    for (const t of module.objectTypes) {
      const existing = this.types.get(t.id)
      if (!existing) {
        this.types.set(t.id, structuredClone(t))
        continue
      }
      existing.label = t.label
      existing.pluralLabel = t.pluralLabel
      for (const p of t.properties) {
        const i = existing.properties.findIndex((q) => q.id === p.id)
        if (i >= 0) existing.properties[i] = structuredClone(p)
        else existing.properties.push(structuredClone(p))
      }
    }
  }

  type(id: string): ObjectTypeDefinition {
    const t = this.types.get(id)
    if (!t) throw new Error(`Unknown object type: ${id}`)
    return t
  }

  label(typeId: string, plural = false): string {
    const t = this.type(typeId)
    return plural ? t.pluralLabel : t.label
  }

  property(typeId: string, propertyId: string): PropertyDefinition | undefined {
    return this.type(typeId).properties.find((p) => p.id === propertyId)
  }
}

/** Guess NCS fields from a sheet number like "A-101" or "M2.03". */
export function parseSheetNumber(
  text: string,
): { sheetNumber: string; discipline?: string } | undefined {
  const m = /\b([A-Z]{1,2})[-. ]?(\d{1,3}(?:[.-]\d{1,3})?[A-Z]?)\b/.exec(text.toUpperCase())
  if (!m) return undefined
  const discipline = NCS_DISCIPLINES.find((d) => d.id === m[1]![0])?.id
  return { sheetNumber: `${m[1]}-${m[2]}`, ...(discipline ? { discipline } : {}) }
}
