<template>
  <div
    id="prestige-confirm-overlay"
    class="prestige-confirm-overlay"
    aria-hidden="true"
    @click.self="closePrestigeConfirmModal"
  >
    <div
      class="prestige-confirm-modal"
      role="alertdialog"
      aria-labelledby="prestige-confirm-title"
      aria-describedby="prestige-confirm-desc"
    >
      <h2 id="prestige-confirm-title">{{ t('prestigeConfirmTitle') }}</h2>
      <p id="prestige-confirm-desc">{{ appUI.prestigeConfirmDesc }}</p>
      <p id="prestige-confirm-after" class="prestige-confirm-after">{{ appUI.prestigeConfirmAfter }}</p>
      <p v-if="appUI.prestigeConfirmGainEstimate" id="prestige-confirm-gain" class="prestige-confirm-gain">
        {{ appUI.prestigeConfirmGainEstimate }}
      </p>
      <div class="prestige-confirm-actions">
        <button
          id="prestige-confirm-cancel"
          type="button"
          class="prestige-confirm-cancel"
          @click="closePrestigeConfirmModal"
        >
          {{ t('cancel') }}
        </button>
        <button
          id="prestige-confirm-do"
          type="button"
          class="prestige-confirm-do"
          @click="confirmPrestige"
        >
          {{ t('prestige') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { t } from '../../application/strings.js';
import { closePrestigeConfirmModal, confirmPrestige } from '../../application/handlers.js';
import { useAppUIStore } from '../stores/appUI.js';

const appUI = storeToRefs(useAppUIStore());
</script>
