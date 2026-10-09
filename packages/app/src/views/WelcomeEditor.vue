<script setup lang="ts">
import { ref } from 'vue'
import { formatLength } from '@cabul8r/units'
import { useWorkbench } from '@cabul8r/workbench'
import DimensionInput from '../components/DimensionInput.vue'
import { useSettings } from '../settings'

const wb = useWorkbench()
const settings = useSettings()
const width = ref<number | undefined>(15.5 * 25.4)
const height = ref<number | undefined>()

const examples = ['1.25+.5', '1.1/8*3', `1'-3 1/2"`, `1'3.1/2`, '5ft 6in', '1m 20cm', '(2+1)ft']
const fmt = (mm: number) => formatLength(mm, { style: 'mm', decimals: 3 })
</script>

<template>
  <div class="welcome">
    <h1>Cabul8R</h1>
    <p class="subtitle">Takeoff and estimating for specialty manufactured products.</p>

    <section>
      <h2>Start</h2>
      <a href="#" @click.prevent="wb.commands.execute('cabul8r.openPdf')">
        <span class="codicon codicon-file-pdf" /> Open PDF Plans...
      </a>
      <a href="#" @click.prevent="wb.commands.execute('workbench.action.showCommands')">
        <span class="codicon codicon-terminal" /> Show All Commands
      </a>
    </section>

    <section>
      <h2>Measurement Scratchpad</h2>
      <p class="hint">
        Type a length or an expression. Stored values are always millimeters; switch units from the
        status bar. Arrow keys nudge (Shift ×10).
      </p>
      <div class="inputs">
        <DimensionInput v-model="width" label="Width" />
        <DimensionInput v-model="height" label="Height" />
      </div>
      <p class="stored">
        Stored: {{ width === undefined ? '—' : fmt(width) }} ×
        {{ height === undefined ? '—' : fmt(height) }}
      </p>
      <p class="hint">
        Try:
        <code v-for="e in examples" :key="e">{{ e }}</code>
      </p>
      <p class="hint">
        <code>1.1/8</code> reads as 1⅛ (a dotted mixed number) when the fraction is proper;
        <code>1.5/2</code> is 1.5 ÷ 2.
      </p>
    </section>

    <section>
      <h2>Display</h2>
      <p class="hint">Units: {{ settings.system }} · precision 1/{{ settings.denominator }}"</p>
    </section>
  </div>
</template>

<style scoped>
.welcome {
  max-width: 760px;
  padding: 40px 48px;
  user-select: text;
}
h1 {
  margin: 0;
  font-size: 32px;
  font-weight: 400;
}
h2 {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 400;
}
.subtitle {
  margin: 4px 0 32px;
  font-size: 15px;
  color: var(--vscode-descriptionForeground);
}
section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 32px;
}
a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  color: var(--vscode-textLink-foreground);
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}
.inputs {
  display: flex;
  flex-wrap: wrap;
  gap: 120px;
  margin: 6px 0;
}
.hint,
.stored {
  margin: 0;
  color: var(--vscode-descriptionForeground);
}
code {
  margin: 0 3px;
  padding: 0 4px;
  font-family: var(--vscode-editor-font-family);
  border-radius: 3px;
  background: var(--vscode-keybindingLabel-background);
}
</style>
