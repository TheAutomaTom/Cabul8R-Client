import { defineStore } from 'pinia'
import { distance, type Vec2 } from '@cabul8r/geometry'
import {
  CORE_TYPES,
  Taxonomy,
  paperLengthMm,
  parseSheetNumber,
  realLengthMm,
  type Calibration,
  type PropertyValues,
} from '@cabul8r/document'
import { openPdf, pageInfo, titleBlockText, type PDFDocumentProxy } from '@cabul8r/pdf'

/** The active taxonomy. Editing it in the UI arrives with the configuration milestone. */
export const taxonomy = new Taxonomy()

export interface Planset {
  id: string
  type: typeof CORE_TYPES.planset
  fileName: string
  pageIds: string[]
  props: PropertyValues
}

export interface Page {
  id: string
  type: typeof CORE_TYPES.page
  plansetId: string
  /** Zero-based page index in the PDF. */
  index: number
  /** Size in PDF points as displayed. */
  width: number
  height: number
  calibration?: Calibration
  props: PropertyValues
}

export interface Measurement {
  id: string
  pageId: string
  a: Vec2
  b: Vec2
}

/** PDF documents are large and not reactive; keep them out of the store. */
const documents = new Map<string, PDFDocumentProxy>()

let nextId = 1
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${nextId++}`

export const usePlans = defineStore('plans', {
  state: () => ({
    plansets: [] as Planset[],
    pages: {} as Record<string, Page>,
    measurements: [] as Measurement[],
  }),
  getters: {
    page:
      (s) =>
      (id: string): Page | undefined =>
        s.pages[id],
    planset: (s) => (id: string) => s.plansets.find((p) => p.id === id),
    pageName(): (id: string) => string {
      return (id) => {
        const page = this.pages[id]
        if (!page) return ''
        const number = page.props['page.sheetNumber']
        if (typeof number === 'string' && number) return number
        const set = this.planset(page.plansetId)
        const base = set?.fileName.replace(/\.pdf$/i, '') ?? 'Page'
        return set && set.pageIds.length > 1 ? `${base} · ${page.index + 1}` : base
      }
    },
    measurementsFor: (s) => (pageId: string) => s.measurements.filter((m) => m.pageId === pageId),
  },
  actions: {
    async importPdf(fileName: string, data: ArrayBuffer): Promise<Planset> {
      const doc = await openPdf(data)
      const planset: Planset = {
        id: newId('planset'),
        type: CORE_TYPES.planset,
        fileName,
        pageIds: [],
        props: {},
      }
      documents.set(planset.id, doc)
      for (let index = 0; index < doc.numPages; index++) {
        const info = await pageInfo(doc, index)
        const page: Page = {
          id: newId('page'),
          type: CORE_TYPES.page,
          plansetId: planset.id,
          index,
          width: info.width,
          height: info.height,
          props: {},
        }
        this.pages[page.id] = page
        planset.pageIds.push(page.id)
      }
      this.plansets.push(planset)
      void this.detectSheetNumbers(planset.id)
      return this.planset(planset.id)!
    },

    /** Fill Sheet Number and Discipline from title blocks, in the background. */
    async detectSheetNumbers(plansetId: string) {
      const set = this.planset(plansetId)
      const doc = documents.get(plansetId)
      if (!set || !doc) return
      for (const pageId of set.pageIds) {
        const page = this.pages[pageId]
        if (!page || page.props['page.sheetNumber']) continue
        try {
          const found = parseSheetNumber(await titleBlockText(await doc.getPage(page.index + 1)))
          if (!found) continue
          page.props['page.sheetNumber'] = found.sheetNumber
          if (found.discipline) page.props['page.discipline'] = found.discipline
        } catch {
          // A page without extractable text keeps its file-based name.
        }
      }
    },

    async pdfPage(pageId: string) {
      const page = this.pages[pageId]
      const doc = page && documents.get(page.plansetId)
      if (!page || !doc) throw new Error(`Page not loaded: ${pageId}`)
      return doc.getPage(page.index + 1)
    },

    setCalibration(pageId: string, calibration: Calibration | undefined) {
      const page = this.pages[pageId]
      if (!page) return
      if (calibration) page.calibration = calibration
      else delete page.calibration
    },

    addMeasurement(pageId: string, a: Vec2, b: Vec2): Measurement {
      const m: Measurement = { id: newId('measure'), pageId, a, b }
      this.measurements.push(m)
      return m
    },

    removeMeasurement(id: string) {
      this.measurements = this.measurements.filter((m) => m.id !== id)
    },

    clearMeasurements(pageId: string) {
      this.measurements = this.measurements.filter((m) => m.pageId !== pageId)
    },
  },
})

/** Drawn (paper) and scaled (real) length of a measurement, in millimeters. */
export function measure(page: Page, m: Pick<Measurement, 'a' | 'b'>) {
  const points = distance(m.a, m.b)
  return {
    paperMm: paperLengthMm(points),
    realMm: page.calibration ? realLengthMm(points, page.calibration) : undefined,
  }
}
