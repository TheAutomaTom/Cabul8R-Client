/**
 * @cabul8r/pdf: pdf.js loading and rendering. Sheet space is pdf.js viewport space at scale 1
 * with the page's own rotation: PDF points, y-down, as the page is meant to be read.
 */
import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export type { PDFDocumentProxy, PDFPageProxy, RenderTask }

/** Where the host serves pdf.js data files (see `pdfjsAssets()` in `@cabul8r/pdf/vite`). */
const assetUrl = (dir: string) => new URL(`pdfjs/${dir}/`, document.baseURI).href

export interface PageInfo {
  index: number
  /** Width and height in points, after the page's own rotation. */
  width: number
  height: number
}

export async function openPdf(data: ArrayBuffer): Promise<PDFDocumentProxy> {
  return pdfjs.getDocument({
    data: new Uint8Array(data),
    cMapUrl: assetUrl('cmaps'),
    cMapPacked: true,
    standardFontDataUrl: assetUrl('standard_fonts'),
    wasmUrl: assetUrl('wasm'),
    iccUrl: assetUrl('iccs'),
  }).promise
}

export async function pageInfo(doc: PDFDocumentProxy, index: number): Promise<PageInfo> {
  const page = await doc.getPage(index + 1)
  const { width, height } = page.getViewport({ scale: 1 })
  return { index, width, height }
}

export const isCancelled = (e: unknown): boolean =>
  e instanceof Error && e.name === 'RenderingCancelledException'

/**
 * Render the part of `page` visible through a view into `canvas` (sized in device pixels).
 * `zoom` is device pixels per point; (x, y) is the device-pixel offset of the sheet origin.
 */
export function renderRegion(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  zoom: number,
  x: number,
  y: number,
): RenderTask {
  return page.render({
    canvas,
    viewport: page.getViewport({ scale: zoom }),
    transform: [1, 0, 0, 1, x, y],
  })
}

/** Text near the bottom-right of a page, where title blocks usually put the sheet number. */
export async function titleBlockText(page: PDFPageProxy): Promise<string> {
  const { width, height } = page.getViewport({ scale: 1 })
  const content = await page.getTextContent()
  const viewport = page.getViewport({ scale: 1 })
  return content.items
    .flatMap((item) => {
      if (!('str' in item) || !item.str.trim()) return []
      const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5])
      return x! > width * 0.6 && y! > height * 0.6 ? [item.str] : []
    })
    .join(' ')
}
