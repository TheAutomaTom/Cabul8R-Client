import { createApp, h, type Component } from 'vue'
import { createPinia } from 'pinia'
import { Workbench, WorkbenchShell } from '@cabul8r/workbench'
import type { HostAdapter } from './host'
import { useOutput } from './output'
import { useSettings } from './settings'
import OutputPanel from './views/OutputPanel.vue'
import PlaceholderView from './views/PlaceholderView.vue'
import WelcomeEditor from './views/WelcomeEditor.vue'

export type { HostAdapter, HostFile, OpenFilesOptions } from './host'
export { default as DimensionInput } from './components/DimensionInput.vue'
export { useSettings } from './settings'

const placeholder = (props: InstanceType<typeof PlaceholderView>['$props']): Component => ({
  render: () => h(PlaceholderView, props),
})

/** Build the Cabul8R workbench and mount it into `el`. */
export function mountCabul8r(el: string | Element, host: HostAdapter) {
  const workbench = new Workbench()
  const app = createApp({ render: () => h(WorkbenchShell, { workbench }) })
  const pinia = createPinia()
  app.use(pinia)
  const settings = useSettings(pinia)
  const output = useOutput(pinia)

  const openPdf = async () => {
    const files = await host.openFiles({
      title: 'Open PDF Plans',
      filters: [{ name: 'PDF Plans', extensions: ['pdf'] }],
      multiple: true,
    })
    for (const file of files) {
      const bytes = await file.read()
      output.log(
        `Opened ${file.path ?? file.name} (${(bytes.byteLength / 1024).toFixed(0)} KB). Viewing arrives in M2.`,
      )
    }
    if (files.length) workbench.state.activePanel = 'output'
  }

  const c = workbench.commands
  c.register({
    id: 'cabul8r.openPdf',
    title: 'Open PDF Plans...',
    category: 'File',
    icon: 'file-pdf',
    keybinding: 'mod+o',
    run: openPdf,
  })
  c.register({
    id: 'cabul8r.toggleUnits',
    title: 'Toggle Imperial / Metric',
    category: 'Units',
    keybinding: 'mod+alt+u',
    run: () => settings.toggleSystem(),
  })
  c.register({
    id: 'cabul8r.showWelcome',
    title: 'Welcome',
    category: 'Help',
    run: () =>
      workbench.openEditor({
        id: 'welcome',
        title: 'Welcome',
        icon: 'home',
        component: WelcomeEditor,
      }),
  })

  workbench.addViewContainer({
    id: 'sheets',
    title: 'Sheets',
    icon: 'files',
    component: placeholder({
      message: 'No sheets yet. Open PDF plans to start a takeoff.',
      milestone: 'M2',
      action: { label: 'Open PDF Plans...', run: openPdf },
    }),
  })
  workbench.addViewContainer({
    id: 'layers',
    title: 'Layers',
    icon: 'layers',
    component: placeholder({ message: 'Markup layers will be listed here.', milestone: 'M4' }),
  })
  workbench.addViewContainer({
    id: 'stamps',
    title: 'Stamps',
    icon: 'symbol-misc',
    component: placeholder({ message: 'The stamp library will be listed here.', milestone: 'M8' }),
  })
  workbench.addViewContainer({
    id: 'settings',
    title: 'Settings',
    icon: 'settings-gear',
    bottom: true,
    component: placeholder({ message: 'Settings UI.', milestone: 'M1' }),
  })

  workbench.addPanel({
    id: 'takeoff',
    title: 'Takeoff',
    component: placeholder({
      message: 'Drawn vs. scaled measurements for every shape.',
      milestone: 'M9',
    }),
  })
  workbench.addPanel({ id: 'output', title: 'Output', component: OutputPanel })

  workbench.addStatusItem({
    id: 'host',
    alignment: 'left',
    priority: 100,
    icon: () => (host.kind === 'desktop' ? 'device-desktop' : 'globe'),
    text: () => '',
    tooltip: host.description,
  })
  workbench.addStatusItem({
    id: 'scale',
    alignment: 'left',
    icon: () => 'warning',
    text: () => 'No scale',
    tooltip: 'Scale calibration arrives in M3',
  })
  workbench.addStatusItem({
    id: 'units',
    alignment: 'right',
    priority: 10,
    icon: () => 'symbol-ruler',
    text: () => (settings.system === 'imperial' ? 'Imperial' : 'Metric'),
    tooltip: 'Toggle Imperial / Metric',
    command: 'cabul8r.toggleUnits',
  })
  workbench.addStatusItem({
    id: 'theme',
    alignment: 'right',
    icon: () => 'color-mode',
    text: () => '',
    tooltip: 'Color Theme',
    command: 'cabul8r.cycleTheme',
  })
  const themes = ['dark-modern', 'light-modern', 'high-contrast'] as const
  c.register({
    id: 'cabul8r.cycleTheme',
    title: 'Cycle Color Theme',
    category: 'Preferences',
    run: () =>
      workbench.setTheme(themes[(themes.indexOf(workbench.state.theme) + 1) % themes.length]!),
  })

  c.execute('cabul8r.showWelcome')
  output.log(`Cabul8R started (${host.description}).`)
  app.mount(el)
  return { app, workbench }
}
