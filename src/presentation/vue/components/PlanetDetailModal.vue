<template>
  <div
    id="planet-detail-overlay"
    class="planet-detail-overlay"
    aria-hidden="true"
  >
    <div
      class="planet-detail-modal"
      role="dialog"
      aria-labelledby="planet-detail-title"
    >
      <div class="planet-detail-header">
        <h2 id="planet-detail-title">{{ t('planetDetailTitle') }}</h2>
        <button
          id="planet-detail-close"
          type="button"
          class="planet-detail-close"
          :aria-label="t('close')"
          @click="closePlanetDetail"
        >
          ×
        </button>
      </div>
      <div
        id="planet-detail-body"
        class="planet-detail-body"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { t } from '../../../application/strings.js';
import { closePlanetDetail } from '../../planetDetailView.js';
</script>
