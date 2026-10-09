<script setup lang="ts">
import { ref } from 'vue'
import { describeCalibration } from '@cabul8r/document'
import { useWorkbench } from '@cabul8r/workbench'
import PageThumbnail from '../components/PageThumbnail.vue'
import { pageEditorId } from '../editors'
import { taxonomy, usePlans } from '../plans'

const wb = useWorkbench()
const plans = usePlans()
const collapsed = ref(new Set<string>())

function toggle(id: string) {
  if (collapsed.value.has(id)) collapsed.value.delete(id)
  else collapsed.value.add(id)
}

const pageMenu = (pageId: string) => [
  { command: 'cabul8r.page.open', label: `Open ${taxonomy.label('page')}`, args: [pageId] },
  { separator: true as const },
  { command: 'cabul8r.page.setScale', args: [pageId] },
  { command: 'cabul8r.page.calibrate', args: [pageId] },
  { command: 'cabul8r.page.measure', args: [pageId] },
]
</script>

<template>
  <div class="plans">
    <div v-if="!plans.plansets.length" class="empty">
      <p>
        No {{ taxonomy.label('planset', true).toLowerCase() }} yet. Open PDF plans, or drop them
        anywhere on this window.
      </p>
      <button class="wb-button" @click="wb.commands.execute('cabul8r.openPdf')">
        Open PDF Plans...
      </button>
    </div>
    <div v-for="set in plans.plansets" :key="set.id" class="planset">
      <div
        class="planset-header"
        role="button"
        :aria-expanded="!collapsed.has(set.id)"
        @click="toggle(set.id)"
      >
        <span
          class="codicon"
          :class="collapsed.has(set.id) ? 'codicon-chevron-right' : 'codicon-chevron-down'"
        />
        <span class="codicon codicon-file-pdf" />
        <span class="name" :title="set.fileName">{{ set.fileName }}</span>
        <span class="count">{{ set.pageIds.length }}</span>
      </div>
      <ul v-if="!collapsed.has(set.id)" role="tree" :aria-label="set.fileName">
        <li
          v-for="pageId in set.pageIds"
          :key="pageId"
          role="treeitem"
          class="page"
          :class="{ active: wb.state.activeEditor === pageEditorId(pageId) }"
          :data-page-id="pageId"
          @click="wb.commands.execute('cabul8r.page.open', pageId)"
          @contextmenu="wb.showContextMenu($event, pageMenu(pageId))"
        >
          <PageThumbnail :page-id="pageId" :width="40" />
          <span class="meta">
            <span class="page-name">{{ plans.pageName(pageId) }}</span>
            <span class="scale" :class="{ missing: !plans.page(pageId)?.calibration }">
              {{ describeCalibration(plans.page(pageId)?.calibration) }}
            </span>
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 20px;
  line-height: 1.4;
}
.empty p {
  margin: 0;
}
.planset-header {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 8px;
  font-weight: 600;
  cursor: pointer;
}
.planset-header:hover,
.page:hover {
  background: var(--vscode-list-hoverBackground);
}
.name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.count {
  padding: 0 6px;
  font-size: 11px;
  font-weight: 400;
  border-radius: 9px;
  color: var(--vscode-badge-foreground);
  background: var(--vscode-badge-background);
}
ul {
  margin: 0;
  padding: 0;
  list-style: none;
}
.page {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px 4px 28px;
  cursor: pointer;
}
.page.active {
  background: var(--vscode-list-activeSelectionBackground);
}
.meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.page-name,
.scale {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.scale {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
}
.scale.missing {
  color: var(--vscode-statusBarItem-warningForeground);
}
</style>
