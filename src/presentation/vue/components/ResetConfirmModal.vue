<template>
  <div
    id="reset-confirm-overlay"
    class="reset-confirm-overlay"
    aria-hidden="true"
  >
    <div
      class="reset-confirm-modal"
      role="alertdialog"
      aria-labelledby="reset-confirm-title"
      aria-describedby="reset-confirm-desc"
    >
      <h2 id="reset-confirm-title">{{ t('resetConfirmTitle') }}</h2>
      <p id="reset-confirm-desc">{{ t('resetConfirmDesc') }}</p>
      <div class="reset-confirm-actions">
        <button
          id="reset-confirm-cancel"
          type="button"
          class="reset-confirm-cancel"
          @click="closeResetConfirmModal"
        >
          {{ t('cancel') }}
        </button>
        <button
          id="reset-confirm-reset"
          type="button"
          class="reset-confirm-reset"
          @click="handleResetProgress"
        >
          {{ t('resetAll') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { t } from '../../../application/strings.js';
import { closeResetConfirmModal, handleResetProgress } from '../../../application/handlers.js';
</script>
