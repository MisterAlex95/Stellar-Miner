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

<style scoped>
.upgrade-card {
  position: relative;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-left-width: 4px;
  border-radius: 8px;
  padding: 0.7rem 0.9rem;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-shrink: 0;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.upgrade-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}

.upgrade-card--affordable {
  border-color: rgba(245, 158, 11, 0.4);
  box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.15);
}

.upgrade-card--affordable:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25), 0 0 24px var(--accent-glow);
}

.upgrade-card--just-affordable {
  animation: upgrade-just-affordable 0.8s ease-out;
}

@keyframes upgrade-just-affordable {
  0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.5); }
  50% { box-shadow: 0 0 20px 4px rgba(245, 158, 11, 0.35); }
  100% { box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.15); }
}

.upgrade-recommended {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--success);
  margin-left: 0.5rem;
  padding: 0.15rem 0.4rem;
  background: rgba(34, 197, 94, 0.15);
  border-radius: 4px;
}

.upgrade-card--recommended {
  border-color: rgba(34, 197, 94, 0.35);
}

.upgrade-crew-req {
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--accent);
  margin-left: 0.4rem;
  padding: 0.12rem 0.35rem;
  background: rgba(245, 158, 11, 0.15);
  border-radius: 4px;
  white-space: nowrap;
}

.upgrade-card--needs-crew {
  opacity: 0.85;
}

.upgrade-card--needs-crew .upgrade-crew-req {
  background: rgba(245, 158, 11, 0.25);
  color: #fbbf24;
}

.upgrade-card--installing {
  pointer-events: none;
}

.upgrade-card--installing .upgrade-install-progress-overlay {
  pointer-events: auto;
}

.upgrade-install-progress-overlay {
  position: absolute;
  inset: 0;
  background: rgba(10, 11, 15, 0.85);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 0.75rem;
  overflow-y: auto;
}

.upgrade-install-progress-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  width: 100%;
  max-width: 200px;
}

.upgrade-install-progress-item .upgrade-install-progress-label {
  font-size: 0.7rem;
}

.upgrade-install-progress-track {
  width: 100%;
  max-width: 200px;
  height: 6px;
  background: var(--border);
  border-radius: 3px;
  overflow: hidden;
}

.upgrade-install-progress-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, var(--accent), rgba(245, 158, 11, 0.8));
  border-radius: 3px;
}

.upgrade-install-progress-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 0.05em;
}

.upgrade-progress-cancel {
  font-family: 'Exo 2', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.35rem 0.65rem;
  border-radius: 6px;
  border: 1px solid var(--text-dim);
  background: var(--bg-panel);
  color: var(--text);
  cursor: pointer;
  margin-top: 0.25rem;
}

.upgrade-progress-cancel:hover {
  background: var(--border);
}

.upgrade-card--just-bought {
  animation: upgrade-flash 0.7s ease;
}

@keyframes upgrade-flash {
  0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5); transform: translateY(0); }
  25% { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.35); transform: translateY(-2px); }
  50% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0.15); }
  100% { box-shadow: none; transform: translateY(0); }
}

.upgrade-card[data-tier="1"] { --upgrade-tier-color: #22c55e; border-left-color: #22c55e; }
.upgrade-card[data-tier="2"] { --upgrade-tier-color: #16a34a; border-left-color: #16a34a; }
.upgrade-card[data-tier="3"] { --upgrade-tier-color: #0ea5e9; border-left-color: #0ea5e9; }
.upgrade-card[data-tier="4"] { --upgrade-tier-color: #3b82f6; border-left-color: #3b82f6; }
.upgrade-card[data-tier="5"] { --upgrade-tier-color: #6366f1; border-left-color: #6366f1; }
.upgrade-card[data-tier="6"] { --upgrade-tier-color: #a78bfa; border-left-color: #a78bfa; }
.upgrade-card[data-tier="7"] { --upgrade-tier-color: #d946ef; border-left-color: #d946ef; }
.upgrade-card[data-tier="8"] { --upgrade-tier-color: #8b5cf6; border-left-color: #8b5cf6; }
.upgrade-card[data-tier="9"] { --upgrade-tier-color: #7c3aed; border-left-color: #7c3aed; }
.upgrade-card[data-tier="10"] { --upgrade-tier-color: #4f46e5; border-left-color: #4f46e5; }

.upgrade-strip {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 100%;
  min-width: 0;
}

.upgrade-card-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  min-width: 0;
}

.upgrade-card-row-left,
.upgrade-card-row-right {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  min-width: 0;
}

.upgrade-card-row-right {
  margin-left: auto;
  flex-shrink: 0;
}

.upgrade-card-row--head .upgrade-tier {
  margin-right: 0;
}

.upgrade-card-row--name-stats .upgrade-card-row-left {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.upgrade-card-row--name-stats .upgrade-card-row-left.upgrade-title-row {
  margin: 0;
}

.upgrade-card-row--name-stats .upgrade-card-row-right {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.upgrade-title-row-output {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-dim);
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.upgrade-title-row-cost {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--accent);
  white-space: nowrap;
}

.upgrade-card-row--desc {
  justify-content: flex-start;
}

.upgrade-card-row--desc .upgrade-description {
  width: 100%;
  font-size: 0.75rem;
  color: var(--text-dim);
  margin: 0;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 100%;
}

.upgrade-card-row--actions .upgrade-card-row-left.upgrade-buttons {
  display: flex;
  flex-direction: row;
  gap: 0.25rem;
}

.upgrade-card-row--actions .upgrade-card-row-right.upgrade-uninstall-line {
  margin-top: 0;
}

.upgrade-effect-chip {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--bg-dark);
  background: var(--success);
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
  white-space: nowrap;
}

.upgrade-info {
  flex: 1;
  min-width: 0;
}

.upgrade-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.2rem;
}

.upgrade-tier {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--bg-dark);
  background: var(--upgrade-tier-color, var(--text-dim));
  padding: 0.18rem 0.4rem;
  border-radius: 4px;
  flex-shrink: 0;
  line-height: 1.25;
}

.upgrade-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.5rem;
  min-width: 0;
}

.upgrade-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  line-height: 1.3;
}

.upgrade-count-badge {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--bg-dark);
  background: var(--upgrade-tier-color, var(--success));
  padding: 0.12rem 0.35rem;
  border-radius: 4px;
  white-space: nowrap;
}

.upgrade-meta-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.15rem;
  line-height: 1.4;
}

.upgrade-meta-sep {
  color: var(--text-dim);
  opacity: 0.7;
  font-size: 0.8rem;
}

.upgrade-effect-inline {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--success);
}

.upgrade-meta-line .upgrade-description {
  font-size: 0.8rem;
  color: var(--text-dim);
  margin: 0;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 100%;
}

.upgrade-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.35rem;
  flex-shrink: 0;
}

.upgrade-right-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.upgrade-right .upgrade-cost {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--accent);
  padding: 0.28rem 0.5rem;
  background: var(--bg-panel);
  border-radius: 6px;
  border: 1px solid var(--border);
  white-space: nowrap;
  line-height: 1.3;
}

