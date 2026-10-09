import type { Pinia } from 'pinia'
import { describeCalibration, presetCalibration, SCALE_PRESETS } from '@cabul8r/document'
import type { QuickPickItem, Workbench } from '@cabul8r/workbench'
import { pageEditorId, pageIdFromEditor, useEditorTools, viewers, type Tool } from './editors'
import type { HostAdapter } from './host'
import { useOutput } from './output'
import { taxonomy, usePlans } from './plans'
import PageEditor from './views/PageEditor.vue'

/** Commands, views and status items for opening plansets, scaling pages and measuring. */
export function registerPlans(workbench: Workbench, host: HostAdapter, pinia: Pinia) {
  const plans = usePlans(pinia)
  const tools = useEditorTools(pinia)
  const output = useOutput(pinia)
  const c = workbench.commands

  const activePageId = () => pageIdFromEditor(workbench.state.activeEditor)
  /** Commands from menus pass a page id; from the palette or keys they act on the active page. */
  const targetPage = (arg: unknown) => (typeof arg === 'string' ? arg : activePageId())

  const openPage = (pageId: string) => {
    if (!plans.page(pageId)) return
    workbench.openEditor({
      id: pageEditorId(pageId),
      title: () => plans.pageName(pageId),
      icon: 'file-pdf',
      component: PageEditor,
      props: { pageId },
    })
  }

  async function importFiles(files: { name: string; read: () => Promise<ArrayBuffer> }[]) {
    let first: string | undefined
    for (const file of files) {
      try {
        const set = await plans.importPdf(file.name, await file.read())
        first ??= set.pageIds[0]
        output.log(
          `Opened ${file.name}: ${set.pageIds.length} ${taxonomy.label('page', set.pageIds.length !== 1).toLowerCase()}.`,
        )
      } catch (e) {
        output.log(`Could not open ${file.name}: ${e instanceof Error ? e.message : String(e)}`)
        workbench.state.activePanel = 'output'
        workbench.state.panelVisible = true
      }
    }
    if (first) {
      workbench.state.activeContainer = 'plans'
      workbench.state.sideBarVisible = true
      openPage(first)
    }
  }

  const withPage = (tool: Tool) => (arg?: unknown) => {
    const pageId = targetPage(arg)
    if (!pageId) return
    openPage(pageId)
    tools.setTool(pageId, tool)
  }

  c.register({
    id: 'cabul8r.openPdf',
    title: 'Open PDF Plans...',
    category: 'File',
    icon: 'file-pdf',
    keybinding: 'mod+o',
    run: async () =>
      importFiles(
        await host.openFiles({
          title: 'Open PDF Plans',
          filters: [{ name: 'PDF Plans', extensions: ['pdf'] }],
          multiple: true,
        }),
      ),
  })
  c.register({
    id: 'cabul8r.page.open',
    title: `Open ${taxonomy.label('page')}`,
    category: 'Plans',
    hidden: true,
    run: (pageId) => typeof pageId === 'string' && openPage(pageId),
  })
  c.register({
    id: 'cabul8r.page.setScale',
    title: 'Set Scale...',
    category: 'Plans',
    icon: 'symbol-ruler',
    run: async (arg) => {
      const pageId = targetPage(arg)
      const page = pageId && plans.page(pageId)
      if (!pageId || !page) return
      const current = page.calibration?.presetId
      const items: QuickPickItem[] = [
        {
          id: 'calibrate',
          label: 'Calibrate from Drawing...',
          icon: 'symbol-ruler',
          description: 'Click two points a known distance apart',
        },
        ...SCALE_PRESETS.map((p) => ({
          id: p.id,
          label: p.label,
          description: p.group + (p.id === current ? ' · current' : ''),
        })),
        ...(page.calibration ? [{ id: 'clear', label: 'Clear Scale', icon: 'close' }] : []),
      ]
      const choice = await workbench.showQuickPick(items, {
        placeholder: `Scale for ${plans.pageName(pageId)} (now: ${describeCalibration(page.calibration)})`,
      })
      if (!choice) return
      if (choice.id === 'calibrate') return c.execute('cabul8r.page.calibrate', pageId)
      if (choice.id === 'clear') return plans.setCalibration(pageId, undefined)
      const preset = SCALE_PRESETS.find((p) => p.id === choice.id)
      if (preset) plans.setCalibration(pageId, presetCalibration(preset))
    },
  })
  c.register({
    id: 'cabul8r.page.calibrate',
    title: 'Calibrate Scale',
    category: 'Plans',
    keybinding: 'k',
    run: withPage('calibrate'),
  })
  c.register({
    id: 'cabul8r.page.measure',
    title: 'Measure',
    category: 'Plans',
    keybinding: 'm',
    run: withPage('measure'),
  })
  c.register({
    id: 'cabul8r.page.pan',
    title: 'Pan',
    category: 'Plans',
    keybinding: 'h',
    run: withPage('pan'),
  })
  c.register({
    id: 'cabul8r.page.clearMeasurements',
    title: 'Clear Measurements',
    category: 'Plans',
    run: (arg) => {
      const pageId = targetPage(arg)
      if (pageId) plans.clearMeasurements(pageId)
    },
  })
  const withViewer = (fn: (v: NonNullable<ReturnType<typeof viewers.get>>) => void) => () => {
    const v = viewers.get(activePageId() ?? '')
    if (v) fn(v)
  }
  c.register({
    id: 'cabul8r.view.fitPage',
    title: 'Fit Page',
    category: 'View',
    icon: 'screen-normal',
    keybinding: 'mod+0',
    run: withViewer((v) => v.fitPage()),
  })
  c.register({
    id: 'cabul8r.view.zoomIn',
    title: 'Zoom In',
    category: 'View',
    keybinding: 'mod+=',
    run: withViewer((v) => v.zoomBy(1.25)),
  })
  c.register({
    id: 'cabul8r.view.zoomOut',
    title: 'Zoom Out',
    category: 'View',
    keybinding: 'mod+-',
    run: withViewer((v) => v.zoomBy(1 / 1.25)),
  })

  // Go to Page (Ctrl+P) lists every page of every planset.
  workbench.quickOpenProvider = () =>
    plans.plansets.flatMap((set) =>
      set.pageIds.map((pageId) => ({
        id: pageId,
        label: plans.pageName(pageId),
        description: `${set.fileName} · ${describeCalibration(plans.page(pageId)?.calibration)}`,
        icon: 'file-pdf',
        run: () => openPage(pageId),
      })),
    )

  // Drop PDFs anywhere on the window. Also stops Electron from navigating to a dropped file.
  const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files')
  window.addEventListener('dragover', (e) => {
    if (!hasFiles(e)) return
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  })
  window.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return
    e.preventDefault()
    const files = [...(e.dataTransfer?.files ?? [])].filter((f) => /\.pdf$/i.test(f.name))
    void importFiles(files.map((f) => ({ name: f.name, read: () => f.arrayBuffer() })))
  })

  workbench.addStatusItem({
    id: 'scale',
    alignment: 'left',
    icon: () => {
      const id = activePageId()
      if (!id) return undefined
      return plans.page(id)?.calibration ? 'symbol-ruler' : 'warning'
    },
    text: () => {
      const id = activePageId()
      return id ? describeCalibration(plans.page(id)?.calibration) : ''
    },
    tooltip: 'Set Scale',
    command: 'cabul8r.page.setScale',
  })

  return { importFiles, openPage }
}
