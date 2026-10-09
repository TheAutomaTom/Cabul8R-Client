<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { formatKeybinding } from '../commands'
import { useWorkbench, type ContextMenuState, type MenuItem } from '../workbench'

const props = defineProps<{ menu: ContextMenuState }>()
const wb = useWorkbench()
const el = ref<HTMLElement>()
const position = ref({ left: props.menu.x, top: props.menu.y })
const focused = ref(-1)

const rows = computed(() =>
  props.menu.items.map((item) => {
    if ('separator' in item) return { item, separator: true as const }
    const command = wb.commands.get(item.command)
    return {
      item,
      separator: false as const,
      label: item.label ?? command?.title ?? item.command,
      keybinding: command?.keybinding,
      disabled: item.disabled || !command,
    }
  }),
)
const enabledIndexes = computed(() =>
  rows.value.flatMap((r, i) => (!r.separator && !r.disabled ? [i] : [])),
)

function run(item: MenuItem) {
  wb.hideContextMenu()
  if ('command' in item) wb.commands.execute(item.command, ...(item.args ?? []))
}

function onKeydown(e: KeyboardEvent) {
  const ids = enabledIndexes.value
  const at = ids.indexOf(focused.value)
  if (e.key === 'Escape') wb.hideContextMenu()
  else if (e.key === 'ArrowDown') focused.value = ids[(at + 1) % ids.length] ?? -1
  else if (e.key === 'ArrowUp') focused.value = ids[(at - 1 + ids.length) % ids.length] ?? -1
  else if (e.key === 'Enter' && focused.value >= 0) run(rows.value[focused.value]!.item)
  else return
  e.preventDefault()
  e.stopImmediatePropagation()
}

const onPointerDown = (e: PointerEvent) => {
  if (!el.value?.contains(e.target as Node)) wb.hideContextMenu()
}
const onBlur = () => wb.hideContextMenu()

onMounted(() => {
  // Keep the menu on screen, flipping like VS Code when it would overflow.
  const rect = el.value!.getBoundingClientRect()
  if (rect.right > innerWidth) position.value.left = Math.max(0, props.menu.x - rect.width)
  if (rect.bottom > innerHeight) position.value.top = Math.max(0, props.menu.y - rect.height)
  window.addEventListener('keydown', onKeydown, true)
  window.addEventListener('pointerdown', onPointerDown, true)
  window.addEventListener('blur', onBlur)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown, true)
  window.removeEventListener('pointerdown', onPointerDown, true)
  window.removeEventListener('blur', onBlur)
})
</script>

<template>
  <div
    ref="el"
    class="context-menu"
    role="menu"
    :style="{ left: position.left + 'px', top: position.top + 'px' }"
  >
    <template v-for="(row, i) in rows" :key="i">
      <div v-if="row.separator" class="separator" role="separator" />
      <div
        v-else
        class="action"
        role="menuitem"
        :class="{ disabled: row.disabled, focused: i === focused }"
        :aria-disabled="row.disabled"
        @mouseenter="focused = row.disabled ? -1 : i"
        @mouseleave="focused = -1"
        @click="!row.disabled && run(row.item)"
      >
        <span class="label">{{ row.label }}</span>
        <span v-if="row.keybinding" class="keybinding">{{ formatKeybinding(row.keybinding) }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 200;
  min-width: 160px;
  padding: 4px;
  color: var(--vscode-menu-foreground);
  background: var(--vscode-menu-background);
  border: 1px solid var(--vscode-menu-border);
  border-radius: 6px;
  box-shadow: 0 2px 8px var(--vscode-widget-shadow);
}
.action {
  display: flex;
  justify-content: space-between;
  gap: 32px;
  height: 24px;
  padding: 0 22px 0 26px;
  line-height: 24px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}
.action.focused {
  color: var(--vscode-menu-selectionForeground);
  background: var(--vscode-menu-selectionBackground);
  outline: 1px solid var(--vscode-contrastActiveBorder);
}
.action.disabled {
  opacity: 0.4;
  cursor: default;
}
.keybinding {
  font-size: 12px;
  opacity: 0.8;
}
.separator {
  height: 1px;
  margin: 4px 0;
  background: var(--vscode-menu-separatorBackground);
}
</style>
