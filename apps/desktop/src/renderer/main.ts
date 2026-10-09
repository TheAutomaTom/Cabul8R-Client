import { mountCabul8r, type HostAdapter } from '@cabul8r/app'
import type { DesktopBridge } from '../shared/ipc'

const bridge = (window as unknown as { cabul8rHost: DesktopBridge }).cabul8rHost

const desktopHost: HostAdapter = {
  kind: 'desktop',
  platform: bridge.platform,
  description: `Desktop · Electron ${bridge.versions.electron}`,
  async openFiles(options) {
    const files = await bridge.openFiles(options)
    return files.map((f) => ({ name: f.name, path: f.path, read: () => bridge.readFile(f.path) }))
  },
}

mountCabul8r('#app', desktopHost)
