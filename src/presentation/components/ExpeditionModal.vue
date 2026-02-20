<template>
  <div
    id="expedition-modal-overlay"
    class="expedition-modal-overlay"
    aria-hidden="true"
    @click.self="handleClose"
  >
    <div
      v-if="expedition"
      class="expedition-modal"
      role="dialog"
      aria-labelledby="expedition-modal-title"
    >
      <div class="expedition-modal-header">
        <h2
          id="expedition-modal-title"
          class="expedition-modal-title"
        >
          {{ t('expeditionModalTitle') }}
        </h2>
        <button
          type="button"
          class="expedition-modal-close"
          :aria-label="t('close')"
          @click="handleClose"
        >
          ×
        </button>
      </div>
      <div class="expedition-modal-body">
        <div class="expedition-modal-cost-wrap">
          <span class="expedition-modal-cost">{{ costFormattedForType }}</span>
          <span
            v-if="expedition.isNewSystem"
            class="expedition-new-system"
            :title="expedition.newSystemTitle"
          >
            {{ expedition.newSystemText }}
          </span>
        </div>
        <h3 class="expedition-modal-type-title">
          {{ t('expeditionSelectType') }}
        </h3>
        <div
          class="expedition-modal-types"
          role="group"
          aria-label="Mission type"
        >
          <button
            v-for="type in typeCards"
            :key="type.id"
            type="button"
            class="expedition-type-btn"
            :class="{ 'expedition-type-btn--selected': type.selected }"
            :aria-pressed="type.selected"
            :title="type.descText"
            @click="selectType(type.id)"
          >
            {{ type.titleText }}
          </button>
        </div>
        <p
          class="expedition-type-explain"
          :aria-live="'polite'"
        >
          {{ typeExplainText }}
        </p>
        <template v-if="isScoutType">
          <h3 class="expedition-modal-dest-title">
            {{ t('expeditionSelectTier') }}
          </h3>
          <div
            class="expedition-modal-tiers"
            role="group"
            aria-label="Destination"
          >
            <button
              v-for="tier in tierCards"
              :key="tier.id"
              type="button"
              class="expedition-tier-card"
              :class="{ 'expedition-tier-card--selected': tier.selected }"
              :aria-pressed="tier.selected"
              @click="selectTier(tier.id)"
            >
              <div class="expedition-tier-visual-wrap">
                <canvas
                  class="planet-card-visual expedition-dest-visual"
                  width="72"
                  height="72"
                  :data-planet-id="'expedition-' + tier.id"
                  :data-planet-name="tier.destinationName"
                  :data-planet-visual-seed="tier.visualSeed"
                  aria-hidden="true"
                />
              </div>
              <div class="expedition-tier-content">
                <span class="expedition-tier-destination">{{ tier.destinationName }}</span>
                <span
                  class="expedition-tier-type"
                  :class="'expedition-tier-type--' + tier.planetType"
                  :title="tier.typeLabel"
                >
                  {{ tier.typeLabel }}
                </span>
                <span
                  class="expedition-tier-badge"
                  :class="'expedition-tier-badge--' + tier.id"
                >
                  {{ tier.titleText }}
                </span>
                <p class="expedition-tier-desc">
                  {{ tier.descText }}
                </p>
                <div class="expedition-tier-stats">
                  <span>{{ tParam('expeditionTierRisk', { pct: String(tier.deathPct) }) }}</span>
                  <span>{{ tParam('expeditionTierDuration', { sec: String(tier.durationSec) }) }}</span>
                </div>
                <span
                  v-if="tier.extraSlot"
                  class="expedition-tier-reward"
                >+1 slot</span>
              </div>
            </button>
          </div>
        </template>
        <template v-else>
          <h3 class="expedition-modal-dest-title">
            {{ selectedTypeForTiers === 'mining' ? t('expeditionTierDurationOnly') : t('expeditionTierDifficultyOnly') }}
          </h3>
          <div
            class="expedition-modal-tiers expedition-modal-tiers--compact"
            role="group"
            :aria-label="selectedTypeForTiers === 'mining' ? t('expeditionTierDurationOnly') : t('expeditionTierDifficultyOnly')"
          >
            <button
              v-for="tier in tierCards"
              :key="tier.id"
              type="button"
              class="expedition-tier-card expedition-tier-card--compact"
              :class="{ 'expedition-tier-card--selected': tier.selected }"
              :aria-pressed="tier.selected"
              @click="selectTier(tier.id)"
            >
              <span class="expedition-tier-badge" :class="'expedition-tier-badge--' + tier.id">{{ tier.titleText }}</span>
              <span class="expedition-tier-stat-line">{{ tParam('expeditionTierDuration', { sec: String(tier.durationSec) }) }} · {{ tParam('expeditionTierRisk', { pct: String(tier.deathPct) }) }}</span>
              <span v-if="tier.estimatedCoinsStr" class="expedition-tier-estimate">{{ tier.estimatedCoinsStr }}</span>
              <span v-if="tier.rescuedRangeStr" class="expedition-tier-rescued">{{ tier.rescuedRangeStr }}</span>
            </button>
          </div>
        </template>
        <h3 class="expedition-crew-section-title">
          {{ t('crew') }}
        </h3>
        <div
          class="expedition-crew-picker"
          role="group"
          :aria-label="tParam('expeditionCrewSelect', { required: String(expedition.required) })"
        >
          <div
            v-for="row in crewRows"
            :key="row.role"
            class="expedition-crew-row"
            :data-role="row.role"
          >
            <span class="expedition-crew-label">{{ row.label }}</span>
            <div class="expedition-crew-controls">
              <button
                type="button"
                class="expedition-crew-btn"
                :disabled="!row.canDec"
                aria-label="Decrease"
                @click="crewDelta(row.role, -1)"
              >
                −
              </button>
              <span
                class="expedition-crew-value"
                aria-live="polite"
              >{{ row.selected }}</span>
              <button
                type="button"
                class="expedition-crew-btn"
                :disabled="!row.canInc"
                aria-label="Increase"
                @click="crewDelta(row.role, 1)"
              >
                +
              </button>
            </div>
            <span class="expedition-crew-avail">/ {{ row.available }}</span>
          </div>
        </div>
      </div>
      <div class="expedition-modal-actions">
        <button
          type="button"
          class="expedition-modal-cancel"
          @click="handleClose"
        >
          {{ t('cancel') }}
        </button>
        <button
          type="button"
          class="expedition-modal-launch"
          :disabled="!canLaunch"
          @click="handleLaunch"
        >
          {{ t('expeditionLaunch') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useAppUIStore } from '../stores/appUI.js';
import { closeExpeditionModal } from '../modals/expedition.js';
import { t, tParam } from '../../application/strings.js';
import type { StringKey } from '../../application/strings.js';
import { getSession, getSettings, planetService } from '../../application/gameState.js';
import { formatNumber } from '../../application/format.js';
import {
  getExpeditionTiers,
  getExpeditionTypes,
  getExpeditionDeathChanceWithMedics,
  getMiningExpeditionCoins,
  getRescueCrewRange,
  CREW_ROLES,
  generatePlanetName,
  type CrewRole,
  type CrewJobRole,
  type ExpeditionTypeId,
} from '../../domain/constants.js';
import {
  getUnlockedCrewRoles,
  getResearchExpeditionDurationPercent,
  getResearchExpeditionDeathChancePercent,
} from '../../application/research.js';
import { getPlanetType } from '../../application/planetAffinity.js';
import { handleLaunchExpeditionFromModal } from '../../application/handlersPlanet.js';

const TIER_KEYS: Record<string, StringKey> = {
  easy: 'expeditionTierEasy',
  medium: 'expeditionTierMedium',
  hard: 'expeditionTierHard',
};
const TIER_DESC_KEYS: Record<string, StringKey> = {
  easy: 'expeditionTierEasyDesc',
  medium: 'expeditionTierMediumDesc',
  hard: 'expeditionTierHardDesc',
};
const TYPE_KEYS: Record<string, StringKey> = {
  scout: 'expeditionTypeScout',
  mining: 'expeditionTypeMining',
  rescue: 'expeditionTypeRescue',
};
const TYPE_DESC_KEYS: Record<string, StringKey> = {
  scout: 'expeditionTypeScoutDesc',
  mining: 'expeditionTypeMiningDesc',
  rescue: 'expeditionTypeRescueDesc',
};
const TYPE_EXPLAIN_KEYS: Record<string, StringKey> = {
  scout: 'expeditionTypeScoutExplain',
  mining: 'expeditionTypeMiningExplain',
  rescue: 'expeditionTypeRescueExplain',
};
const ROLE_KEYS: Record<CrewRole, StringKey> = {
  astronaut: 'crewRoleAstronaut',
  miner: 'crewRoleMiner',
  scientist: 'crewRoleScientist',
  pilot: 'crewRolePilot',
  medic: 'crewRoleMedic',
  engineer: 'crewRoleEngineer',
};

function isRoleUnlocked(role: CrewRole, unlocked: CrewJobRole[]): boolean {
  return role === 'astronaut' || unlocked.includes(role as CrewJobRole);
}

function destinationSeed(tierId: string): number {
  let h = 5381;
  const s = `expedition-dest-${tierId}`;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

const store = useAppUIStore();
const { expedition } = storeToRefs(store);

const costFormattedForType = computed(() => {
  const exp = expedition.value;
  const session = getSession();
  if (!exp || !session) return '';
  const typeId = exp.selectedType && ['scout', 'mining', 'rescue'].includes(exp.selectedType) ? exp.selectedType : 'scout';
  const cost = planetService.getExpeditionCost(session.player, typeId);
  const settings = getSettings();
  return `${formatNumber(cost.toNumber(), settings.compactNumbers)} ⬡`;
});

const selectedTypeForTiers = computed(() => {
  const exp = expedition.value;
  const type = exp?.selectedType;
  return type && ['scout', 'mining', 'rescue'].includes(type) ? type : 'scout';
});

const isScoutType = computed(() => selectedTypeForTiers.value === 'scout');

const typeExplainText = computed(() => {
  const type = selectedTypeForTiers.value;
  return t(TYPE_EXPLAIN_KEYS[type] ?? 'expeditionTypeScoutExplain');
});

const typeCards = computed(() => {
  const exp = expedition.value;
  if (!exp) return [];
  const types = getExpeditionTypes();
  const currentType = exp.selectedType && ['scout', 'mining', 'rescue'].includes(exp.selectedType) ? exp.selectedType : 'scout';
  return types.map((type) => ({
    id: type.id,
    selected: currentType === type.id,
    titleText: t(TYPE_KEYS[type.id] ?? 'expeditionTypeMining'),
    descText: t(TYPE_DESC_KEYS[type.id] ?? 'expeditionTypeMiningDesc'),
  }));
});

const tierCards = computed(() => {
  const exp = expedition.value;
  if (!exp) return [];
  const session = getSession();
  const tiers = getExpeditionTiers();
  const medicCount = exp.composition.medic ?? 0;
  const typeId = exp.selectedType && ['scout', 'mining', 'rescue'].includes(exp.selectedType) ? (exp.selectedType as ExpeditionTypeId) : undefined;
  return tiers.map((tier) => {
    const id = tier.id;
    const selected = exp.selectedTier === id;
    const deathPct = Math.round(
      getExpeditionDeathChanceWithMedics(medicCount, id, getResearchExpeditionDeathChancePercent(), typeId) * 100
    );
    const durationMs = session
      ? planetService.getExpeditionDurationMs(
          session.player,
          id,
          exp.composition.pilot ?? 0,
          getResearchExpeditionDurationPercent(),
          typeId
        )
      : 0;
    const durationSec = Math.round(durationMs / 1000);
    const destinationName = generatePlanetName(`expedition-dest-${id}`);
    const visualSeed = destinationSeed(id);
    const planetType = getPlanetType(destinationName);
    const typeLabel = planetType.charAt(0).toUpperCase() + planetType.slice(1);
    const minerCount = exp.composition.miner ?? 0;
    const estimatedCoinsStr =
      typeId === 'mining' && session
        ? '~' + formatNumber(getMiningExpeditionCoins(session.player.effectiveProductionRate, durationMs, id, minerCount).toNumber(), getSettings().compactNumbers) + ' ⬡'
        : undefined;
    const rescueRange = typeId === 'rescue' ? getRescueCrewRange(id) : null;
    const rescuedRangeStr = rescueRange ? tParam('expeditionRescueRange', { min: String(rescueRange.min), max: String(rescueRange.max) }) : undefined;
    return {
      id,
      selected,
      deathPct,
      durationSec,
      durationMs,
      destinationName,
      visualSeed,
      planetType,
      typeLabel,
      titleText: t(TIER_KEYS[id] ?? 'expeditionTierMedium'),
      descText: t(TIER_DESC_KEYS[id] ?? 'expeditionTierMediumDesc'),
      extraSlot: tier.extraSlot ?? false,
      estimatedCoinsStr,
      rescuedRangeStr,
    };
  });
});

const crewRows = computed(() => {
  const exp = expedition.value;
  if (!exp) return [];
  const unlocked = getUnlockedCrewRoles();
  const session = getSession();
  const player = session?.player;
  const availableByRole = player?.crewByRole ?? {};
  const totalSelected = CREW_ROLES.reduce((s, r) => s + (exp.composition[r] ?? 0), 0);
  return CREW_ROLES.filter((role) => isRoleUnlocked(role, unlocked)).map((role) => {
    const avail = availableByRole[role] ?? 0;
    const sel = exp.composition[role] ?? 0;
    const canInc = totalSelected < exp.required && sel < avail;
    const canDec = sel > 0;
    return {
      role,
      label: t(ROLE_KEYS[role]),
      selected: sel,
      available: avail,
      canInc,
      canDec,
    };
  });
});

const canLaunch = computed(() => {
  const exp = expedition.value;
  if (!exp) return false;
  const total = CREW_ROLES.reduce((s, r) => s + (exp.composition[r] ?? 0), 0);
  const typeOk = exp.selectedType && ['scout', 'mining', 'rescue'].includes(exp.selectedType);
  return exp.selectedTier !== '' && typeOk && total === exp.required;
});

function selectType(typeId: string): void {
  store.setExpeditionSelectedType(typeId);
}

function selectTier(tierId: string): void {
  store.setExpeditionSelectedTier(tierId);
}

function crewDelta(role: string, delta: number): void {
  store.setExpeditionCrew(role, delta);
}

function handleClose(): void {
  store.clearExpedition();
  closeExpeditionModal();
}

function handleLaunch(): void {
  const exp = expedition.value;
  if (!exp || !canLaunch.value) return;
  const tierId = exp.selectedTier as 'easy' | 'medium' | 'hard';
  const typeId = (exp.selectedType && ['scout', 'mining', 'rescue'].includes(exp.selectedType) ? exp.selectedType : 'scout') as ExpeditionTypeId;
  const composition = {
    astronaut: exp.composition.astronaut ?? 0,
    miner: exp.composition.miner ?? 0,
    scientist: exp.composition.scientist ?? 0,
    pilot: exp.composition.pilot ?? 0,
    medic: exp.composition.medic ?? 0,
    engineer: exp.composition.engineer ?? 0,
  };
  handleLaunchExpeditionFromModal(tierId, composition, typeId);
  store.clearExpedition();
  closeExpeditionModal();
}
</script>

<style scoped>
.expedition-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 101;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.25s ease, visibility 0.25s ease;
}

.expedition-modal-overlay--open {
  opacity: 1;
  visibility: visible;
}

.expedition-modal {
  background: linear-gradient(180deg, var(--bg-panel) 0%, color-mix(in srgb, var(--bg-panel) 95%, var(--accent)) 100%);
  border: 1px solid var(--border);
  border-top: 3px solid var(--accent);
  border-radius: 20px;
  width: 100%;
  max-width: 440px;
  min-height: 380px;
  max-height: 90vh;
  padding: 0;
  box-shadow: 0 32px 64px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.04);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.expedition-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem 1rem;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.15);
}

