<template>
  <div class="statistics-panel-vue"></div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useGameStateStore } from '../stores/gameState.js';
import { renderStatisticsSection, updateStatisticsSection } from '../../statisticsView.js';

const gameState = useGameStateStore();

onMounted(() => {
  const container = document.getElementById('statistics-container');
  if (!container) return;
  renderStatisticsSection(container);
  updateStatisticsSection();
});

watch(
  () => gameState,
  () => {
    updateStatisticsSection();
  },
  { deep: true }
);
</script>
