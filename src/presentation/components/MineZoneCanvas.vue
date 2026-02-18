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