.expedition-modal-title {
  margin: 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--text);
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.expedition-modal-title::before {
  content: '';
  display: inline-block;
  width: 24px;
  height: 24px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238b5cf6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'/%3E%3C/svg%3E") no-repeat center;
  background-size: contain;
  opacity: 0.9;
}

.expedition-modal-close {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  line-height: 1;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-dim);
  cursor: pointer;
  border-radius: 10px;
  transition: color 0.2s, background 0.2s;
}

.expedition-modal-close:hover {
  color: var(--text);
  background: rgba(255, 255, 255, 0.08);
}

.expedition-modal-body {
  flex: 1 1 auto;
  min-height: 220px;
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.expedition-modal-cost-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.85rem;
}

.expedition-modal-cost {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--accent);
  padding: 0.25rem 0.5rem;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  border: 1px solid var(--border);
}

.expedition-new-system {
  padding: 0.2rem 0.5rem;
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #c4b5fd;
  background: rgba(139, 92, 246, 0.25);
  border: 1px solid rgba(139, 92, 246, 0.5);
  border-radius: 6px;
}

.expedition-modal-type-title {
  margin: 0 0 0.6rem 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-dim);
}

.expedition-modal-types {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.expedition-type-btn {
  flex: 1;
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  border: 2px solid var(--border);
  border-radius: 10px;
  background: var(--bg-card);
  color: var(--text);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.expedition-type-btn:hover {
  border-color: color-mix(in srgb, var(--accent) 60%, transparent);
  background: var(--bg-panel);
}

.expedition-type-btn--selected {
  border-color: var(--accent);
  background: linear-gradient(180deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.08) 100%);
}

.expedition-type-explain {
  margin: 0 0 1rem 0;
  padding: 0.75rem 1rem;
  font-size: 0.82rem;
  line-height: 1.45;
  color: var(--text-dim);
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  border: 1px solid var(--border);
}

.expedition-modal-dest-title {
  margin: 0 0 0.85rem 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-dim);
}

