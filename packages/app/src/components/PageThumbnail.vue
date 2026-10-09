<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { isCancelled, renderRegion } from '@cabul8r/pdf'
import { usePlans } from '../plans'

/** A small preview of a page, rendered once it scrolls into view. */
const props = defineProps<{ pageId: string; width?: number }>()
const plans = usePlans()
const canvas = ref<HTMLCanvasElement>()
let observer: IntersectionObserver | undefined
let cancelled = false

async function render() {
  const page = plans.page(props.pageId)
  if (!page || !canvas.value) return
  const cssWidth = props.width ?? 48
  const dpr = window.devicePixelRatio || 1
  const zoom = (cssWidth / page.width) * dpr
  canvas.value.width = Math.ceil(page.width * zoom)
  canvas.value.height = Math.ceil(page.height * zoom)
  try {
    await renderRegion(await plans.pdfPage(props.pageId), canvas.value, zoom, 0, 0).promise
  } catch (e) {
    if (!isCancelled(e) && !cancelled) throw e
  }
}

onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      observer?.disconnect()
      void render()
    }
  })
  if (canvas.value) observer.observe(canvas.value)
})
onBeforeUnmount(() => {
  cancelled = true
  observer?.disconnect()
})
</script>

<template>
  <canvas ref="canvas" class="thumbnail" :style="{ width: (width ?? 48) + 'px' }" />
</template>

<style scoped>
.thumbnail {
  flex: none;
  aspect-ratio: auto;
  background: #fff;
  border: 1px solid var(--vscode-widget-border);
}
</style>
