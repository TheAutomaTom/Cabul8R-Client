import type { HostAdapter, HostFile, OpenFilesOptions } from '@cabul8r/app'

/** Pick files with a hidden <input type=file>; works in every browser. */
function pickWithInput(options: OpenFilesOptions): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = options.multiple ?? false
    input.accept = options.filters.flatMap((f) => f.extensions.map((e) => `.${e}`)).join(',')
    input.addEventListener('change', () => resolve([...(input.files ?? [])]))
    input.addEventListener('cancel', () => resolve([]))
    input.click()
  })
}

export const browserHost: HostAdapter = {
  kind: 'web',
  platform: 'web',
  description: `Web (${navigator.userAgent.match(/(Chrome|Firefox|Safari|Edg)\/[\d.]+/)?.[0] ?? 'browser'})`,
  async openFiles(options): Promise<HostFile[]> {
    // File System Access API handles (for save-in-place) arrive with project files in M2.
    const files = await pickWithInput(options)
    return files.map((file) => ({ name: file.name, read: () => file.arrayBuffer() }))
  },
}
