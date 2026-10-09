// Packages that typecheck this source need the *.css module declaration too.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../shims.d.ts" />
import './workbench.css'

export type ThemeId = 'dark-modern' | 'light-modern' | 'high-contrast'

export interface ThemeInfo {
  id: ThemeId
  label: string
  kind: 'dark' | 'light'
}

export const THEMES: readonly ThemeInfo[] = [
  { id: 'dark-modern', label: 'Dark Modern', kind: 'dark' },
  { id: 'light-modern', label: 'Light Modern', kind: 'light' },
  { id: 'high-contrast', label: 'Dark High Contrast', kind: 'dark' },
]

/**
 * Themes are sets of `--vscode-*` CSS variables named after VS Code's theme color keys
 * (editor.background → --vscode-editor-background), so VS Code theme JSON can be loaded later.
 */
export function applyTheme(theme: ThemeId, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = theme
  root.style.colorScheme = THEMES.find((t) => t.id === theme)?.kind ?? 'dark'
}

/** Convert VS Code theme JSON `colors` to CSS variables (for importing user themes later). */
export function themeColorsToCss(colors: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(colors).map(([key, value]) => [`--vscode-${key.replace(/\./g, '-')}`, value]),
  )
}
