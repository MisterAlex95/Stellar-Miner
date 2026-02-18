<template>
  <div
    id="expedition-modal-overlay"
    class="expedition-modal-overlay"
    aria-hidden="true"
    @click.self="closeExpeditionModal"
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
          @click="closeExpeditionModal"
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
      <div
        class="expedition-modal-actions"
        @click="onActionsClick"
      >
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
import { closeExpeditionModal, onLaunchExpeditionClick } from '../expeditionModal.js';

function onActionsClick(e: MouseEvent): void {
  const target = e.target as HTMLElement;
  if (target.id === 'expedition-modal-cancel' || target.closest('#expedition-modal-cancel')) {
    closeExpeditionModal();
  } else if (target.id === 'expedition-modal-launch' || target.closest('#expedition-modal-launch')) {
    onLaunchExpeditionClick();
  }
}
</script>