.expedition-modal-tiers {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.85rem;
  margin-bottom: 1.5rem;
}

.expedition-modal-tiers--compact {
  grid-template-columns: repeat(3, 1fr);
}

.expedition-tier-card--compact {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.75rem 0.5rem;
  min-height: auto;
}

.expedition-tier-card--compact .expedition-tier-stat-line {
  font-size: 0.72rem;
  color: var(--text-dim);
}

.expedition-tier-card--compact .expedition-tier-badge {
  margin-bottom: 0;
}

.expedition-tier-estimate,
.expedition-tier-rescued {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent);
  margin-top: 0.25rem;
}

.expedition-tier-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 0;
  border: 2px solid var(--border);
  border-radius: 16px;
  background: var(--bg-card);
  cursor: pointer;
  text-align: center;
  font-family: inherit;
  transition: transform 0.2s ease, border-color 0.2s, background 0.2s, box-shadow 0.2s;
  overflow: hidden;
}

.expedition-tier-card:hover {
  border-color: color-mix(in srgb, var(--accent) 60%, transparent);
  background: var(--bg-panel);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.expedition-tier-card--selected {
  border-color: var(--accent);
  background: linear-gradient(180deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.08) 100%);
  box-shadow: 0 0 0 1px var(--accent), 0 8px 24px rgba(139, 92, 246, 0.2);
}

