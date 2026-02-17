<template>
  <section
      class="stats"
      aria-label="Stats"
    >
      <div
        id="coins-stat-card"
        class="stat-card stat-card--coins"
        :title="t('coinsTitle')"
      >
        <div class="stat-label">{{ t('coins') }}</div>
        <div
          id="coins-value"
          class="stat-value stat-value--hero"
        >
          0
        </div>
        <div
          id="crew-stat-line"
          class="stat-coins-extra"
          aria-live="polite"
        ></div>
        <div
          id="crew-stat-detail"
          class="stat-coins-extra stat-coins-extra--sub"
          aria-live="polite"
        ></div>
        <div
          id="crew-stat-by-job"
          class="stat-coins-extra stat-coins-extra--sub"
          aria-live="polite"
        ></div>
      </div>
      <div
        id="crew-compact-card"
        class="stat-card stat-card--crew stats-compact-only"
        aria-hidden="true"
      >
        <div class="stat-label">{{ t('astronautsLabel') }}</div>
        <div
          id="stats-compact-crew"
          class="stat-value"
        >
          0
        </div>
      </div>
      <div
        id="production-stat-card"
        class="stat-card stat-card--production"
        :title="t('productionTitle')"
      >
        <div class="stat-label">
          <span>{{ t('production') }}</span>
          <span
            id="production-live"
            class="production-live"
            aria-hidden="true"
          ></span>
        </div>
        <div
          id="production-value"
          class="stat-value"
        >
          0/s
        </div>
        <div
          id="production-breakdown"
          class="stat-breakdown"
          aria-hidden="true"
        ></div>
        <div
          id="events-line"
          class="events-line"
        >
          <div class="events-line-content">
            <div
              id="active-events"
              class="active-events"
              aria-live="polite"
            ></div>
            <div
              id="next-event-row"
              class="next-event-row"
            >
              <span
                id="next-event-label"
                class="next-event-label"
                aria-hidden="true"
              >{{ t('nextEventLabel') }}</span>
              <div
                id="next-event-progress-wrap"
                class="next-event-progress-wrap"
                aria-hidden="true"
              >
                <div
                  id="next-event-progress-bar"
                  class="next-event-progress-bar"
                  role="progressbar"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-valuenow="0"
                ></div>
              </div>
            </div>
          </div>
          <span
            id="events-hint-wrap"
            class="events-hint-wrap"
          >
            <button
              id="events-hint-trigger"
              type="button"
              class="events-hint-trigger"
              :aria-label="t('eventsHintTitle')"
              aria-haspopup="dialog"
              title=""
            >
              ?
            </button>
          </span>
        </div>
      </div>
  </section>
  <div
    id="stats-spacer"
    class="stats-spacer"
    aria-hidden="true"
  ></div>
  <p
    id="next-milestone"
    class="next-milestone"
    aria-live="polite"
  ></p>
  <div
    :id="toastContainerId"
    class="event-toasts"
    aria-live="polite"
  ></div>
</template>

<script setup lang="ts">
import { t } from '../../../application/strings.js';
import { TOAST_CONTAINER_ID } from '../../components/toasts.js';

const toastContainerId = TOAST_CONTAINER_ID;
</script>
