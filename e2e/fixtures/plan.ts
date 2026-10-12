import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

/** Letter-landscape sheet, in PDF points. */
export const SHEET = { width: 792, height: 612 }
/**
 * A 4" line (288 pt) drawn at 1/4" = 1'-0", so it represents 16'-0".
 * Coordinates are sheet space (y-down), which is what the app stores.
 */
export const KNOWN_LINE = { a: { x: 72, y: 306 }, b: { x: 360, y: 306 }, realFeet: 16 }

const DEFAULT_SHEETS: readonly (readonly [string, string])[] = [
  ['A-101', 'FLOOR PLAN'],
  ['A-102', 'REFLECTED CEILING PLAN'],
]

/**
 * Write a planset with known dimensions and one page per [sheet number, title] pair
 * (default: A-101 and A-102). `solid` adds a large filled block so a different file looks different.
 */
export async function writePlanFixture(
  path: string,
  sheets: readonly (readonly [string, string])[] = DEFAULT_SHEETS,
  options: { solid?: boolean } = {},
): Promise<string> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  for (const [n, title] of sheets) {
    const page = pdf.addPage([SHEET.width, SHEET.height])
    const y = (sheetY: number) => SHEET.height - sheetY // pdf-lib is y-up
    page.drawRectangle({
      x: 18,
      y: 18,
      width: 756,
      height: 576,
      borderWidth: 1.5,
      borderColor: rgb(0, 0, 0),
    })
    page.drawLine({
      start: { x: KNOWN_LINE.a.x, y: y(KNOWN_LINE.a.y) },
      end: { x: KNOWN_LINE.b.x, y: y(KNOWN_LINE.b.y) },
      thickness: 2,
    })
    page.drawText(`16'-0"`, { x: 196, y: y(296), size: 10, font })
    if (options.solid)
      page.drawRectangle({ x: 100, y: y(500), width: 300, height: 200, color: rgb(0, 0, 0) })
    page.drawRectangle({
      x: 560,
      y: 18,
      width: 214,
      height: 90,
      borderWidth: 1,
      borderColor: rgb(0, 0, 0),
    })
    page.drawText(title, { x: 572, y: 80, size: 11, font: bold })
    page.drawText(`SCALE: 1/4" = 1'-0"`, { x: 572, y: 62, size: 9, font })
    page.drawText(n, { x: 690, y: 30, size: 22, font: bold })
  }
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, await pdf.save())
  return path
}
