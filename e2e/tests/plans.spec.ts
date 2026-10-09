import {
  _electron as electron,
  expect,
  test,
  type ElectronApplication,
  type Page,
} from '@playwright/test'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { KNOWN_LINE, writePlanFixture } from '../fixtures/plan'

const here = dirname(fileURLToPath(import.meta.url))
const desktopDir = join(here, '../../apps/desktop')
const electronPath = createRequire(import.meta.url)('electron') as unknown as string
const mod = process.platform === 'darwin' ? 'Meta' : 'Control'

let app: ElectronApplication
let page: Page

test.beforeAll(async () => {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      (e): e is [string, string] => e[0] !== 'ELECTRON_RUN_AS_NODE' && e[1] !== undefined,
    ),
  )
  app = await electron.launch({ executablePath: electronPath, args: [desktopDir], env })
  page = await app.firstWindow()
  await page.waitForSelector('.workbench')
})

test.afterAll(async () => {
  await app?.close()
})

/** Screen position of a sheet-space point on the page canvas. */
async function screenPoint(p: { x: number; y: number }) {
  const canvas = page.getByTestId('page-canvas')
  const view = JSON.parse((await canvas.getAttribute('data-view'))!) as {
    zoom: number
    x: number
    y: number
  }
  const box = (await canvas.boundingBox())!
  return { x: box.x + p.x * view.zoom + view.x, y: box.y + p.y * view.zoom + view.y }
}

async function clickSheet(p: { x: number; y: number }) {
  const s = await screenPoint(p)
  await page.mouse.click(s.x, s.y)
}

test('opens a planset, calibrates a page and measures drawn vs. scaled length', async () => {
  const pdfPath = await writePlanFixture(join(here, '../test-results/fixture-plan.pdf'))
  // Answer the native Open dialog with the fixture.
  await app.evaluate(({ dialog }, path) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] })
  }, pdfPath)

  await page.keyboard.press(`${mod}+O`)

  // Pages are listed and named from their title blocks; the first one opens and renders.
  const pages = page.getByRole('treeitem')
  await expect(pages).toHaveCount(2)
  await expect(pages.nth(0)).toContainText('A-101')
  await expect(pages.nth(1)).toContainText('A-102')
  await expect(page.getByRole('tab', { name: /A-101/ })).toBeVisible()
  const canvas = page.getByTestId('page-canvas')
  await expect(canvas).toHaveAttribute('data-rendered', 'true')
  const inked = await canvas.evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
    let n = 0
    for (let i = 0; i < d.length; i += 4)
      if (d[i]! < 90 && d[i + 1]! < 90 && d[i + 2]! < 90 && d[i + 3]! > 200) n++
    return n
  })
  expect(inked).toBeGreaterThan(500)
  await expect(page.getByTestId('page-scale')).toHaveText(/No scale/)

  // Calibrate: draw over the known 4" line and say it is 16'.
  await page.keyboard.press('k')
  await clickSheet(KNOWN_LINE.a)
  await clickSheet(KNOWN_LINE.b)
  const known = page.getByTestId('calibrate-popover').getByLabel('Known length')
  // The test window may lack OS focus, so check the DOM's active element rather than toBeFocused().
  await expect.poll(() => known.evaluate((el) => el === document.activeElement)).toBe(true)
  await known.fill(`16'`)
  await expect(page.getByTestId('calibrate-popover')).toContainText('= 16\'-0"')
  await known.press('Enter')
  await expect(page.getByTestId('page-scale')).toHaveText(/1\/4" = 1'-0"/)
  await expect(pages.nth(0)).toContainText(`1/4" = 1'-0"`)

  // The tool switches to Measure: the same line now reads 16'-0" scaled, 4" drawn.
  await clickSheet(KNOWN_LINE.a)
  await clickSheet(KNOWN_LINE.b)
  const table = page.getByTestId('takeoff-table')
  await expect(table).toContainText(`16'-0"`)
  await expect(table).toContainText(`4"`)
  await page.screenshot({ path: 'test-results/plans-measured.png' })

  // A preset scale applies through the quick pick, and metric display converts the same data.
  await page.getByTestId('page-scale').click()
  const pick = page.getByRole('dialog')
  await pick.getByRole('textbox').fill('1/8')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('page-scale')).toHaveText(`1/8" = 1'-0"`)
  await expect(table).toContainText(`32'-0"`)
  await page.getByRole('button', { name: /Imperial/ }).click()
  await expect(table).toContainText('9754 mm')
  await page.getByRole('button', { name: /Metric/ }).click()
})

test('zooms around the cursor and fits the page', async () => {
  const canvas = page.getByTestId('page-canvas')
  const before = JSON.parse((await canvas.getAttribute('data-view'))!)
  const s = await screenPoint(KNOWN_LINE.a)
  await page.mouse.move(s.x, s.y)
  await page.mouse.wheel(0, -400)
  const after = JSON.parse((await canvas.getAttribute('data-view'))!)
  expect(after.zoom).toBeGreaterThan(before.zoom * 1.5)
  // The point under the cursor stays put.
  const s2 = await screenPoint(KNOWN_LINE.a)
  expect(Math.abs(s2.x - s.x)).toBeLessThan(1)
  expect(Math.abs(s2.y - s.y)).toBeLessThan(1)
  await page.keyboard.press(`${mod}+0`)
  await expect
    .poll(async () => JSON.parse((await canvas.getAttribute('data-view'))!).zoom)
    .toBeCloseTo(before.zoom, 5)
})
