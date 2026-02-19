<template>
  <div id="upgrade-list" class="upgrade-list" @click="onUpgradeClick">
    <p v-if="nextRecommendedText" class="upgrade-list-next-recommended" id="upgrades-next-recommended">
      {{ nextRecommendedText }}
    </p>
    <div v-if="cards.length === 0" class="empty-state" id="upgrades-empty-state">
      <span class="empty-state-icon" aria-hidden="true"></span>
      <p class="empty-state-text">{{ emptyText }}</p>
    </div>
    <div v-else class="upgrade-list-cards">
      <UpgradeCard
        v-for="item in cards"
        :key="item.def.id"
        :item="item"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUpgradeList } from '../composables/useUpgradeList.js';
import { useUpgradeActions } from '../composables/useUpgradeActions.js';
import UpgradeCard from '../components/UpgradeCard.vue';

const { cards, emptyText, nextRecommendedText } = useUpgradeList();
const { onUpgradeClick } = useUpgradeActions();
</script>

<style scoped>
.upgrade-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.upgrade-list-next-recommended {
  margin: 0 0 0.25rem 0;
  font-size: 0.9rem;
  opacity: 0.9;
}
</style>