.expedition-tier-card--selected::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--accent);
}

.expedition-tier-visual-wrap {
  flex-shrink: 0;
  width: 100%;
  aspect-ratio: 1;
  padding: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.25);
  border-bottom: 1px solid var(--border);
}

.expedition-dest-visual {
  display: block;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.expedition-tier-content {
  flex: 1;
  padding: 0.75rem 0.85rem 1rem;
  min-width: 0;
  text-align: left;
}

.expedition-tier-destination {
  display: block;
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text);
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.expedition-tier-type {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.15rem 0.4rem;
  border-radius: 6px;
  margin-bottom: 0.35rem;
}

.expedition-tier-type--rocky { background: rgba(107, 114, 128, 0.3); color: #9ca3af; }
.expedition-tier-type--desert { background: rgba(217, 119, 6, 0.25); color: #fdba74; }
.expedition-tier-type--ice { background: rgba(96, 165, 250, 0.25); color: #93c5fd; }
.expedition-tier-type--volcanic { background: rgba(234, 88, 12, 0.25); color: #fdba74; }
.expedition-tier-type--gas { background: rgba(139, 92, 246, 0.25); color: #c4b5fd; }

.expedition-tier-badge {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.2rem 0.5rem;
  border-radius: 8px;
  margin-bottom: 0.4rem;
}

.expedition-tier-badge--easy {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.25), rgba(34, 197, 94, 0.1));
  color: #6ee7b7;
  border: 1px solid rgba(34, 197, 94, 0.35);
}

.expedition-tier-badge--medium {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.25), rgba(251, 191, 36, 0.1));
  color: #fde68a;
  border: 1px solid rgba(251, 191, 36, 0.35);
}

.expedition-tier-badge--hard {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(239, 68, 68, 0.1));
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.35);
}

