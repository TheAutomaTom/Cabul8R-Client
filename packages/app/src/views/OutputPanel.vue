<script setup lang="ts">
import { useOutput } from '../output'

const output = useOutput()
</script>

<template>
  <pre class="output">{{ output.lines.join('\n') }}</pre>
</template>

<style scoped>
.output {
  margin: 0;
  font-family: var(--vscode-editor-font-family);
  font-size: 12px;
  line-height: 18px;
  white-space: pre-wrap;
  user-select: text;
}
</style>
