<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ orientation: 'vertical' | 'horizontal' }>()
const emit = defineEmits<{ drag: [delta: number] }>()
const active = ref(false)

function onPointerDown(e: PointerEvent) {
  const target = e.currentTarget as HTMLElement
  target.setPointerCapture(e.pointerId)
  active.value = true
  let last = props.orientation === 'vertical' ? e.clientX : e.clientY
  const move = (ev: PointerEvent) => {
    const pos = props.orientation === 'vertical' ? ev.clientX : ev.clientY
    emit('drag', pos - last)
    last = pos
  }
  const up = () => {
    active.value = false
    target.removeEventListener('pointermove', move)
    target.removeEventListener('pointerup', up)
  }
  target.addEventListener('pointermove', move)
  target.addEventListener('pointerup', up)
}
</script>

<template>
  <div class="sash" :class="[orientation, { active }]" @pointerdown="onPointerDown" />
</template>

<style scoped>
.sash {
  position: relative;
  flex: 0 0 4px;
  z-index: 5;
  transition: background-color 0.1s ease-out 0.3s;
}
.sash.vertical {
  margin: 0 -2px;
  cursor: ew-resize;
}
.sash.horizontal {
  margin: -2px 0;
  cursor: ns-resize;
}
.sash:hover,
.sash.active {
  background: var(--vscode-sash-hoverBorder);
}
</style>
