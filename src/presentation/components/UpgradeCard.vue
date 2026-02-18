<template>
  <div
    class="upgrade-card"
    :class="cardClasses"
    :data-tier="state.def.tier"
    :data-upgrade-id="state.def.id"
    :data-owned="state.owned"
  >
    <!-- Uninstall progress overlay (takes precedence when both active) -->
    <div
      v-if="item.uninstallingRanges.length > 0"
      class="upgrade-install-progress-overlay upgrade-uninstall-progress-overlay"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="upgrade-install-progress-item">
        <div class="upgrade-install-progress-track">
          <div class="upgrade-install-progress-fill" :style="{ width: uninstallProgressPct + '%' }"></div>
        </div>
        <span class="upgrade-install-progress-label">{{ uninstallLabel }}</span>
      </div>
      <button type="button" class="upgrade-progress-cancel" @click="onCancelUninstall">
        {{ t('cancel') }}
      </button>
    </div>
    <!-- Install progress overlay -->
    <div
      v-else-if="item.installingRanges.length > 0"
      class="upgrade-install-progress-overlay"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="upgrade-install-progress-item">
        <div class="upgrade-install-progress-track">
          <div class="upgrade-install-progress-fill" :style="{ width: installProgressPct + '%' }"></div>
        </div>
        <span class="upgrade-install-progress-label">{{ installLabel }}</span>
      </div>
      <button type="button" class="upgrade-progress-cancel" @click="onCancelInstall">
        {{ t('cancel') }}
      </button>
    </div>
    <div class="upgrade-strip">
      <div class="upgrade-card-row upgrade-card-row--head">
        <span class="upgrade-card-row-left">
          <span
            class="upgrade-tier"
            :aria-label="tParam('tierLabel', { n: state.def.tier })"
            :data-tier="state.def.tier"
          >
            T{{ state.def.tier }}
          </span>
        </span>
        <div class="upgrade-card-row-right upgrade-affinity-row">
          <span
            v-for="chip in affinityChips"
            :key="chip.key"
            :class="['upgrade-affinity-chip', 'upgrade-choose-planet-type', 'upgrade-choose-planet-type--' + chip.key]"
            :title="chip.title"
          >
            {{ chip.label }}
          </span>
        </div>
      </div>
      <div class="upgrade-card-row upgrade-card-row--name-stats">
        <div class="upgrade-card-row-left upgrade-title-row">
          <span class="upgrade-name">{{ getCatalogUpgradeName(state.def.id) }}</span>
          <span v-if="state.owned > 0" class="upgrade-count-badge">×{{ state.owned }}</span>
          <span v-if="state.isRecommended" class="upgrade-recommended">{{ t('recommended') }}</span>
        </div>
        <div class="upgrade-card-row-right">
          <span class="upgrade-title-row-output" aria-live="polite">
            <span class="upgrade-effect-chip">{{ rateStr }}</span>
            <template v-if="state.owned > 0">{{ totalSec }}</template>
          </span>
          <span class="upgrade-title-row-cost">
            {{ state.costCoins }}{{ state.costCrewLine ? ' ' + state.costCrewLine : '' }}{{ slotCostSuffix }}
          </span>
        </div>
      </div>
      <div class="upgrade-card-row upgrade-card-row--desc">
        <span class="upgrade-description" :title="desc">{{ desc }}</span>
      </div>
      <div class="upgrade-card-row upgrade-card-row--actions">
        <div class="upgrade-card-row-left upgrade-buttons">
          <span class="btn-tooltip-wrap" :title="state.buyTitle">
            <button
              type="button"
              class="upgrade-btn upgrade-btn--buy"
              :data-upgrade-id="state.def.id"
              data-action="buy"
              :disabled="!state.canBuy"
            >
              {{ state.buyLabel }}
            </button>
          </span>
          <span class="btn-tooltip-wrap" :title="state.maxTitle">
            <button
              type="button"
              class="upgrade-btn upgrade-btn--max"
              :data-upgrade-id="state.def.id"
              data-action="max"
              :data-max-count="state.maxCount"
              :disabled="state.maxCount <= 0 || !state.hasCrew"
            >
              {{ state.maxLabel }}
            </button>
          </span>
        </div>
        <div class="upgrade-card-row-right upgrade-uninstall-line">
          <span v-if="state.canUninstall" class="btn-tooltip-wrap" :title="state.uninstallTitle">
            <button
              type="button"
              class="upgrade-btn upgrade-uninstall-btn"
              :data-upgrade-id="state.def.id"
              data-action="uninstall"
              :data-uninstall-planet-id="state.planetsWithUpgrade.length === 1 ? state.planetsWithUpgrade[0].id : undefined"
              :data-uninstall-planets="state.planetsWithUpgrade.length !== 1 ? JSON.stringify(state.planetsWithUpgrade) : undefined"
            >
              {{ t('uninstallLabel') }}
            </button>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useAppUIStore } from '../stores/appUI.js';
