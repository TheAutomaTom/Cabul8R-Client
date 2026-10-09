import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type DesktopBridge } from '../shared/ipc'

const bridge: DesktopBridge = {
  platform: process.platform as DesktopBridge['platform'],
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
  openFiles: (options) => ipcRenderer.invoke(IPC.openFiles, options),
  readFile: (path) => ipcRenderer.invoke(IPC.readFile, path),
}

contextBridge.exposeInMainWorld('cabul8rHost', bridge)