.upgrade-affinity-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.2rem;
  flex-wrap: wrap;
}

.upgrade-affinity-chip {
  cursor: default;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
}

.upgrade-affinity-chip.upgrade-choose-planet-type--rocky {
  background: rgba(107, 114, 128, 0.3);
  color: #9ca3af;
}

.upgrade-affinity-chip.upgrade-choose-planet-type--desert {
  background: rgba(217, 119, 6, 0.25);
  color: #fcd34d;
}

.upgrade-affinity-chip.upgrade-choose-planet-type--ice {
  background: rgba(96, 165, 250, 0.25);
  color: #93c5fd;
}

.upgrade-affinity-chip.upgrade-choose-planet-type--volcanic {
  background: rgba(234, 88, 12, 0.25);
  color: #fdba74;
}

.upgrade-affinity-chip.upgrade-choose-planet-type--gas {
  background: rgba(139, 92, 246, 0.25);
  color: #c4b5fd;
}

.upgrade-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.upgrade-buttons {
  display: flex;
  flex-direction: row;
  gap: 0.25rem;
  align-items: center;
  flex-shrink: 0;
}

.upgrade-btn--buy,
.upgrade-btn--max {
  min-width: 3.5rem;
  padding: 0.32rem 0.55rem;
  font-size: 0.78rem;
  box-sizing: border-box;
  text-align: center;
  line-height: 1.3;
}

.upgrade-btn--max {
  opacity: 0.9;
}

.upgrade-btn--max:hover:not(:disabled) {
  opacity: 1;
}

.upgrade-uninstall-line {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.3rem;
  font-size: 0.76rem;
  color: var(--text-dim);
  line-height: 1.35;
}

.upgrade-uninstall-line .upgrade-uninstall-planet-select {
  font-size: 0.75rem;
  padding: 0.22rem 0.4rem;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--bg-panel);
  color: var(--text);
  max-width: 6rem;
  min-height: 1.6rem;
}

.upgrade-uninstall-sep {
  color: var(--text-dim);
  opacity: 0.6;
  user-select: none;
}

.upgrade-uninstall-refund {
  font-variant-numeric: tabular-nums;
}

.upgrade-uninstall-btn {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.25rem 0.5rem;
  min-width: auto;
  width: auto;
  background: rgba(42, 47, 61, 0.5);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-dim);
}

.upgrade-uninstall-btn:hover:not(:disabled) {
  background: rgba(42, 47, 61, 0.9);
  color: var(--text);
  border-color: rgba(255, 255, 255, 0.12);
}

.upgrade-uninstall-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.upgrade-planet-label {
  font-size: 0.75rem;
  color: var(--text-dim);
  white-space: nowrap;
}

.upgrade-planet-select {
  font-size: 0.76rem;
  padding: 0.24rem 0.4rem;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--bg-panel);
  color: var(--text);
  max-width: 6rem;
}

.upgrade-btn {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.38rem 0.65rem;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg-panel);
  color: var(--text);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, transform 0.1s ease;
  line-height: 1.25;
}

.upgrade-btn:hover:not(:disabled) {
  background: var(--accent);
  color: var(--bg-dark);
  border-color: var(--accent);
}

.upgrade-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.upgrade-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.upgrade-btn:active:not(:disabled) {
  transform: scale(0.97);
}

.count-badge {
  font-size: 0.75rem;
  color: var(--text-dim);
  margin-left: 0.5rem;
}

@media (max-width: 360px) {
  .upgrade-card {
    padding: 0.6rem 0.75rem;
  }

  .upgrade-card-row--actions .upgrade-buttons {
    flex-wrap: wrap;
  }

  .upgrade-btn {
    min-height: 44px;
  }
}

@media (min-width: 361px) and (max-width: 767px) {
  .upgrade-card-row--actions .upgrade-btn {
    min-height: 44px;
  }
}
</style>
