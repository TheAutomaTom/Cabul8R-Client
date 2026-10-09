import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { Workbench } from './workbench'

const Empty = defineComponent({ render: () => null })

describe('Workbench', () => {
  it('activates the first container and toggles the side bar on re-click', () => {
    const wb = new Workbench()
    wb.addViewContainer({ id: 'sheets', title: 'Sheets', icon: 'files', component: Empty })
    wb.addViewContainer({ id: 'layers', title: 'Layers', icon: 'layers', component: Empty })
    expect(wb.state.activeContainer).toBe('sheets')
    wb.selectContainer('sheets')
    expect(wb.state.sideBarVisible).toBe(false)
    wb.selectContainer('layers')
    expect(wb.state).toMatchObject({ activeContainer: 'layers', sideBarVisible: true })
  })

  it('activates a neighbour when the active editor closes', () => {
    const wb = new Workbench()
    for (const id of ['a', 'b', 'c']) wb.openEditor({ id, title: id, component: Empty })
    wb.state.activeEditor = 'b'
    wb.commands.execute('workbench.action.closeActiveEditor')
    expect(wb.state.activeEditor).toBe('c')
    wb.closeEditor('c')
    expect(wb.state.activeEditor).toBe('a')
  })

  it('registers built-in view commands', () => {
    const wb = new Workbench()
    wb.commands.execute('workbench.action.togglePanel')
    expect(wb.state.panelVisible).toBe(false)
    wb.commands.execute('workbench.action.theme.light-modern')
    expect(document.documentElement.dataset.theme).toBe('light-modern')
  })
})

describe('quick pick', () => {
  it('opens the palette in pick mode and resolves with the choice', async () => {
    const wb = new Workbench()
    const result = wb.showQuickPick([{ id: 'a', label: 'A' }], { placeholder: 'Pick' })
    expect(wb.state).toMatchObject({ paletteOpen: true, paletteMode: 'pick' })
    wb.state.quickPick!.resolve(wb.state.quickPick!.items[0])
    expect(await result).toEqual({ id: 'a', label: 'A' })
  })

  it('resolves a superseded pick as cancelled', async () => {
    const wb = new Workbench()
    const first = wb.showQuickPick([{ id: 'a', label: 'A' }])
    void wb.showQuickPick([{ id: 'b', label: 'B' }])
    expect(await first).toBeUndefined()
  })
})
