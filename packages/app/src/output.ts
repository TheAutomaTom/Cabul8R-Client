import { defineStore } from 'pinia'

/** The Output panel's log, like VS Code's Output channel. */
export const useOutput = defineStore('output', {
  state: () => ({ lines: [] as string[] }),
  actions: {
    log(message: string) {
      this.lines.push(`[${new Date().toLocaleTimeString()}] ${message}`)
    },
  },
})
