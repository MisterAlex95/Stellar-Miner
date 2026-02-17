<template>
  <div
    id="expedition-modal-overlay"
    class="expedition-modal-overlay"
    aria-hidden="true"
  >
    <div
      class="expedition-modal"
      role="dialog"
      aria-labelledby="expedition-modal-title"
    >
      <div class="expedition-modal-header">
        <h2
          id="expedition-modal-title"
          class="expedition-modal-title"
        ></h2>
        <button
          id="expedition-modal-close"
          type="button"
          class="expedition-modal-close"
          :aria-label="t('close')"
        >
          ×
        </button>
      </div>
      <div class="expedition-modal-body">
        <div class="expedition-modal-cost-wrap">
          <p
            id="expedition-modal-cost"
            class="expedition-modal-cost"
          ></p>
          <span
            id="expedition-modal-new-system"
            class="expedition-new-system"
            aria-hidden="true"
            title=""
          ></span>
        </div>
        <h3
          id="expedition-modal-dest-title"
          class="expedition-modal-dest-title"
        >
          {{ t('expeditionSelectTier') }}
        </h3>
        <div
          id="expedition-modal-tiers"
          class="expedition-modal-tiers"
          role="group"
          aria-label="Destination"
        ></div>
        <h3
          id="expedition-modal-crew-title"
          class="expedition-crew-section-title"
        >
          {{ t('crew') }}
        </h3>
        <div
          id="expedition-modal-crew"
          class="expedition-modal-crew-wrap"
        ></div>
      </div>
      <div class="expedition-modal-actions">
        <button
          id="expedition-modal-cancel"
          type="button"
          class="expedition-modal-cancel"
        >
          {{ t('cancel') }}
        </button>
        <button
          id="expedition-modal-launch"
          type="button"
          class="expedition-modal-launch"
          disabled
        >
          {{ t('expeditionLaunch') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { t } from '../../../application/strings.js';
</script>
