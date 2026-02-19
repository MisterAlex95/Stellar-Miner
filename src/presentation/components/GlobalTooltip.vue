<template>
  <div
    v-show="tooltipVisible"
    ref="elRef"
    id="custom-tooltip"
    role="tooltip"
    :aria-hidden="!tooltipVisible"
    class="custom-tooltip"
    :class="{ 'custom-tooltip--visible': tooltipVisible, 'custom-tooltip--below': position.showBelow }"
    :style="{ left: position.left + 'px', top: position.top + 'px' }"
  >
    {{ tooltipText }}
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import {
  tooltipVisible,
  tooltipText,
  tooltipAnchor,
  computeTooltipPosition,
  startSyncInterval,
  stopSyncInterval,
  useTooltip,
} from '../composables/useTooltip.js';

const elRef = ref<HTMLElement | null>(null);

const position = ref<{ left: number; top: number; showBelow: boolean }>({
  left: 0,
  top: 0,
  showBelow: false,
});

function updatePosition(): void {
  if (!tooltipVisible.value || !tooltipAnchor.value || !elRef.value) return;
  const tipRect = elRef.value.getBoundingClientRect();
  const anchorRect = tooltipAnchor.value.getBoundingClientRect();
  position.value = computeTooltipPosition(tipRect, anchorRect);
}

watch(
  [tooltipVisible, tooltipAnchor],
  async () => {
    if (!tooltipVisible.value || !tooltipAnchor.value) return;
    await nextTick();
    updatePosition();
  },
  { flush: 'post' }
);

watch(tooltipVisible, (visible) => {
  if (visible) {
    startSyncInterval();
  } else {
    stopSyncInterval();
  }
});

useTooltip();

let positionInterval: ReturnType<typeof setInterval> | null = null;
onMounted(() => {
  positionInterval = setInterval(() => {
    if (tooltipVisible.value && tooltipAnchor.value && elRef.value) updatePosition();
  }, 150);
});
onUnmounted(() => {
  if (positionInterval) clearInterval(positionInterval);
});
</script>

<style scoped>
#custom-tooltip {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 9999;
  pointer-events: none;
  padding: 0.5rem 0.75rem;
  min-width: var(--tooltip-min-sm);
  max-width: var(--tooltip-max-sm);
  white-space: pre-line;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.35;
  color: var(--accent);
  background: linear-gradient(145deg, rgba(24, 27, 36, 0.98) 0%, var(--bg-panel) 100%);
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(0, 0, 0, 0.2);
  opacity: 0;
  visibility: hidden;
  transform: translateY(4px);
  transition: opacity 0.15s ease, visibility 0.15s ease, transform 0.15s ease;
}

#custom-tooltip::before {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -6px;
  margin-left: -6px;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid rgba(245, 158, 11, 0.35);
}

#custom-tooltip.custom-tooltip--below::before {
  bottom: auto;
  top: -6px;
  border-top: none;
  border-bottom: 6px solid rgba(245, 158, 11, 0.35);
}

#custom-tooltip.custom-tooltip--visible {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}
</style>

<style>
html[data-theme="light"] #custom-tooltip {
  color: var(--accent);
  background: linear-gradient(145deg, rgba(241, 243, 246, 0.98) 0%, var(--bg-panel) 100%);
  border-color: rgba(217, 119, 6, 0.4);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.08);
}

html[data-theme="light"] #custom-tooltip::before {
  border-top-color: rgba(217, 119, 6, 0.4);
}

html[data-theme="light"] #custom-tooltip.custom-tooltip--below::before {
  border-bottom-color: rgba(217, 119, 6, 0.4);
}
</style>
