import { shallowReactive } from 'vue'

/**
 * One registry backs the command palette, keybindings, menus and context menus,
 * so every action in the app is reachable the same way VS Code's are.
 */
export interface Command {
  id: string
  title: string
  /** Shown before the title in the palette, e.g. "View: Toggle Panel". */
  category?: string
  /** Codicon name without the `codicon-` prefix. */
  icon?: string
  /** e.g. "mod+shift+p"; `mod` is Cmd on macOS and Ctrl elsewhere. */
  keybinding?: string
  /** Hidden from the command palette (still runnable from menus and keys). */
  hidden?: boolean
  run: (...args: unknown[]) => unknown
}

export class CommandRegistry {
  readonly commands = shallowReactive(new Map<string, Command>())

  register(command: Command): () => void {
    if (this.commands.has(command.id)) throw new Error(`Command already registered: ${command.id}`)
    this.commands.set(command.id, command)
    return () => this.commands.delete(command.id)
  }

  get(id: string): Command | undefined {
    return this.commands.get(id)
  }

  all(): Command[] {
    return [...this.commands.values()]
  }

  execute(id: string, ...args: unknown[]): unknown {
    const command = this.commands.get(id)
    if (!command) throw new Error(`Unknown command: ${id}`)
    return command.run(...args)
  }
}

export const isMac = (): boolean =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/** Normalize a key event to the keybinding form, e.g. "mod+shift+p". */
export function eventToKeybinding(e: KeyboardEvent, mac = isMac()): string {
  const parts: string[] = []
  const mod = mac ? e.metaKey : e.ctrlKey
  if (mod) parts.push('mod')
  if (mac && e.ctrlKey) parts.push('ctrl')
  if (!mac && e.metaKey) parts.push('meta')
  if (e.altKey) parts.push('alt')
  if (e.shiftKey) parts.push('shift')
  const key = e.key.toLowerCase()
  if (!['control', 'meta', 'alt', 'shift'].includes(key)) parts.push(key)
  return parts.join('+')
}

/** Display a keybinding the way the host platform writes it. */
export function formatKeybinding(binding: string, mac = isMac()): string {
  const names: Record<string, string> = mac
    ? { mod: '⌘', ctrl: '⌃', alt: '⌥', shift: '⇧' }
    : { mod: 'Ctrl', meta: 'Win', alt: 'Alt', shift: 'Shift' }
  const keys = binding
    .split('+')
    .map((k) => names[k] ?? (k.length === 1 ? k.toUpperCase() : k[0]!.toUpperCase() + k.slice(1)))
  return keys.join(mac ? '' : '+')
}

/** Find the command bound to a key event, if any. */
export function matchKeybinding(registry: CommandRegistry, e: KeyboardEvent): Command | undefined {
  const pressed = eventToKeybinding(e)
  return registry.all().find((c) => c.keybinding === pressed)
}

/** Subsequence fuzzy match used by the palette. Lower score is better; undefined = no match. */
export function fuzzyScore(query: string, text: string): number | undefined {
  const q = query.toLowerCase().replace(/\s+/g, '')
  const t = text.toLowerCase()
  if (q === '') return 0
  let score = 0
  let last = -1
  for (const ch of q) {
    const found = t.indexOf(ch, last + 1)
    if (found < 0) return undefined
    score += found - last - 1
    last = found
  }
  return score
}
