<script setup lang="ts">
import { computed } from 'vue'
import { useWorkbench, type StatusBarItem } from '../workbench'

const wb = useWorkbench()
const sorted = (alignment: StatusBarItem['alignment']) =>
  wb.statusItems
    .filter((i) => i.alignment === alignment)
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
const left = computed(() => sorted('left'))
const right = computed(() => sorted('right'))

function run(item: StatusBarItem) {
  if (item.command) wb.commands.execute(item.command)
}
</script>

<template>
  <footer class="status-bar">
    <div v-for="(group, i) in [left, right]" :key="i" class="group">
      <button
        v-for="item in group"
        :key="item.id"
        class="item"
        :class="{ clickable: !!item.command }"
        :title="item.tooltip"
        @click="run(item)"
      >
        <span v-if="item.icon?.()" class="codicon" :class="'codicon-' + item.icon()" />
        <span v-if="item.text()">{{ item.text() }}</span>
      </button>
    </div>
  </footer>
</template>

<style scoped>
.status-bar {
  display: flex;
  justify-content: space-between;
  flex: 0 0 22px;
  font-size: 12px;
  color: var(--vscode-statusBar-foreground);
  background: var(--vscode-statusBar-background);
  border-top: 1px solid var(--vscode-statusBar-border);
}
.group {
  display: flex;
  padding: 0 4px;
}
.item {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 100%;
  padding: 0 5px;
  border: 0;
  font: inherit;
  color: inherit;
  background: transparent;
}
.item .codicon {
  font-size: 14px;
}
.item.clickable {
  cursor: pointer;
}
.item.clickable:hover {
  background: var(--vscode-statusBarItem-hoverBackground);
}
</style>
