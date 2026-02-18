<template>
  <div
    id="chart-help-overlay"
    class="chart-help-overlay"
    aria-hidden="true"
    @click.self="closeChartHelpModal"
  >
    <div
      class="chart-help-modal"
      role="dialog"
      aria-labelledby="chart-help-modal-title"
      aria-describedby="chart-help-modal-body"
    >
      <div class="chart-help-modal-header">
        <h2
          id="chart-help-modal-title"
          class="chart-help-modal-title"
        >
          {{ appUI.chartHelpTitle }}
        </h2>
        <button
          id="chart-help-close"
          type="button"
          class="chart-help-close"
          :aria-label="t('close')"
          @click="closeChartHelpModal"
        >
          ×
        </button>
      </div>
      <p
        id="chart-help-modal-body"
        class="chart-help-modal-body"
        aria-describedby="chart-help-modal-body"
      >
        {{ appUI.chartHelpBody }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { t } from '../../application/strings.js';
import { useOverlay } from '../composables/useOverlay.js';
import { useAppUIStore } from '../stores/appUI.js';

const CHART_HELP_OVERLAY_ID = 'chart-help-overlay';
const CHART_HELP_OPEN_CLASS = 'chart-help-overlay--open';

const appUI = storeToRefs(useAppUIStore());
const { closeOverlay } = useOverlay();

function closeChartHelpModal(): void {
  closeOverlay(CHART_HELP_OVERLAY_ID, CHART_HELP_OPEN_CLASS);
}
</script>
