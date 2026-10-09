<script setup lang="ts">
import { computed } from 'vue'
import { useWorkbench } from '../workbench'

const wb = useWorkbench()
const top = computed(() => wb.containers.filter((c) => !c.bottom))
const bottom = computed(() => wb.containers.filter((c) => c.bottom))
const isActive = (id: string) => wb.state.sideBarVisible && wb.state.activeContainer === id
</script>

<template>
  <nav class="activity-bar" aria-label="Activity Bar">
    <div v-for="group in [top, bottom]" :key="group === top ? 'top' : 'bottom'" class="group">
      <button
        v-for="c in group"
        :key="c.id"
        class="item"
        :class="{ active: isActive(c.id) }"
        :title="c.title"
        :aria-label="c.title"
        :aria-pressed="isActive(c.id)"
        @click="wb.selectContainer(c.id)"
      >
        <span class="codicon" :class="'codicon-' + c.icon" />
      </button>
    </div>
  </nav>
</template>

<style scoped>
.activity-bar {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex: 0 0 48px;
  background: var(--vscode-activityBar-background);
  border-right: 1px solid var(--vscode-activityBar-border);
}
.item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border: 0;
  color: var(--vscode-activityBar-inactiveForeground);
  background: transparent;
  cursor: pointer;
}
.item .codicon {
  font-size: 24px;
}
.item:hover,
.item.active {
  color: var(--vscode-activityBar-foreground);
}
.item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--vscode-activityBar-activeBorder);
}
</style>
