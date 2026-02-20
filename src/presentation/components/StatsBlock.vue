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
      :class="{
        'stat-card--live': store.stats.productionLive,
        'stat-card--production-positive': store.stats.productionEventModifier === 'positive',
        'stat-card--production-negative': store.stats.productionEventModifier === 'negative',
      }"
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
  <div
    v-if="store.stats.nextMilestoneVisible"
    class="next-milestone-wrap"
    aria-hidden="true"
  >
    <div
      class="next-milestone-bar"
      role="presentation"
    >
      <div
        class="next-milestone-bar-fill"
        :style="{ width: Math.min(100, store.stats.nextMilestonePct) + '%' }"
      />
    </div>
    <p
      id="next-milestone"
      class="next-milestone"
      aria-live="polite"
    >
      {{ store.stats.nextMilestoneText }}
    </p>
  </div>
  <div
    :id="toastContainerId"
    class="event-toasts"
    aria-live="polite"
  />
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import { t } from '../../application/strings.js';
import { useGameStateStore } from '../stores/gameState.js';
import { useStatsCompact } from '../composables/useStatsCompact.js';
import { useOverlay } from '../composables/useOverlay.js';
import { useToasts } from '../composables/useToasts.js';

const EVENTS_HINT_OVERLAY_ID = 'events-hint-overlay';
const EVENTS_HINT_OPEN_CLASS = 'events-hint-overlay--open';
const { openOverlay } = useOverlay();

function openEventsHintModal(): void {
  openOverlay(EVENTS_HINT_OVERLAY_ID, EVENTS_HINT_OPEN_CLASS, { focusId: 'events-hint-close' });
}

const { TOAST_CONTAINER_ID: toastContainerId } = useToasts();
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

<style scoped>
.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: stretch;
  gap: 1rem;
  margin-bottom: 1.5rem;
  position: sticky;
  top: 0;
  z-index: 30;
  background: transparent;
  padding-bottom: 0.5rem;
  transition: padding 0.35s ease;
}

.stats-spacer {
  display: none;
  pointer-events: none;
}

.stats--compact {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 560px;
  grid-template-columns: 1fr 1fr 1fr;
  padding-left: max(1rem, env(safe-area-inset-left));
  padding-right: max(1rem, env(safe-area-inset-right));
  padding-top: 0.35rem;
  padding-bottom: 0.35rem;
  margin-bottom: 0;
  margin-left: 0;
  margin-right: 0;
  transition: padding 0.35s ease;
}

.stats--compact .stats-compact-only {
  display: block;
}

.stats--compact .stat-card {
  padding: 0.35rem 0.6rem;
}

.stats--compact .stat-label {
  font-size: 0.55rem;
  margin-bottom: 0.1rem;
}

.stats--compact .stat-value,
.stats--compact .stat-value--hero {
  font-size: 0.85rem;
}

.stats--compact .stat-coins-extra,
.stats--compact .stat-breakdown,
.stats--compact .active-events,
.stats--compact .events-line {
  display: none !important;
}

.stats--compact .stat-card .stat-label .production-live {
  display: none;
}

.stat-card {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  transition: box-shadow 0.25s ease, transform 0.2s ease, border-color 0.2s ease, padding 0.35s ease;
}

.stat-card:hover {
  border-color: rgba(245, 158, 11, 0.2);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.stat-card--bump {
  contain: layout style paint;
  will-change: transform;
  animation: stat-bump 0.4s ease;
}

@keyframes stat-bump {
  0% { transform: scale(1); }
  35% { transform: scale(1.012); }
  70% { transform: scale(0.996); }
  100% { transform: scale(1); }
}

.stat-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-dim);
  margin-bottom: 0.25rem;
  transition: font-size 0.35s ease, margin-bottom 0.35s ease;
}

.stat-value {
  font-family: 'Orbitron', sans-serif;
  font-weight: 600;
  font-size: 1.5rem;
  color: var(--accent);
  transition: font-size 0.35s ease;
}

.stat-value--hero {
  font-size: 1.75rem;
  color: var(--accent);
  background: linear-gradient(135deg, var(--accent) 0%, #fbbf24 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  transition: font-size 0.35s ease;
}

.stat-card--production {
  overflow-y: auto;
  transition: box-shadow 0.25s ease;
}

.stat-card--production-positive {
  box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.35), 0 0 12px rgba(34, 197, 94, 0.15);
}

.stat-card--production-negative {
  box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.35), 0 0 12px rgba(239, 68, 68, 0.12);
}