.expedition-tier-desc {
  margin: 0 0 0.5rem 0;
  font-size: 0.72rem;
  color: var(--text-dim);
  line-height: 1.35;
}

.expedition-tier-stats {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.72rem;
  color: var(--text-dim);
}

.expedition-tier-stats span {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.expedition-tier-reward {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.4rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent);
}

.expedition-tier-reward::before {
  content: '★';
  font-size: 0.85em;
}

.expedition-modal-crew-wrap {
  margin-bottom: 0;
}

.expedition-modal-crew-wrap .expedition-crew-picker {
  padding: 1rem 1.1rem;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 14px;
  border: 1px solid var(--border);
}

.expedition-crew-section-title {
  margin: 0 0 0.75rem 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-dim);
}

.expedition-crew-picker {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.expedition-crew-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.4rem 0;
  border-radius: 8px;
  transition: background 0.2s;
}

.expedition-crew-row:hover {
  background: rgba(255, 255, 255, 0.03);
}

.expedition-crew-label {
  min-width: 5.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text);
}

.expedition-crew-controls {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: var(--bg-panel);
  border-radius: 10px;
  padding: 0.2rem;
  border: 1px solid var(--border);
}

.expedition-crew-btn {
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text);
  font-size: 1.15rem;
  line-height: 1;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.expedition-crew-btn:hover:not(:disabled) {
  background: var(--accent);
  color: #fff;
}

