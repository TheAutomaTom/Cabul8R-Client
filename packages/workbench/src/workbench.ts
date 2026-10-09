import { inject, markRaw, reactive, type Component, type InjectionKey } from 'vue'
import { CommandRegistry } from './commands'
import { applyTheme, THEMES, type ThemeId } from './themes'

/** A container in the activity bar that shows a view in the primary side bar. */
export interface ViewContainer {
  id: string
  title: string
  icon: string
  component: Component
  /** Pinned to the bottom of the activity bar, like Accounts and Manage in VS Code. */
  bottom?: boolean
}

export interface EditorTab {
  id: string
  title: string
  icon?: string
  component: Component
  props?: Record<string, unknown>
  dirty?: boolean
}

export interface PanelView {
  id: string
  title: string
  component: Component
}

export interface StatusBarItem {
  id: string
  text: () => string
  icon?: () => string | undefined
  tooltip?: string
  command?: string
  alignment: 'left' | 'right'
  priority?: number
}

export type MenuItem =
  { command: string; label?: string; args?: unknown[]; disabled?: boolean } | { separator: true }

export interface ContextMenuState {
  x: number
  y: number
  items: MenuItem[]
}

export interface WorkbenchState {
  theme: ThemeId
  activeContainer: string | undefined
  sideBarVisible: boolean
  sideBarWidth: number
  panelVisible: boolean
  panelHeight: number
  activePanel: string | undefined
  activeEditor: string | undefined
  paletteOpen: boolean
  paletteMode: 'commands' | 'quickOpen'
  contextMenu: ContextMenuState | undefined
}

export class Workbench {
  readonly commands = new CommandRegistry()
  readonly containers = reactive<ViewContainer[]>([])
  readonly editors = reactive<EditorTab[]>([])
  readonly panels = reactive<PanelView[]>([])
  readonly statusItems = reactive<StatusBarItem[]>([])
  readonly state = reactive<WorkbenchState>({
    theme: 'dark-modern',
    activeContainer: undefined,
    sideBarVisible: true,
    sideBarWidth: 280,
    panelVisible: true,
    panelHeight: 220,
    activePanel: undefined,
    activeEditor: undefined,
    paletteOpen: false,
    paletteMode: 'commands',
    contextMenu: undefined,
  })

  constructor() {
    this.registerBuiltins()
  }

  addViewContainer(container: ViewContainer): void {
    this.containers.push({ ...container, component: markRaw(container.component) })
    this.state.activeContainer ??= container.bottom ? undefined : container.id
  }

  addPanel(panel: PanelView): void {
    this.panels.push({ ...panel, component: markRaw(panel.component) })
    this.state.activePanel ??= panel.id
  }

  addStatusItem(item: StatusBarItem): void {
    this.statusItems.push(item)
  }

  openEditor(tab: EditorTab): void {
    if (!this.editors.some((e) => e.id === tab.id))
      this.editors.push({ ...tab, component: markRaw(tab.component) })
    this.state.activeEditor = tab.id
  }

  closeEditor(id: string): void {
    const index = this.editors.findIndex((e) => e.id === id)
    if (index < 0) return
    this.editors.splice(index, 1)
    if (this.state.activeEditor === id)
      this.state.activeEditor = (this.editors[index] ?? this.editors[index - 1])?.id
  }

  /** Clicking the active container toggles the side bar, as in VS Code. */
  selectContainer(id: string): void {
    if (this.state.activeContainer === id && this.state.sideBarVisible) {
      this.state.sideBarVisible = false
      return
    }
    this.state.activeContainer = id
    this.state.sideBarVisible = true
  }

  setTheme(theme: ThemeId): void {
    this.state.theme = theme
    applyTheme(theme)
  }

  showContextMenu(event: MouseEvent, items: MenuItem[]): void {
    event.preventDefault()
    event.stopPropagation()
    this.state.contextMenu = { x: event.clientX, y: event.clientY, items }
  }

  hideContextMenu(): void {
    this.state.contextMenu = undefined
  }

  private registerBuiltins(): void {
    const c = this.commands
    c.register({
      id: 'workbench.action.showCommands',
      title: 'Show All Commands',
      category: 'View',
      keybinding: 'mod+shift+p',
      hidden: true,
      run: () => this.openPalette('commands'),
    })
    c.register({
      id: 'workbench.action.quickOpen',
      title: 'Go to Sheet...',
      category: 'Go',
      keybinding: 'mod+p',
      hidden: true,
      run: () => this.openPalette('quickOpen'),
    })
    c.register({
      id: 'workbench.action.toggleSidebarVisibility',
      title: 'Toggle Primary Side Bar Visibility',
      category: 'View',
      icon: 'layout-sidebar-left',
      keybinding: 'mod+b',
      run: () => (this.state.sideBarVisible = !this.state.sideBarVisible),
    })
    c.register({
      id: 'workbench.action.togglePanel',
      title: 'Toggle Panel Visibility',
      category: 'View',
      icon: 'layout-panel',
      keybinding: 'mod+j',
      run: () => (this.state.panelVisible = !this.state.panelVisible),
    })
    c.register({
      id: 'workbench.action.closeActiveEditor',
      title: 'Close Editor',
      category: 'View',
      keybinding: 'mod+w',
      run: (id?: unknown) => {
        const target = typeof id === 'string' ? id : this.state.activeEditor
        if (target) this.closeEditor(target)
      },
    })
    for (const theme of THEMES) {
      c.register({
        id: `workbench.action.theme.${theme.id}`,
        title: `Color Theme: ${theme.label}`,
        category: 'Preferences',
        icon: 'color-mode',
        run: () => this.setTheme(theme.id),
      })
    }
  }

  openPalette(mode: WorkbenchState['paletteMode']): void {
    this.state.paletteMode = mode
    this.state.paletteOpen = true
  }
}

export const WORKBENCH: InjectionKey<Workbench> = Symbol('workbench')

export function useWorkbench(): Workbench {
  const workbench = inject(WORKBENCH)
  if (!workbench) throw new Error('useWorkbench() called outside a <WorkbenchShell>')
  return workbench
}