.stat-card--coins {
  box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.08);
}

.stat-coins-extra {
  font-size: 0.75rem;
  color: var(--text-dim);
  margin-top: 0.35rem;
}

.stat-coins-extra--sub {
  font-size: 0.7rem;
  margin-top: 0.15rem;
}

.crew-stat-role--astronaut { color: var(--crew-astronaut); }
.crew-stat-role--miner { color: var(--crew-miner); }
.crew-stat-role--scientist { color: var(--crew-scientist); }
.crew-stat-role--pilot { color: var(--crew-pilot); }
.crew-stat-role--medic { color: var(--crew-medic); }
.crew-stat-role--engineer { color: var(--crew-engineer); }

.production-live {
  display: inline-block;
  color: var(--success);
  font-size: 0.5rem;
  vertical-align: middle;
  margin-left: 0.25rem;
  animation: production-pulse 1.5s ease-in-out infinite;
}

.stat-card--live .production-live {
  opacity: 1;
}

@keyframes production-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.2); }
}

.stat-breakdown {
  font-size: 0.7rem;
  color: var(--text-dim);
  margin-top: 0.35rem;
  line-height: 1.3;
}

.events-line {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.5rem;
  flex-wrap: nowrap;
  min-height: 0;
}

.events-line-content {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: nowrap;
}

.active-events {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
  flex: 1;
  min-width: 0;
}

/* Style event badges injected via v-html (stats snapshot) — same as EventBadge.vue */
.active-events :deep(.event-badge) {
  font-size: 0.7rem;
  padding: 0.25rem 0.55rem;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid;
  font-weight: 500;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.active-events :deep(.event-badge:hover) {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.active-events :deep(.event-badge__name) {
  font-weight: 600;
}

.active-events :deep(.event-badge__mult) {
  opacity: 0.9;
  font-variant-numeric: tabular-nums;
}

.active-events :deep(.event-badge__time) {
  opacity: 0.85;
  font-variant-numeric: tabular-nums;
}

.active-events :deep(.event-badge--positive) {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.18) 0%, rgba(22, 163, 74, 0.12) 100%);
  border-color: rgba(34, 197, 94, 0.6);
  color: #86efac;
}

.active-events :deep(.event-badge--negative) {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.18) 0%, rgba(185, 28, 28, 0.12) 100%);
  border-color: rgba(239, 68, 68, 0.6);
  color: #fca5a5;
}

.next-event-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: nowrap;
  flex: 1;
  min-width: 0;
}

.next-event-label {
  display: none;
  font-size: 0.7rem;
  color: var(--text-dim);
  font-weight: 500;
  flex-shrink: 0;
  white-space: nowrap;
}

.next-event-progress-wrap {
  height: 5px;
  background: var(--bg-card);
  border-radius: 3px;
  overflow: hidden;
  display: none;
  flex: 1;
  min-width: 2rem;
}

.next-event-progress-bar {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, var(--accent), #fbbf24);
  border-radius: 2px;
  transition: width 0.4s ease-out;
  position: relative;
}

.next-event-progress-bar::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 2px;
  background: linear-gradient(
    105deg,
    transparent 0%,
    transparent 40%,
    rgba(255, 255, 255, 0.25) 50%,
    transparent 60%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: progress-shimmer 2s ease-in-out infinite;
  pointer-events: none;
}

.events-hint-wrap {
  display: inline-flex;
  align-items: center;
  margin-left: auto;
  flex-shrink: 0;
}

.events-hint-trigger {
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  border-radius: 50%;
  border: 1px solid var(--text-dim);
  background: var(--bg-card);
  color: var(--text-dim);
  font-size: 0.7rem;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
}

.events-hint-trigger:hover {
  color: var(--accent);
  border-color: var(--accent);
  background: rgba(99, 102, 241, 0.1);
}

.stats-compact-only {
  display: none;
}

@media (max-width: 360px) {
  .stats {
    grid-template-columns: 1fr;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .stat-card {
    padding: 0.6rem 0.75rem;
  }

  .stat-value {
    font-size: 1.25rem;
  }

  .stat-value--hero {
    font-size: 1.4rem;
  }
}

@media (min-width: 361px) and (max-width: 767px) {
  .stat-value--hero {
    font-size: 1.6rem;
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .stats {
    gap: 1.25rem;
  }

  .stat-card {
    padding: 1.25rem 1.5rem;
  }
}
</style>
