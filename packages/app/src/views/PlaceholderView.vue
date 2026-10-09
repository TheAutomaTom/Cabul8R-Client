<script setup lang="ts">
/** Stand-in for views whose milestone has not landed yet. */
defineProps<{ message: string; milestone: string; action?: { label: string; run: () => void } }>()
</script>

<template>
  <div class="placeholder">
    <p>{{ message }}</p>
    <button v-if="action" class="wb-button" @click="action.run">{{ action.label }}</button>
    <p class="milestone">Arrives in {{ milestone }}.</p>
  </div>
</template>

<style scoped>
.placeholder {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 20px;
  line-height: 1.4;
}
.placeholder p {
  margin: 0;
}
.milestone {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}
</style>
