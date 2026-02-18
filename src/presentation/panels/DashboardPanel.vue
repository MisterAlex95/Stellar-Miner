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
        :pct="questCard.pct"
      />

      <div
        v-if="liveData.events.length || liveData.expeditionRemaining != null || liveData.nextEventIn != null || liveData.showResearch"
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
        <span
          v-if="liveData.nextEventIn != null"
          class="dashboard-live-pill dashboard-live-pill--next"
        >
          {{ tParam('nextEventInFormat', { time: liveData.nextEventIn + 's' }) }}
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
