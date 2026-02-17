<template>
  <div
    id="section-rules-overlay"
    class="section-rules-overlay"
    aria-hidden="true"
  >
    <div
      class="section-rules-modal"
      role="dialog"
      aria-labelledby="section-rules-title"
      aria-describedby="section-rules-body"
    >
      <div class="section-rules-header">
        <h2
          id="section-rules-title"
          class="section-rules-title"
        ></h2>
        <button
          id="section-rules-close"
          type="button"
          class="section-rules-close"
          :aria-label="t('close')"
          @click="closeSectionRulesModal"
        >
          ×
        </button>
      </div>
      <div class="section-rules-content">
        <div
          id="section-rules-body"
          class="section-rules-body"
        ></div>
      </div>
      <div class="section-rules-actions">
        <button
          id="section-rules-got-it"
          type="button"
          class="section-rules-got-it"
          @click="closeSectionRulesModal"
        >
          {{ t('gotIt') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { t } from '../../../application/strings.js';
import { closeSectionRulesModal } from '../../mount/mountModals.js';
</script>
