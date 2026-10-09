import { createApp, h, type Component } from 'vue'
import { createPinia } from 'pinia'
import { Workbench, WorkbenchShell } from '@cabul8r/workbench'
import type { HostAdapter } from './host'
import { useOutput } from './output'
import { taxonomy } from './plans'
import { registerPlans } from './registerPlans'
import { useSettings } from './settings'
import OutputPanel from './views/OutputPanel.vue'
import PlaceholderView from './views/PlaceholderView.vue'
import PlansView from './views/PlansView.vue'
import TakeoffPanel from './views/TakeoffPanel.vue'
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

  const c = workbench.commands
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
    id: 'plans',
    title: taxonomy.label('planset', true),
    icon: 'files',
    component: PlansView,
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
    component: TakeoffPanel,
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

  registerPlans(workbench, host, pinia)

  c.execute('cabul8r.showWelcome')
  output.log(`Cabul8R started (${host.description}).`)
  app.mount(el)
  return { app, workbench }
}
