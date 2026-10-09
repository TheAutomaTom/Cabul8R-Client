<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatLength, parseLength } from '@cabul8r/units'
import { useSettings } from '../settings'

/**
 * Length input that accepts expressions (1.25+.5, 1.1/8*3, 1'-3 1/2") and shows how it
 * reads them before committing. The model value is always millimeters.
 */
const model = defineModel<number | undefined>()
const props = defineProps<{ label?: string; placeholder?: string }>()
const emit = defineEmits<{ commit: [mm: number] }>()

const settings = useSettings()
const text = ref('')
const focused = ref(false)

const format = (mm: number) =>
  formatLength(mm, { style: settings.lengthStyle, denominator: settings.denominator })

const parsed = computed(() =>
  text.value.trim() === '' ? undefined : parseLength(text.value, { system: settings.system }),
)
const preview = computed(() => (parsed.value?.ok ? format(parsed.value.mm) : undefined))
/** Hide the chip when it would only echo what was typed. */
const showPreview = computed(
  () => focused.value && preview.value !== undefined && preview.value !== text.value.trim(),
)
const placeholder = computed(
  () => props.placeholder ?? (settings.system === 'imperial' ? `0'-0"` : '0 mm'),
)
const error = computed(() => (parsed.value && !parsed.value.ok ? parsed.value : undefined))

// Show the stored value whenever it changes from outside or the unit system flips.
watch(
  () => [model.value, settings.system, settings.lengthStyle, settings.denominator] as const,
  () => {
    if (!focused.value) text.value = model.value === undefined ? '' : format(model.value)
  },
  { immediate: true },
)

function commit() {
  if (!parsed.value?.ok) return
  model.value = parsed.value.mm
  text.value = format(parsed.value.mm)
  emit('commit', parsed.value.mm)
}

function revert() {
  text.value = model.value === undefined ? '' : format(model.value)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') commit()
  else if (e.key === 'Escape') revert()
  else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    const base = parsed.value?.ok ? parsed.value.mm : (model.value ?? 0)
    const step = settings.nudgeMm * (e.shiftKey ? 10 : 1) * (e.key === 'ArrowUp' ? 1 : -1)
    text.value = format(base + step)
    commit()
  } else return
  e.preventDefault()
}

function onBlur() {
  focused.value = false
  if (parsed.value?.ok) commit()
  else revert()
}
</script>

<template>
  <label class="dimension-input" :class="{ invalid: !!error }">
    <span v-if="props.label" class="label">{{ props.label }}</span>
    <span class="field">
      <input
        v-model="text"
        class="wb-input"
        spellcheck="false"
        autocomplete="off"
        :placeholder="placeholder"
        :aria-invalid="!!error"
        @focus="focused = true"
        @blur="onBlur"
        @keydown="onKeydown"
      />
      <span v-if="showPreview" class="chip" aria-live="polite">= {{ preview }}</span>
      <span v-else-if="focused && error" class="message" role="alert">{{ error.error }}</span>
    </span>
  </label>
</template>

<style scoped>
.dimension-input {
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
}
.label {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}
.field {
  position: relative;
  display: inline-flex;
}
.wb-input {
  width: 180px;
  font-family: var(--vscode-editor-font-family);
}
.invalid .wb-input {
  border-color: var(--vscode-inputValidation-errorBorder);
}
.chip,
.message {
  position: absolute;
  top: 50%;
  left: calc(100% + 6px);
  transform: translateY(-50%);
  padding: 1px 6px;
  font-family: var(--vscode-editor-font-family);
  font-size: 12px;
  white-space: nowrap;
  border-radius: 9px;
}
.chip {
  color: var(--vscode-badge-foreground);
  background: var(--vscode-badge-background);
}
.message {
  color: var(--vscode-errorForeground);
}
</style>
