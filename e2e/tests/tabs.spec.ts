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
import { writePlanFixture } from '../fixtures/plan'

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

/** Every open page keeps its own (hidden) editor, so match only the one on screen. */
const visible = (testId: string) => page.getByTestId(testId).filter({ visible: true })

/** Answer the next native Open dialog with `path`, then open it with Ctrl+O. */
async function openPdf(path: string) {
  await app.evaluate(({ dialog }, p) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [p] })
  }, path)
  await page.keyboard.press(`${mod}+O`)
}

/** Activate a page by its tab and describe what is actually drawn on screen. */
async function show(tab: RegExp) {
  await page.getByRole('tab', { name: tab }).click()
  const canvas = visible('page-canvas')
  await expect(canvas).toHaveCount(1)
  await expect(canvas).toHaveAttribute('data-rendered', 'true')
  return canvas.evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
    let hash = 2166136261
    for (let i = 0; i < d.length; i += 4)
      hash = Math.imul(hash ^ d[i]! ^ (d[i + 1]! << 8) ^ (d[i + 2]! << 16), 16777619)
    return { pageId: c.dataset.pageId!, hash }
  })
}

test('each tab shows its own page and remembers its own view', async () => {
  const dir = join(here, '../test-results')
  await openPdf(await writePlanFixture(join(dir, 'tabs-a.pdf'))) // A-101, A-102
  await expect(page.getByRole('tab', { name: /A-101/ })).toBeVisible()
  // A second PDF opened while the first is still open.
  await openPdf(
    await writePlanFixture(join(dir, 'tabs-b.pdf'), [['B-201', 'DETAIL']], { solid: true }),
  )
  await expect(page.getByRole('tab', { name: /B-201/ })).toBeVisible()
  // And another page of the first, from the explorer.
  await page.getByRole('treeitem').filter({ hasText: 'A-102' }).click()
  await expect(page.getByRole('tab', { name: /A-102/ })).toBeVisible()

  const a1 = await show(/A-101/)
  const a2 = await show(/A-102/)
  const b1 = await show(/B-201/)
  expect(new Set([a1.pageId, a2.pageId, b1.pageId]).size).toBe(3)
  expect(new Set([a1.hash, a2.hash, b1.hash]).size).toBe(3)

  // Switching back shows the same page again, not whichever was opened last.
  expect(await show(/A-101/)).toEqual(a1)
  expect(await show(/A-102/)).toEqual(a2)
  expect(await show(/B-201/)).toEqual(b1)

  // Zooming one page leaves the others' views alone.
  const zoom = () => visible('zoom').textContent()
  const zoomIn = () =>
    page.getByRole('button', { name: 'Zoom In', exact: true }).filter({ visible: true })
  await show(/A-101/)
  const fitted = await zoom()
  await zoomIn().click()
  await zoomIn().click()
  const zoomed = await zoom()
  expect(zoomed).not.toBe(fitted)
  await show(/B-201/)
  expect(await zoom()).not.toBe(zoomed)
  await show(/A-101/)
  expect(await zoom()).toBe(zoomed)
})
