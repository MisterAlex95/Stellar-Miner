<template>
  <div id="upgrade-list" class="upgrade-list" @click="onUpgradeClick">
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

const { cards, emptyText } = useUpgradeList();
const { onUpgradeClick } = useUpgradeActions();
</script>
