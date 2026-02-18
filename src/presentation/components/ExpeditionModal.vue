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
          <p class="expedition-modal-cost">
            {{ expedition.costFormatted }}
          </p>
          <span
            class="expedition-new-system"
            :class="{ 'expedition-new-system--visible': expedition.isNewSystem }"
            :aria-hidden="!expedition.isNewSystem"
            :title="expedition.newSystemTitle"
          >
            {{ expedition.newSystemText }}
          </span>
        </div>
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
import { getSession, planetService } from '../../application/gameState.js';
import {
  getExpeditionTiers,
  getExpeditionDeathChanceWithMedics,
  CREW_ROLES,
  generatePlanetName,
  type CrewRole,
  type CrewJobRole,
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

const tierCards = computed(() => {
  const exp = expedition.value;
  if (!exp) return [];
  const session = getSession();
  const tiers = getExpeditionTiers();
  const medicCount = exp.composition.medic ?? 0;
  return tiers.map((tier) => {
    const id = tier.id;
    const selected = exp.selectedTier === id;
    const deathPct = Math.round(
      getExpeditionDeathChanceWithMedics(medicCount, id, getResearchExpeditionDeathChancePercent()) * 100
    );
    const durationMs = session
      ? planetService.getExpeditionDurationMs(
          session.player,
          id,
          exp.composition.pilot ?? 0,
          getResearchExpeditionDurationPercent()
        )
      : 0;
    const durationSec = Math.round(durationMs / 1000);
    const destinationName = generatePlanetName(`expedition-dest-${id}`);
    const visualSeed = destinationSeed(id);
    const planetType = getPlanetType(destinationName);
    const typeLabel = planetType.charAt(0).toUpperCase() + planetType.slice(1);
    return {
      id,
      selected,
      deathPct,
      durationSec,
      destinationName,
      visualSeed,
      planetType,
      typeLabel,
      titleText: t(TIER_KEYS[id] ?? 'expeditionTierMedium'),
      descText: t(TIER_DESC_KEYS[id] ?? 'expeditionTierMediumDesc'),
      extraSlot: tier.extraSlot ?? false,
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
  return exp.selectedTier !== '' && total === exp.required;
});

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
  const composition = {
    astronaut: exp.composition.astronaut ?? 0,
    miner: exp.composition.miner ?? 0,
    scientist: exp.composition.scientist ?? 0,
    pilot: exp.composition.pilot ?? 0,
    medic: exp.composition.medic ?? 0,
    engineer: exp.composition.engineer ?? 0,
  };
  handleLaunchExpeditionFromModal(tierId, composition);
  store.clearExpedition();
  closeExpeditionModal();
}
</script>
