/**
 * Everything the app needs from the platform it runs on. The desktop app implements this
 * over Electron IPC; the PWA implements it over browser APIs. Feature code depends only
 * on this interface, never on Electron or `window` file APIs directly.
 */
export interface HostAdapter {
  readonly kind: 'desktop' | 'web'
  readonly platform: 'win32' | 'darwin' | 'linux' | 'web'
  /** e.g. "Electron 44.7.0" or the browser's user agent brand. */
  readonly description: string

  /** Let the user pick files to open. Resolves to [] when cancelled. */
  openFiles(options: OpenFilesOptions): Promise<HostFile[]>
  // Later milestones: saveFile, recentFiles, secureStorage, print.
}

export interface OpenFilesOptions {
  title?: string
  filters: { name: string; extensions: string[] }[]
  multiple?: boolean
}

export interface HostFile {
  name: string
  /** Absolute path on desktop; undefined on the web. */
  path?: string
  read(): Promise<ArrayBuffer>
}
