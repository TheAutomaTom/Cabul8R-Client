<script setup lang="ts">
import { computed } from 'vue'
import { useWorkbench } from '../workbench'

const wb = useWorkbench()
const active = computed(() => wb.panels.find((p) => p.id === wb.state.activePanel))
</script>

<template>
  <section class="panel" aria-label="Panel">
    <header class="header">
      <div class="titles" role="tablist">
        <button
          v-for="p in wb.panels"
          :key="p.id"
          class="title"
          role="tab"
          :class="{ active: p.id === wb.state.activePanel }"
          :aria-selected="p.id === wb.state.activePanel"
          @click="wb.state.activePanel = p.id"
        >
          {{ p.title }}
        </button>
      </div>
      <button
        class="wb-icon-button"
        title="Hide Panel"
        @click="wb.commands.execute('workbench.action.togglePanel')"
      >
        <span class="codicon codicon-close" />
      </button>
    </header>
    <div class="content">
      <component :is="active.component" v-if="active" />
    </div>
  </section>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  background: var(--vscode-panel-background);
  border-top: 1px solid var(--vscode-panel-border);
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 35px;
  padding: 0 8px;
}
.titles {
  display: flex;
  gap: 4px;
}
.title {
  height: 35px;
  padding: 0 10px;
  border: 0;
  border-bottom: 1px solid transparent;
  font: inherit;
  font-size: 11px;
  text-transform: uppercase;
  color: var(--vscode-panelTitle-inactiveForeground);
  background: transparent;
  cursor: pointer;
}
.title.active {
  color: var(--vscode-panelTitle-activeForeground);
  border-bottom-color: var(--vscode-panelTitle-activeBorder);
}
.content {
  flex: 1;
  overflow: auto;
  padding: 0 20px;
}
</style>
