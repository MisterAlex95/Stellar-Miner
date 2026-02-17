<template>
  <div
    id="upgrade-choose-planet-overlay"
    class="upgrade-choose-planet-overlay"
    aria-hidden="true"
  >
    <div
      class="upgrade-choose-planet-modal"
      role="dialog"
      aria-labelledby="upgrade-choose-planet-title"
    >
      <div class="upgrade-choose-planet-header">
        <h2
          id="upgrade-choose-planet-title"
          class="upgrade-choose-planet-title"
        ></h2>
        <button
          id="upgrade-choose-planet-close"
          type="button"
          class="upgrade-choose-planet-close"
          :aria-label="t('close')"
        >
          ×
        </button>
      </div>
      <div
        id="upgrade-choose-planet-list"
        class="upgrade-choose-planet-list"
        role="list"
      ></div>
      <div class="upgrade-choose-planet-actions">
        <button
          id="upgrade-choose-planet-cancel"
          type="button"
          class="upgrade-choose-planet-cancel"
        >
          {{ t('cancel') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { t } from '../../../application/strings.js';
</script>
