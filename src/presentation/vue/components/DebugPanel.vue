<template>
  <Teleport to="body">
    <div
      id="debug-panel"
      ref="panelRef"
      class="debug-panel"
      :class="{ 'debug-panel--closed': !appUI.debugOpen, 'debug-panel--open': appUI.debugOpen }"
      :aria-hidden="!appUI.debugOpen"
      @click="onPanelClick"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { buildDebugPanelHtml } from '../../components/debugPanel.js';
import { applyTranslations } from '../../../application/strings.js';
import { handleDebugAction } from '../../../application/handlers.js';
import { useAppUIStore } from '../stores/appUI.js';

const appUI = useAppUIStore();
const panelRef = ref<HTMLElement | null>(null);

function onPanelClick(e: MouseEvent): void {
  const target = e.target as HTMLElement;
  const closeBtn = target.closest('#debug-close');
  if (closeBtn) {
    appUI.debugOpen = false;
    return;
  }
  const debugBtn = target.closest('.debug-btn');
  if (debugBtn) {
    const action = debugBtn.getAttribute('data-debug');
    if (action) handleDebugAction(action);
  }
}

onMounted(() => {
  if (!panelRef.value) return;
  panelRef.value.innerHTML = buildDebugPanelHtml();
  applyTranslations();
});

watch(
  () => appUI.debugOpen,
  (open) => {
    applyTranslations();
  }
);
</script>
