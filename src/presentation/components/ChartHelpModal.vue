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

<style scoped>
.chart-help-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.6);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s, visibility 0.2s;
}

.chart-help-overlay--open {
  opacity: 1;
  visibility: visible;
}

.chart-help-modal {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.chart-help-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
}

.chart-help-modal-title {
  margin: 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text);
}

.chart-help-close {
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-dim);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}

.chart-help-close:hover {
  color: var(--text);
  background: var(--bg-card);
}

.chart-help-modal-body {
  margin: 0;
  padding: 1rem 1.25rem;
  font-size: 0.95rem;
  line-height: 1.65;
  color: var(--text);
}
</style>
