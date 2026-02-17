<template>
  <div class="upgrade-list" @click="onUpgradeClick">
    <div ref="cardsContainerRef" class="upgrade-list-cards"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import { useGameStateStore } from '../stores/gameState.js';
import { renderUpgradeList, updateUpgradeListInPlace } from '../../upgradeListView.js';
import { useUpgradeActions } from '../composables/useUpgradeActions.js';

const gameState = useGameStateStore();
const { onUpgradeClick } = useUpgradeActions();
const cardsContainerRef = ref<HTMLElement | null>(null);

onMounted(() => {
  nextTick(() => {
    const container = cardsContainerRef.value;
    if (container) renderUpgradeList(container);
  });
});

watch(
  () => gameState,
  () => {
    updateUpgradeListInPlace();
  },
  { deep: true }
);
</script>
