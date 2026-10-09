import { describe, expect, it } from 'vitest'
import {
  CORE_MODULE,
  CORE_TYPES,
  Taxonomy,
  parseSheetNumber,
  type TaxonomyModule,
} from './taxonomy'

describe('Taxonomy', () => {
  it('ships Planset and Page by default', () => {
    const t = new Taxonomy()
    expect(t.label(CORE_TYPES.planset)).toBe('Planset')
    expect(t.label(CORE_TYPES.page, true)).toBe('Pages')
    expect(t.property('page', 'page.sheetNumber')?.label).toBe('Sheet Number')
  })

  it('lets an imported module relabel types and add properties without changing ids', () => {
    const shop: TaxonomyModule = {
      id: 'acme.millwork',
      name: 'Acme Millwork',
      version: '1.0.0',
      description: 'Our terms',
      objectTypes: [
        {
          id: 'page',
          label: 'Drawing',
          pluralLabel: 'Drawings',
          properties: [
            { id: 'page.sheetNumber', label: 'Dwg No.', type: 'text' },
            { id: 'acme.page.room', label: 'Room', type: 'text' },
          ],
        },
      ],
    }
    const t = new Taxonomy([CORE_MODULE, shop])
    expect(t.label('page')).toBe('Drawing')
    expect(t.property('page', 'page.sheetNumber')?.label).toBe('Dwg No.')
    expect(t.property('page', 'acme.page.room')?.type).toBe('text')
    expect(t.property('page', 'page.discipline')?.type).toBe('choice') // defaults survive
    expect(new Taxonomy().label('page')).toBe('Page') // the shipped module is untouched
  })
})

describe('parseSheetNumber', () => {
  it.each([
    ['A-101', { sheetNumber: 'A-101', discipline: 'A' }],
    ['Sheet m2.03 Mechanical', { sheetNumber: 'M-2.03', discipline: 'M' }],
    ['ID-201', { sheetNumber: 'ID-201', discipline: 'I' }],
  ])('%s', (text, expected) => {
    expect(parseSheetNumber(text)).toEqual(expected)
  })

  it('returns undefined without a sheet number', () => {
    expect(parseSheetNumber('floor plan')).toBeUndefined()
  })
})
