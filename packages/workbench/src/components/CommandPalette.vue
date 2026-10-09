<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { formatKeybinding, fuzzyScore } from '../commands'
import { useWorkbench } from '../workbench'

const wb = useWorkbench()
const prefix = wb.state.paletteMode === 'commands' ? '>' : ''
const query = ref(prefix)
const selected = ref(0)
const input = ref<HTMLInputElement>()
const list = ref<HTMLElement>()

interface Entry {
  id: string
  label: string
  detail?: string
  keybinding?: string
  run: () => void
}

const isCommandMode = computed(() => query.value.startsWith('>'))

const entries = computed<Entry[]>(() => {
  if (isCommandMode.value) {
    return wb.commands
      .all()
      .filter((c) => !c.hidden)
      .map((c) => ({
        id: c.id,
        label: c.category ? `${c.category}: ${c.title}` : c.title,
        keybinding: c.keybinding,
        run: () => wb.commands.execute(c.id),
      }))
  }
  // Quick open: editors are the only navigable items until sheets exist (M2).
  return wb.editors.map((e) => ({
    id: e.id,
    label: e.title,
    run: () => (wb.state.activeEditor = e.id),
  }))
})

const filtered = computed(() => {
  const q = isCommandMode.value ? query.value.slice(1).trim() : query.value.trim()
  return entries.value
    .map((e) => ({ e, score: fuzzyScore(q, e.label) }))
    .filter((x): x is { e: Entry; score: number } => x.score !== undefined)
    .sort((a, b) => a.score - b.score || a.e.label.localeCompare(b.e.label))
    .map((x) => x.e)
})

watch(query, () => (selected.value = 0))
watch(selected, async () => {
  await nextTick()
  list.value?.querySelector('.selected')?.scrollIntoView({ block: 'nearest' })
})

onMounted(() => input.value?.focus())

function close() {
  wb.state.paletteOpen = false
}

function accept(entry = filtered.value[selected.value]) {
  if (!entry) return
  close()
  entry.run()
}

function onKeydown(e: KeyboardEvent) {
  const count = filtered.value.length
  if (e.key === 'ArrowDown') selected.value = count ? (selected.value + 1) % count : 0
  else if (e.key === 'ArrowUp') selected.value = count ? (selected.value - 1 + count) % count : 0
  else if (e.key === 'Enter') accept()
  else if (e.key === 'Escape') close()
  else return
  e.preventDefault()
  e.stopPropagation()
}
</script>

<template>
  <div class="backdrop" @mousedown.self="close">
    <div class="quick-input" role="dialog" aria-label="Command Palette">
      <input
        ref="input"
        v-model="query"
        class="wb-input"
        spellcheck="false"
        :placeholder="isCommandMode ? '' : 'Search sheets by name (type > for commands)'"
        aria-label="Type the name of a command to run."
        @keydown="onKeydown"
        @blur="close"
      />
      <ul ref="list" class="list" role="listbox">
        <li
          v-for="(entry, i) in filtered"
          :key="entry.id"
          role="option"
          :class="{ selected: i === selected }"
          :aria-selected="i === selected"
          @mousedown.prevent="accept(entry)"
          @mousemove="selected = i"
        >
          <span class="label">{{ entry.label }}</span>
          <span v-if="entry.keybinding" class="keys">
            <kbd
              v-for="k in formatKeybinding(entry.keybinding).split('+')"
              :key="k"
              class="wb-kbd"
              >{{ k }}</kbd
            >
          </span>
        </li>
        <li v-if="!filtered.length" class="empty">No matching results</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
}
.quick-input {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: min(600px, calc(100% - 32px));
  padding: 6px 0 4px;
  color: var(--vscode-quickInput-foreground);
  background: var(--vscode-quickInput-background);
  border: 1px solid var(--vscode-widget-border);
  border-radius: 6px;
  box-shadow: 0 0 8px 2px var(--vscode-widget-shadow);
}
.wb-input {
  display: block;
  width: calc(100% - 12px);
  margin: 0 6px 4px;
}
.list {
  max-height: 440px;
  margin: 0;
  padding: 0 4px;
  overflow-y: auto;
  list-style: none;
}
li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 22px;
  padding: 0 8px;
  border-radius: 3px;
  cursor: pointer;
}
li.selected {
  color: var(--vscode-quickInputList-focusForeground);
  background: var(--vscode-quickInputList-focusBackground);
  outline: 1px dotted var(--vscode-contrastActiveBorder);
}
li.empty {
  cursor: default;
  color: var(--vscode-descriptionForeground);
}
.keys {
  display: flex;
  gap: 2px;
}
</style>
