<template>
  <section
    ref="statsSectionRef"
    class="stats"
    :class="{ 'stats--compact': compact }"
    aria-label="Stats"
  >
    <div
      id="coins-stat-card"
      class="stat-card stat-card--coins"
      :class="{ 'stat-card--bump': showBump }"
      :title="t('coinsTitle')"
    >
      <div class="stat-label">{{ t('coins') }}</div>
      <div
        id="coins-value"
        class="stat-value stat-value--hero"
      >
        {{ store.stats.formattedCoins }}
      </div>
      <div
        id="crew-stat-line"
        class="stat-coins-extra"
        aria-live="polite"
        :style="store.stats.showCrew ? '' : { display: 'none' }"
      >
        {{ store.stats.crewLine }}
      </div>
      <div
        id="crew-stat-detail"
        class="stat-coins-extra stat-coins-extra--sub"
        aria-live="polite"
        :style="store.stats.showCrew ? '' : { display: 'none' }"
      >
        {{ store.stats.crewDetail }}
      </div>
      <div
        id="crew-stat-by-job"
        class="stat-coins-extra stat-coins-extra--sub"
        aria-live="polite"
        :style="store.stats.showCrew ? '' : { display: 'none' }"
      >
        <template
          v-for="(item, i) in store.stats.crewByJob"
          :key="item.role"
        >
          <span v-if="i > 0">, </span>
          <span :class="['crew-stat-role', 'crew-stat-role--' + item.role]">{{ item.text }}</span>
        </template>
      </div>
    </div>
    <div
      id="crew-compact-card"
      class="stat-card stat-card--crew stats-compact-only"
      :style="store.stats.crewUnlocked ? '' : { display: 'none' }"
      :aria-hidden="!compact"
    >
      <div class="stat-label">{{ t('astronautsLabel') }}</div>
      <div
        id="stats-compact-crew"
        class="stat-value"
      >
        {{ store.stats.crewCompact }}
      </div>
    </div>
    <div
      id="production-stat-card"
      class="stat-card stat-card--production"
      :class="{ 'stat-card--live': store.stats.productionLive }"
      :title="t('productionTitle')"
    >
      <div class="stat-label">
        <span>{{ t('production') }}</span>
        <span
          id="production-live"
          class="production-live"
          aria-hidden="true"
        >{{ store.stats.productionLive ? '●' : '' }}</span>
      </div>
      <div
        id="production-value"
        class="stat-value"
      >
        {{ store.stats.formattedProduction }}
      </div>
      <div
        id="production-breakdown"
        class="stat-breakdown"
        aria-hidden="true"
        :style="store.stats.productionBreakdownVisible ? '' : { display: 'none' }"
      >
        {{ store.stats.productionBreakdown }}
      </div>
      <div
        id="events-line"
        class="events-line"
      >
        <div class="events-line-content">
          <div
            id="active-events"
            class="active-events"
            aria-live="polite"
            :style="store.stats.activeEventsVisible ? 'flex' : { display: 'none' }"
            v-html="store.stats.activeEventsHtml"
          />
          <div
            id="next-event-row"
            class="next-event-row"
            :style="store.stats.activeEventsVisible ? { display: 'none' } : 'flex'"
          >
            <span
              id="next-event-label"
              class="next-event-label"
              :aria-hidden="!store.stats.nextEventLabelVisible"
              :style="store.stats.nextEventLabelVisible ? '' : { display: 'none' }"
            >{{ t('nextEventLabel') }}</span>
            <div
              id="next-event-progress-wrap"
              class="next-event-progress-wrap"
              :style="store.stats.activeEventsVisible ? { display: 'none' } : ''"
              aria-hidden="true"
            >
              <div
                id="next-event-progress-bar"
                class="next-event-progress-bar"
                role="progressbar"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-valuenow="Math.round(store.stats.nextEventPct)"
                :style="{ width: store.stats.nextEventPct + '%' }"
              />
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
            :title="t('eventsHintTitle')"
            @click="openEventsHintModal"
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
    :style="spacerStyle"
  />
  <p
    id="next-milestone"
    class="next-milestone"
    aria-live="polite"
    :style="store.stats.nextMilestoneVisible ? '' : { display: 'none' }"
  >
    {{ store.stats.nextMilestoneText }}
  </p>
  <div
    :id="toastContainerId"
    class="event-toasts"
    aria-live="polite"
  />
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import { t } from '../../../application/strings.js';
import { TOAST_CONTAINER_ID } from '../../components/toasts.js';
import { useGameStateStore } from '../stores/gameState.js';
import { useStatsCompact } from '../composables/useStatsCompact.js';
import { openOverlay } from '../../components/overlay.js';

const EVENTS_HINT_OVERLAY_ID = 'events-hint-overlay';
const EVENTS_HINT_OPEN_CLASS = 'events-hint-overlay--open';

function openEventsHintModal(): void {
  openOverlay(EVENTS_HINT_OVERLAY_ID, EVENTS_HINT_OPEN_CLASS, { focusId: 'events-hint-close' });
}

const toastContainerId = TOAST_CONTAINER_ID;
const store = useGameStateStore();
const statsSectionRef = ref<HTMLElement | null>(null);
const { compact, spacerStyle } = useStatsCompact(statsSectionRef);
const showBump = ref(false);
let bumpTimeoutId: ReturnType<typeof setTimeout> | null = null;
watch(
  () => store.stats.coinsBump,
  (bump) => {
    if (bump) {
      if (bumpTimeoutId) clearTimeout(bumpTimeoutId);
      showBump.value = true;
      bumpTimeoutId = setTimeout(() => {
        showBump.value = false;
        bumpTimeoutId = null;
      }, 400);
    }
  },
);
onUnmounted(() => {
  if (bumpTimeoutId) clearTimeout(bumpTimeoutId);
});
</script>
