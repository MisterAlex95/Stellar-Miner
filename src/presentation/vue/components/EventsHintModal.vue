<template>
  <div
    id="events-hint-overlay"
    class="events-hint-overlay"
    aria-hidden="true"
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
import { t } from '../../../application/strings.js';
import { closeOverlay } from '../../components/overlay.js';
import { useGameStateStore } from '../stores/gameState.js';

const EVENTS_HINT_OVERLAY_ID = 'events-hint-overlay';
const EVENTS_HINT_OPEN_CLASS = 'events-hint-overlay--open';
const store = useGameStateStore();

function closeEventsHintModal(): void {
  closeOverlay(EVENTS_HINT_OVERLAY_ID, EVENTS_HINT_OPEN_CLASS);
}
</script>
