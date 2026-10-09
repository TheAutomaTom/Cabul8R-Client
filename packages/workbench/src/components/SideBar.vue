<script setup lang="ts">
import { computed } from 'vue'
import { useWorkbench } from '../workbench'

const wb = useWorkbench()
const container = computed(() => wb.containers.find((c) => c.id === wb.state.activeContainer))
</script>

<template>
  <aside class="side-bar" :aria-label="container?.title">
    <header class="title">
      <span>{{ container?.title }}</span>
      <button
        class="wb-icon-button"
        title="Hide Side Bar"
        @click="wb.commands.execute('workbench.action.toggleSidebarVisibility')"
      >
        <span class="codicon codicon-close" />
      </button>
    </header>
    <div class="content">
      <component :is="container.component" v-if="container" />
    </div>
  </aside>
</template>

<style scoped>
.side-bar {
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  min-width: 0;
  color: var(--vscode-sideBar-foreground);
  background: var(--vscode-sideBar-background);
  border-right: 1px solid var(--vscode-sideBar-border);
}
.title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 35px;
  padding: 0 8px 0 20px;
  font-size: 11px;
  text-transform: uppercase;
  color: var(--vscode-sideBarTitle-foreground);
}
.content {
  flex: 1;
  overflow: auto;
}
</style>
