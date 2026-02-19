<template>
  <div
    ref="containerRef"
    id="mine-zone-visual"
    class="mine-zone-visual"
  />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useMineZoneCanvas } from '../composables/useMineZoneCanvas.js';

const containerRef = ref<HTMLElement | null>(null);

onMounted(() => {
  useMineZoneCanvas(containerRef.value);
});
</script>

<style scoped>
.mine-zone-visual {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  min-height: inherit;
  border-radius: 16px;
  pointer-events: none;
}

.mine-zone-visual :deep(.mine-zone-canvas) {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 100%;
  border-radius: 16px;
  -webkit-tap-highlight-color: transparent;
  tap-highlight-color: transparent;
}
</style>
