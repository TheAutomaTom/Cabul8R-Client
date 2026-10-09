<script setup lang="ts">
import { onBeforeUnmount, onMounted, provide } from 'vue'
import { matchKeybinding } from '../commands'
import { WORKBENCH, type Workbench } from '../workbench'
import ActivityBar from './ActivityBar.vue'
import CommandPalette from './CommandPalette.vue'
import ContextMenu from './ContextMenu.vue'
import EditorArea from './EditorArea.vue'
import PanelArea from './PanelArea.vue'
import Sash from './Sash.vue'
import SideBar from './SideBar.vue'
import StatusBar from './StatusBar.vue'

const props = defineProps<{ workbench: Workbench }>()
provide(WORKBENCH, props.workbench)
const state = props.workbench.state

function onKeydown(e: KeyboardEvent) {
  const command = matchKeybinding(props.workbench.commands, e)
  if (!command) return
  // Plain-key shortcuts (H, M, …) must not fire while typing.
  const typing = (e.target as HTMLElement | null)?.closest?.('input, textarea, [contenteditable]')
  if (typing && !e.ctrlKey && !e.metaKey && !e.altKey) return
  e.preventDefault()
  command.run()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  props.workbench.setTheme(state.theme)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

// Our own context menus replace the browser's, except in text fields where cut/copy/paste matter.
function onContextMenu(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('input, textarea, [contenteditable]')) e.preventDefault()
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
</script>

<template>
  <div class="workbench" @contextmenu="onContextMenu">
    <div class="workbench-main">
      <ActivityBar />
      <template v-if="state.sideBarVisible">
        <SideBar :style="{ width: state.sideBarWidth + 'px' }" />
        <Sash
          orientation="vertical"
          @drag="(d) => (state.sideBarWidth = clamp(state.sideBarWidth + d, 170, 800))"
        />
      </template>
      <div class="workbench-center">
        <EditorArea />
        <template v-if="state.panelVisible">
          <Sash
            orientation="horizontal"
            @drag="(d) => (state.panelHeight = clamp(state.panelHeight - d, 80, 900))"
          />
          <PanelArea :style="{ height: state.panelHeight + 'px' }" />
        </template>
      </div>
    </div>
    <StatusBar />
    <CommandPalette v-if="state.paletteOpen" />
    <ContextMenu
      v-if="state.contextMenu"
      :key="`${state.contextMenu.x},${state.contextMenu.y}`"
      :menu="state.contextMenu"
    />
  </div>
</template>

<style scoped>
.workbench {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}
.workbench-main {
  display: flex;
  flex: 1;
  min-height: 0;
}
.workbench-center {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}
</style>
