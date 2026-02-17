<template>
  <div
    id="prestige-rewards-overlay"
    class="prestige-rewards-overlay"
    aria-hidden="true"
  >
    <div
      class="prestige-rewards-modal"
      role="dialog"
      aria-labelledby="prestige-rewards-title"
      aria-describedby="prestige-rewards-desc"
    >
      <h2 id="prestige-rewards-title">{{ t('prestigeRewardsTitle') }}</h2>
      <p
        id="prestige-rewards-desc"
        class="prestige-rewards-intro"
      >
        {{ t('prestigeRewardsIntro') }}
      </p>
      <ul
        id="prestige-rewards-list"
        class="prestige-rewards-list"
        aria-describedby="prestige-rewards-desc"
      ></ul>
      <div class="prestige-confirm-actions">
        <button
          id="prestige-rewards-close"
          type="button"
          class="prestige-confirm-cancel"
          @click="closePrestigeRewardsModal"
        >
          {{ t('gotIt') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { t } from '../../../application/strings.js';
import { closePrestigeRewardsModal } from '../../../application/handlers.js';
</script>
