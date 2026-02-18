<template>
  <div
    ref="containerRef"
    id="mine-zone-visual"
    class="mine-zone-visual"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { createMineZone3D } from '../../MineZone3D.js';
import { getSettings, getEventContext, setMineZoneCanvasApi } from '../../../application/gameState.js';

const containerRef = ref<HTMLElement | null>(null);

onMounted(() => {
  if (!containerRef.value) return;
  setMineZoneCanvasApi(createMineZone3D(containerRef.value, getSettings, getEventContext));
});

onUnmounted(() => {
  setMineZoneCanvasApi(null);
});
</script>
