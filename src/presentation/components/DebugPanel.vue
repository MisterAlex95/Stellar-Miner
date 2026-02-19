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
        >
          <div
            v-for="(row, i) in appUI.debugStats"
            :key="i"
            class="debug-row"
          >
            <span>{{ row.label }}</span>
            <span>{{ row.value }}</span>
          </div>
        </div>
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
import { t } from '../../application/strings.js';
import { handleDebugAction } from '../../application/handlers.js';
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

<style scoped>
.debug-panel {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 90;
  width: 280px;
  max-width: calc(100vw - 2rem);
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
  font-size: 0.8rem;
  opacity: 1;
  visibility: visible;
  transition: opacity 0.2s, visibility 0.2s, transform 0.2s;
}

.debug-panel--closed {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateX(8px);
}

.debug-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border);
  font-weight: 600;
  color: var(--text-dim);
}

.debug-close {
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-dim);
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
}

.debug-close:hover {
  color: var(--text);
  background: var(--bg-card);
}

.debug-panel-body {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.debug-section {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.debug-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  color: var(--text);
}

.debug-row span:first-child {
  color: var(--text-dim);
}

.debug-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.debug-btn {
  font-family: 'Exo 2', sans-serif;
  font-size: 0.75rem;
  padding: 0.35rem 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-dim);
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}

.debug-btn:hover {
  background: var(--border);
  color: var(--text);
  border-color: var(--text-dim);
}

.debug-hint {
  margin: 0;
  padding: 0.35rem 0.75rem;
  font-size: 0.7rem;
  color: var(--muted);
  border-top: 1px solid var(--border);
}

@media (max-width: 360px) {
  .debug-panel {
    left: 0.5rem;
    right: 0.5rem;
    top: auto;
    bottom: max(0.5rem, env(safe-area-inset-bottom));
    width: auto;
    max-width: none;
  }
}

@media (min-width: 361px) and (max-width: 767px) {
  .debug-panel {
    right: 0.75rem;
    left: 0.75rem;
    width: auto;
  }
}
</style>
