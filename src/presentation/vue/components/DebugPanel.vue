<template>
  <Teleport to="body">
    <div
      id="debug-panel"
      class="debug-panel"
      :class="{ 'debug-panel--closed': !appUI.debugOpen, 'debug-panel--open': appUI.debugOpen }"
      :aria-hidden="!appUI.debugOpen"
      @click="onPanelClick"
    >
      <div class="debug-panel-header">
        <span>{{ t('debug') }}</span>
        <button
          type="button"
          class="debug-close"
          id="debug-close"
          :aria-label="t('closeDebug')"
        >
          ×
        </button>
      </div>
      <div class="debug-panel-body">
        <div
          class="debug-section"
          id="debug-stats"
        />
        <div class="debug-section">
          <div class="debug-actions">
            <button
              type="button"
              class="debug-btn"
              data-debug="coins-1k"
            >
              +1K coins
            </button>
            <button
              type="button"
              class="debug-btn"
              data-debug="coins-50k"
            >
              +50K coins
            </button>
            <button
              type="button"
              class="debug-btn"
              data-debug="trigger-event"
            >
              {{ t('debugTriggerEvent') }}
            </button>
            <button
              type="button"
              class="debug-btn"
              data-debug="clear-events"
            >
              {{ t('debugClearEvents') }}
            </button>
            <button
              type="button"
              class="debug-btn"
              data-debug="add-planet"
            >
              {{ t('debugAddPlanet') }}
            </button>
          </div>
        </div>
      </div>
      <p
        class="debug-hint"
      >
        {{ t('debugF3Hint') }}
      </p>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { t } from '../../../application/strings.js';
import { handleDebugAction } from '../../../application/handlers.js';
import { useAppUIStore } from '../stores/appUI.js';

const appUI = useAppUIStore();

function onPanelClick(e: MouseEvent): void {
  const target = e.target as HTMLElement;
  const closeBtn = target.closest('#debug-close');
  if (closeBtn) {
    appUI.debugOpen = false;
    return;
  }
  const debugBtn = target.closest('.debug-btn');
  if (debugBtn) {
    const action = debugBtn.getAttribute('data-debug');
    if (action) handleDebugAction(action);
  }
}
</script>
