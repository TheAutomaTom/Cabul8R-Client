import { describe, expect, it } from 'vitest'
import { CommandRegistry, eventToKeybinding, formatKeybinding, fuzzyScore } from './commands'

const key = (init: Partial<KeyboardEvent>): KeyboardEvent =>
  ({
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    key: '',
    ...init,
  }) as KeyboardEvent

describe('CommandRegistry', () => {
  it('registers, executes and unregisters', () => {
    const registry = new CommandRegistry()
    const dispose = registry.register({ id: 'a', title: 'A', run: (x) => `ran ${x}` })
    expect(registry.execute('a', 1)).toBe('ran 1')
    expect(() => registry.register({ id: 'a', title: 'A', run: () => {} })).toThrow()
    dispose()
    expect(registry.get('a')).toBeUndefined()
  })
})

describe('keybindings', () => {
  it('maps mod to Ctrl on Windows/Linux and Cmd on macOS', () => {
    expect(eventToKeybinding(key({ ctrlKey: true, shiftKey: true, key: 'P' }), false)).toBe(
      'mod+shift+p',
    )
    expect(eventToKeybinding(key({ metaKey: true, shiftKey: true, key: 'P' }), true)).toBe(
      'mod+shift+p',
    )
    expect(eventToKeybinding(key({ key: 'Escape' }), false)).toBe('escape')
  })

  it('formats for display', () => {
    expect(formatKeybinding('mod+shift+p', false)).toBe('Ctrl+Shift+P')
    expect(formatKeybinding('mod+shift+p', true)).toBe('⌘⇧P')
  })
})

describe('fuzzyScore', () => {
  it('matches subsequences and ranks tighter matches first', () => {
    expect(fuzzyScore('tgp', 'Toggle Panel')).toBeDefined()
    expect(fuzzyScore('xyz', 'Toggle Panel')).toBeUndefined()
    expect(fuzzyScore('panel', 'Toggle Panel')!).toBeLessThan(fuzzyScore('tpl', 'Toggle Panel')!)
  })
})
