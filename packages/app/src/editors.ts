import { defineStore } from 'pinia'
import type { SheetViewer } from '@cabul8r/canvas'

export type Tool = 'pan' | 'calibrate' | 'measure'

export const pageEditorId = (pageId: string) => `page:${pageId}`
export const pageIdFromEditor = (editorId: string | undefined) =>
  editorId?.startsWith('page:') ? editorId.slice(5) : undefined

/** Live viewers by page id, so commands can reach the visible page. */
export const viewers = new Map<string, SheetViewer>()

export const useEditorTools = defineStore('editorTools', {
  state: () => ({
    tools: {} as Record<string, Tool>,
    zoom: {} as Record<string, number>,
  }),
  actions: {
    setTool(pageId: string, tool: Tool) {
      this.tools[pageId] = tool
    },
  },
})
