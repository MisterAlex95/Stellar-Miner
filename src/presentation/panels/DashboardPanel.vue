<template>
  <div class="dashboard-content" @click="onDashboardClick">
    <template v-if="!session">
      <p class="dashboard-empty">{{ t('dashboardEmpty') }}</p>
    </template>
    <template v-else>
      <div class="dashboard-stats">
        <StatChip
          theme="dashboard"
          variant="coins"
          value-id="dashboard-stat-coins"
          icon="⬡"
          :label="t('coins')"
          :value="unref(stats.coins)"
        />
        <StatChip
          theme="dashboard"
          variant="rate"
          value-id="dashboard-stat-rate"
          icon="/s"
          :label="t('production')"
          :value="unref(stats.rate)"
        />
        <StatChip
          theme="dashboard"
          variant="run"
          value-id="dashboard-stat-run"
          icon="◷"
          :label="t('dashboardRunSummary')"
          :value="unref(stats.runSummary)"
        />
      </div>

      <HeroBlock
        theme="dashboard"
        :badge="t('dashboardRecommended')"
        :title="hero.label"
        :button-id="hero.buttonId"
        :button-class="hero.buttonClass"
        :button-label="hero.buttonLabel"
        :data-upgrade-id="hero.dataUpgradeId"
        :data-planet-id="hero.dataPlanetId"
        :data-goto="hero.dataGoto"
        :time-text="hero.timeText"
      />

      <ProgressCard
        v-if="prestige.show"
        theme="dashboard-prestige"
        card-class="dashboard-progress-card--prestige"
        :label="t('dashboardToPrestige')"
        :value="prestige.value"
        :target="prestige.threshold"
        :pct="prestige.pct"
      />

      <PillsRow
        theme="dashboard"
        :label="t('tabBase')"
        :pills="empirePills"
      />

      <ProgressCard
        v-if="questCard.show"
        theme="dashboard-quest"
        :label="t('quest')"
        :value="questCard.value"
        :target="questCard.target"
        :desc="questCard.desc"
        :story-hook="questCard.storyHook"
        :pct="questCard.pct"
      />

      <div
        v-if="liveData.events.length || liveData.expeditionRemaining != null || liveData.showResearch"
        class="dashboard-live"
      >
        <div
          v-if="liveData.events.length"
          class="dashboard-events"
        >
          <EventBadge
            v-for="(ev, i) in liveData.events"
            :key="i"
            :name="ev.name"
            :seconds-left="ev.secondsLeft"
            :title="ev.title"
            :modifier="ev.modifier"
            :mult="ev.mult"
          />
        </div>
        <span
          v-if="liveData.expeditionRemaining != null"
          class="dashboard-live-pill dashboard-live-pill--expedition"
        >
          {{ t('dashboardExpeditionInProgress') }} — {{ liveData.expeditionRemaining }}s
        </span>
        <button
          v-if="liveData.showResearch"
          type="button"
          class="dashboard-live-pill dashboard-live-pill--research"
          data-goto="research"
        >
          {{ t('researching') }}
        </button>
      </div>

      <ShortcutGrid
        theme="dashboard"
        :label="t('dashboardShortcuts')"
        :items="shortcutItems"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue';
import { getSession } from '../../application/gameState.js';
import { t, tParam } from '../../application/strings.js';
import StatChip from '../components/StatChip.vue';
import EventBadge from '../components/EventBadge.vue';
import HeroBlock from '../components/HeroBlock.vue';
import ProgressCard from '../components/ProgressCard.vue';
import PillsRow from '../components/PillsRow.vue';
import ShortcutGrid from '../components/ShortcutGrid.vue';
import { useDashboardStats } from '../composables/useDashboardStats.js';
import { useDashboardHero } from '../composables/useDashboardHero.js';
import { useDashboardPrestige } from '../composables/useDashboardPrestige.js';
import { useDashboardEmpire } from '../composables/useDashboardEmpire.js';
import { useDashboardQuestCard } from '../composables/useDashboardQuestCard.js';
import { useDashboardLive } from '../composables/useDashboardLive.js';
import { useDashboardShortcuts } from '../composables/useDashboardShortcuts.js';
import { useDashboardActions } from '../composables/useDashboardActions.js';

const session = computed(() => getSession());

const stats = useDashboardStats();
const hero = useDashboardHero();
const prestige = useDashboardPrestige();
const empirePills = useDashboardEmpire();
const questCard = useDashboardQuestCard();
const liveData = useDashboardLive();
const shortcutItems = useDashboardShortcuts();
const { onDashboardClick } = useDashboardActions();
</script>

<style scoped>
.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
}

.dashboard-content :deep(.dashboard-stat--rate) { animation-delay: 0.05s; }
.dashboard-content :deep(.dashboard-stat--run) { animation-delay: 0.08s; }
.dashboard-content :deep(.dashboard-hero) { animation-delay: 0.06s; }
.dashboard-content :deep(.dashboard-progress-card) { animation-delay: 0.1s; }
.dashboard-content :deep(.dashboard-empire) { animation-delay: 0.12s; }
.dashboard-content :deep(.dashboard-quest-card) { animation-delay: 0.14s; }
.dashboard-content :deep(.dashboard-live) { animation-delay: 0.16s; }

@keyframes dashboard-card-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dashboard-content :deep(.dashboard-stats),
.dashboard-content :deep(.dashboard-hero),
.dashboard-content :deep(.dashboard-progress-card),
.dashboard-content :deep(.dashboard-empire),
.dashboard-content :deep(.dashboard-quest-card),
.dashboard-content :deep(.dashboard-live) {
  animation: dashboard-card-in 0.35s ease-out backwards;
}

@media (prefers-reduced-motion: reduce) {
  .dashboard-content :deep(.dashboard-stats),
  .dashboard-content :deep(.dashboard-hero),
  .dashboard-content :deep(.dashboard-progress-card),
  .dashboard-content :deep(.dashboard-empire),
  .dashboard-content :deep(.dashboard-quest-card),
  .dashboard-content :deep(.dashboard-live) {
    animation: none;
  }
}

.dashboard-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.dashboard-empty {
  margin: 0;
  color: var(--text-dim);
  font-size: 0.9rem;
}

.dashboard-live {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
}

.dashboard-events {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.dashboard-live-pill {
  font-size: 0.8rem;
  color: var(--text-dim);
  padding: 0.25rem 0.5rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.dashboard-live-pill--expedition {
  color: var(--crew-pilot);
  border-color: rgba(167, 139, 250, 0.3);
  background: var(--crew-pilot-bg);
}

.dashboard-live-pill--research {
  cursor: pointer;
  font: inherit;
  border-color: rgba(34, 197, 94, 0.4);
  background: rgba(34, 197, 94, 0.12);
  color: var(--success);
  transition: filter 0.2s, transform 0.1s;
}

.dashboard-live-pill--research:hover {
  filter: brightness(1.15);
  transform: translateY(-1px);
}

@media (min-width: 400px) {
  .dashboard-stats {
    grid-template-columns: 1.5fr 1fr;
  }

  .dashboard-content :deep(.dashboard-stat--coins) {
    grid-column: 1;
  }

  .dashboard-content :deep(.dashboard-stat-value--primary) {
    font-size: 1.5rem;
  }
}
</style>
