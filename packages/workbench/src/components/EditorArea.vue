<script setup lang="ts">
import { computed } from 'vue'
import { tabTitle, useWorkbench } from '../workbench'

const wb = useWorkbench()
const active = computed(() => wb.editors.find((e) => e.id === wb.state.activeEditor))

function onTabMouseDown(e: MouseEvent, id: string) {
  if (e.button === 1) wb.closeEditor(id) // middle-click closes, as in VS Code
}
</script>

<template>
  <main class="editor-area">
    <div v-if="wb.editors.length" class="tabs" role="tablist">
      <div
        v-for="tab in wb.editors"
        :key="tab.id"
        class="tab"
        role="tab"
        :class="{ active: tab.id === wb.state.activeEditor, dirty: tab.dirty }"
        :aria-selected="tab.id === wb.state.activeEditor"
        @click="wb.state.activeEditor = tab.id"
        @mousedown="onTabMouseDown($event, tab.id)"
        @contextmenu="
          wb.showContextMenu($event, [
            { command: 'workbench.action.closeActiveEditor', label: 'Close', args: [tab.id] },
          ])
        "
      >
        <span v-if="tab.icon" class="codicon" :class="'codicon-' + tab.icon" />
        <span class="label">{{ tabTitle(tab) }}</span>
        <button class="close wb-icon-button" title="Close" @click.stop="wb.closeEditor(tab.id)">
          <span class="codicon" :class="tab.dirty ? 'codicon-circle-filled' : 'codicon-close'" />
        </button>
      </div>
    </div>
    <div class="editor">
      <component :is="active.component" v-if="active" v-bind="active.props" />
      <div v-else class="watermark">
        <span class="codicon codicon-layers" />
      </div>
    </div>
  </main>
</template>

<style scoped>
.editor-area {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
}
.tabs {
  display: flex;
  flex: 0 0 35px;
  overflow-x: auto;
  background: var(--vscode-editorGroupHeader-tabsBackground);
  border-bottom: 1px solid var(--vscode-editorGroupHeader-tabsBorder);
}
.tabs::-webkit-scrollbar {
  height: 3px;
}
.tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 4px 0 10px;
  min-width: 80px;
  white-space: nowrap;
  cursor: pointer;
  color: var(--vscode-tab-inactiveForeground);
  background: var(--vscode-tab-inactiveBackground);
  border-right: 1px solid var(--vscode-tab-border);
}
.tab:hover {
  background: var(--vscode-tab-hoverBackground);
}
.tab.active {
  color: var(--vscode-tab-activeForeground);
  background: var(--vscode-tab-activeBackground);
  margin-bottom: -1px;
}
.tab.active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--vscode-tab-activeBorderTop);
}
.close {
  visibility: hidden;
}
.tab.active .close,
.tab.dirty .close,
.tab:hover .close {
  visibility: visible;
}
.editor {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.watermark {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  opacity: 0.08;
}
.watermark .codicon {
  font-size: 240px;
}
</style>
