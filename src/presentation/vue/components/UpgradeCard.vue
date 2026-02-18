<template>
  <div
    class="upgrade-card"
    :class="cardClasses"
    :data-tier="state.def.tier"
    :data-upgrade-id="state.def.id"
    :data-owned="state.owned"
  >
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
import { computed } from 'vue';
import { useAppUIStore } from '../stores/appUI.js';
import { t, tParam } from '../../../application/strings.js';
import { formatNumber } from '../../../application/format.js';
import { getCatalogUpgradeName, getCatalogUpgradeDesc } from '../../../application/i18nCatalogs.js';
import { getBestPlanetTypes, getPlanetTypeMultiplier } from '../../../application/planetAffinity.js';
import { getEffectiveUpgradeUsesSlot } from '../../../application/research.js';
import { getSettings } from '../../../application/gameState.js';
import type { UpgradeCardState } from '../../components/upgradeCard.js';

const props = defineProps<{
  state: UpgradeCardState;
}>();

const appUI = useAppUIStore();

const cardClasses = computed(() => ({
  'upgrade-card--affordable': props.state.canBuy,
  'upgrade-card--recommended': props.state.isRecommended,
  'upgrade-card--needs-crew': !props.state.hasCrew && props.state.crewReq > 0,
  'upgrade-card--just-bought': appUI.flashUpgradeId === props.state.def.id,
}));

const desc = computed(() => getCatalogUpgradeDesc(props.state.def.id));

const affinityChips = computed(() => {
  const labels = getBestPlanetTypes(props.state.def.id);
  return labels.map((label) => {
    const key = label.toLowerCase();
    const mult = getPlanetTypeMultiplier(props.state.def.id, key);
    const pct = Math.round((mult - 1) * 100);
    const pctStr = pct >= 0 ? `+${pct}%` : `${pct}%`;
    return { key, label, title: `${label}: ${pctStr}` };
  });
});

const settings = getSettings();
const rateStr = tParam('eachPerSecond', {
  n: formatNumber(props.state.def.coinsPerSecond, settings.compactNumbers),
});
const totalSec =
  props.state.owned > 0
    ? ' · ' +
      tParam('totalPerSecond', {
        n: formatNumber(props.state.owned * props.state.def.coinsPerSecond, settings.compactNumbers),
      })
    : '';
const slotCostSuffix = getEffectiveUpgradeUsesSlot(props.state.def.id) ? ` · ${t('upgradeUsesSlot')}` : '';
</script>
