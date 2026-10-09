import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { IPC, type DesktopBridge } from '../shared/ipc'

/** Files the user chose in a dialog this session; the renderer may read only these. */
const grantedPaths = new Set<string>()

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 800,
    minHeight: 500,
    show: false,
    backgroundColor: '#1f1f1f',
    title: 'Cabul8R',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  })
  win.once('ready-to-show', () => win.show())

  // Links open in the user's browser, never inside the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) void win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else void win.loadFile(join(__dirname, '../renderer/index.html'))
}

ipcMain.handle(IPC.openFiles, async (event, options: Parameters<DesktopBridge['openFiles']>[0]) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const dialogOptions: Electron.OpenDialogOptions = {
    title: options.title,
    filters: options.filters,
    properties: options.multiple ? ['openFile', 'multiSelections'] : ['openFile'],
  }
  const result = win
    ? await dialog.showOpenDialog(win, dialogOptions)
    : await dialog.showOpenDialog(dialogOptions)
  if (result.canceled) return []
  return result.filePaths.map((path) => {
    grantedPaths.add(path)
    return { name: basename(path), path }
  })
})

ipcMain.handle(IPC.readFile, async (_event, path: string) => {
  if (!grantedPaths.has(path)) throw new Error('File access was not granted by the user.')
  const data = await readFile(path)
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
})

void app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
