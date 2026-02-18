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
