<template>
  <div
    id="info-overlay"
    class="info-overlay"
    aria-hidden="true"
  >
    <div
      class="info-modal"
      role="dialog"
      aria-labelledby="info-title"
    >
      <div class="info-header">
        <h2 id="info-title">{{ t('infoTitle') }}</h2>
        <button
          id="info-close"
          type="button"
          class="info-close"
          :aria-label="t('close')"
          @click="closeInfoModal"
        >
          ×
        </button>
      </div>
      <div class="info-body">
        <div class="info-version-row">
          <span class="info-version-label">{{ t('infoVersionLabel') }}</span>
          <span
            id="info-version-value"
            class="info-version-value"
          >–</span>
        </div>
        <div
          id="info-changelog-list"
          class="info-changelog-list"
          role="list"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { t } from '../../../application/strings.js';
import { closeInfoModal } from '../../mount/mountModals.js';
</script>
