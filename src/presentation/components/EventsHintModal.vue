<template>
  <div
    id="events-hint-overlay"
    class="events-hint-overlay"
    aria-hidden="true"
    @click.self="closeEventsHintModal"
  >
    <div
      class="events-hint-modal"
      role="dialog"
      aria-labelledby="events-hint-modal-title"
      aria-describedby="events-hint-modal-body"
    >
      <div class="events-hint-modal-header">
        <h2 id="events-hint-modal-title">{{ t('eventsHintTitle') }}</h2>
        <button
          id="events-hint-close"
          type="button"
          class="events-hint-close"
          :aria-label="t('close')"
          @click="closeEventsHintModal"
        >
          ×
        </button>
      </div>
      <div
        id="events-hint-modal-body"
        class="events-hint-modal-body"
        aria-describedby="events-hint-modal-body"
        v-html="store.stats.eventsHintBodyHtml"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { t } from '../../application/strings.js';
import { useOverlay } from '../composables/useOverlay.js';
import { useGameStateStore } from '../stores/gameState.js';

const EVENTS_HINT_OVERLAY_ID = 'events-hint-overlay';
const EVENTS_HINT_OPEN_CLASS = 'events-hint-overlay--open';
const store = useGameStateStore();
const { closeOverlay } = useOverlay();

function closeEventsHintModal(): void {
  closeOverlay(EVENTS_HINT_OVERLAY_ID, EVENTS_HINT_OPEN_CLASS);
}
</script>

<style scoped>
.events-hint-overlay {
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

.events-hint-overlay--open {
  opacity: 1;
  visibility: visible;
}

.events-hint-modal {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 100%;
  max-width: 420px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.events-hint-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.events-hint-modal-header h2 {
  margin: 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text);
}

.events-hint-close {
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

.events-hint-close:hover {
  color: var(--text);
  background: var(--bg-card);
}

.events-hint-modal-body {
  padding: 1rem 1.25rem;
  overflow-y: auto;
}
</style>