import { t, tParam } from '../../application/strings.js';
import { formatNumber } from '../../application/format.js';
import { getCatalogUpgradeName, getCatalogUpgradeDesc } from '../../application/i18nCatalogs.js';
import { getBestPlanetTypes, getPlanetTypeMultiplier } from '../../application/planetAffinity.js';
import { getEffectiveUpgradeUsesSlot } from '../../application/research.js';
import { getSettings } from '../../application/gameState.js';
import { cancelUpgradeInstall, cancelUpgradeUninstall } from '../../application/handlers.js';
import type { UpgradeCardItem } from '../composables/useUpgradeList.js';

const props = defineProps<{
  item: UpgradeCardItem;
}>();

const state = computed(() => props.item.state);
const appUI = useAppUIStore();

/** Ticks so progress bar updates; only relevant when overlay is shown */
const progressNow = ref(Date.now());
let progressInterval: ReturnType<typeof setInterval> | null = null;

const cardClasses = computed(() => ({
  'upgrade-card--affordable': state.value.canBuy,
  'upgrade-card--recommended': state.value.isRecommended,
  'upgrade-card--needs-crew': !state.value.hasCrew && state.value.crewReq > 0,
  'upgrade-card--just-bought': appUI.flashUpgradeId === state.value.def.id,
  'upgrade-card--installing':
    props.item.installingRanges.length > 0 || props.item.uninstallingRanges.length > 0,
}));

const desc = computed(() => getCatalogUpgradeDesc(state.value.def.id));

const affinityChips = computed(() => {
  const labels = getBestPlanetTypes(state.value.def.id);
  return labels.map((label) => {
    const key = label.toLowerCase();
    const mult = getPlanetTypeMultiplier(state.value.def.id, key);
    const pct = Math.round((mult - 1) * 100);
    const pctStr = pct >= 0 ? `+${pct}%` : `${pct}%`;
    return { key, label, title: `${label}: ${pctStr}` };
  });
});

const settings = getSettings();
const rateStr = tParam('eachPerSecond', {
  n: formatNumber(state.value.def.coinsPerSecond, settings.compactNumbers),
});
const totalSec =
  state.value.owned > 0
    ? ' · ' +
      tParam('totalPerSecond', {
        n: formatNumber(state.value.owned * state.value.def.coinsPerSecond, settings.compactNumbers),
      })
    : '';
const slotCostSuffix = getEffectiveUpgradeUsesSlot(state.value.def.id) ? ` · ${t('upgradeUsesSlot')}` : '';

const firstInstallingRange = computed(() => {
  const r = [...props.item.installingRanges].sort((a, b) => a.endsAt - b.endsAt)[0];
  return r ?? null;
});
const installProgressPct = computed(() => {
  const r = firstInstallingRange.value;
  if (!r) return 0;
  const total = Math.max(1, r.endsAt - r.startAt);
  const elapsed = Math.max(0, progressNow.value - r.startAt);
  return Math.min(100, Math.round((elapsed / total) * 100));
});
const installLabel = computed(() => {
  const total = props.item.installingRanges.length;
  const remaining = props.item.installingRanges.filter((r) => r.endsAt > progressNow.value).length;
  const current = total - remaining + 1;
  return tParam('upgradingCount', { current: String(current), total: String(total) });
});

const firstUninstallingRange = computed(() => {
  const r = [...props.item.uninstallingRanges].sort((a, b) => a.endsAt - b.endsAt)[0];
  return r ?? null;
});
const uninstallProgressPct = computed(() => {
  const r = firstUninstallingRange.value;
  if (!r) return 0;
  const total = Math.max(1, r.endsAt - r.startAt);
  const elapsed = Math.max(0, progressNow.value - r.startAt);
  return Math.min(100, Math.round((elapsed / total) * 100));
});
const uninstallLabel = computed(() => {
  const total = props.item.uninstallingRanges.length;
  return tParam('uninstallingCount', { current: '1', total: String(total) });
});

function onCancelInstall(): void {
  const id = props.item.def.id;
  for (const { planetId, count } of props.item.installingByPlanet) {
    cancelUpgradeInstall(id, planetId, count);
  }
}
function onCancelUninstall(): void {
  const id = props.item.def.id;
  for (const { planetId } of props.item.uninstallingByPlanet) {
    cancelUpgradeUninstall(id, planetId);
  }
}

onMounted(() => {
  progressInterval = setInterval(() => {
    if (props.item.installingRanges.length > 0 || props.item.uninstallingRanges.length > 0) {
      progressNow.value = Date.now();
    }
  }, 250);
});
onUnmounted(() => {
  if (progressInterval) clearInterval(progressInterval);
});
</script>
