/** Contract between the preload bridge (window.cabul8rHost) and the main process. */
export interface DesktopBridge {
  platform: 'win32' | 'darwin' | 'linux'
  versions: { electron: string; chrome: string; node: string }
  openFiles(options: {
    title?: string
    filters: { name: string; extensions: string[] }[]
    multiple?: boolean
  }): Promise<{ name: string; path: string }[]>
  /** Only paths previously returned by openFiles may be read. */
  readFile(path: string): Promise<ArrayBuffer>
}

export const IPC = {
  openFiles: 'host:openFiles',
  readFile: 'host:readFile',
} as const