.expedition-crew-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.expedition-crew-value {
  min-width: 2rem;
  text-align: center;
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text);
}

.expedition-crew-avail {
  font-size: 0.85rem;
  color: var(--text-dim);
  margin-left: 0.15rem;
}

.expedition-modal-actions {
  display: flex;
  justify-content: stretch;
  gap: 0.75rem;
  flex-shrink: 0;
  padding: 1.25rem 1.5rem;
  border-top: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.12);
}

.expedition-modal-cancel {
  font-family: 'Exo 2', sans-serif;
  font-size: 0.95rem;
  padding: 0.7rem 1.35rem;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text);
  cursor: pointer;
  flex: 0 0 auto;
  transition: background 0.2s, border-color 0.2s;
}

.expedition-modal-cancel:hover {
  background: var(--bg-panel);
  border-color: var(--accent);
}

.expedition-modal-launch {
  font-family: 'Orbitron', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 0.7rem 1.5rem;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 80%, #000));
  color: #fff;
  cursor: pointer;
  flex: 1;
  min-width: 0;
  transition: filter 0.2s, transform 0.15s;
  box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);
}

.expedition-modal-launch:hover:not(:disabled) {
  filter: brightness(1.12);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(139, 92, 246, 0.45);
}

.expedition-modal-launch:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

@media (max-width: 420px) {
  .expedition-modal-tiers {
    grid-template-columns: 1fr;
  }
  .expedition-tier-card {
    flex-direction: row;
    text-align: left;
  }
  .expedition-tier-visual-wrap {
    width: 80px;
    aspect-ratio: 1;
    flex-shrink: 0;
    padding: 0.5rem;
    border-bottom: none;
    border-right: 1px solid var(--border);
  }
  .expedition-tier-content {
    padding: 0.75rem;
    text-align: left;
  }
}
</style>
