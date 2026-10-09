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

// Requires `pnpm --filter @cabul8r/desktop build` first.
const desktopDir = join(dirname(fileURLToPath(import.meta.url)), '../../apps/desktop')
const electronPath = createRequire(import.meta.url)('electron') as unknown as string

let app: ElectronApplication
let page: Page

test.beforeAll(async () => {
  // Terminals inside VS Code inherit ELECTRON_RUN_AS_NODE, which would start Electron as plain Node.
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

const mod = process.platform === 'darwin' ? 'Meta' : 'Control'

test('shows the workbench with the welcome editor', async () => {
  await expect(page.locator('.activity-bar')).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Welcome' })).toBeVisible()
  await expect(page.locator('.status-bar')).toContainText('Imperial')
  await page.screenshot({ path: 'test-results/desktop-dark.png' })
})

test('evaluates dimension expressions', async () => {
  const width = page.getByLabel('Width')
  await width.fill('1.1/8*3')
  await expect(page.locator('.chip')).toHaveText('= 3 3/8"')
  await width.press('Enter')
  await expect(width).toHaveValue('3 3/8"')
})

test('opens the command palette and switches theme', async () => {
  await page.locator('.editor').click({ position: { x: 600, y: 20 } })
  await page.keyboard.press(`${mod}+Shift+P`)
  const input = page.getByLabel('Type the name of a command to run.')
  await expect(input).toBeFocused()
  await input.pressSequentially('light modern')
  await input.press('Enter')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light-modern')
  await page.screenshot({ path: 'test-results/desktop-light.png' })
})

test('shows a context menu on editor tabs', async () => {
  await page.getByRole('tab', { name: 'Welcome' }).click({ button: 'right' })
  await expect(page.getByRole('menuitem', { name: /Close/ })).toBeVisible()
  await page.screenshot({ path: 'test-results/desktop-context-menu.png' })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)
})
