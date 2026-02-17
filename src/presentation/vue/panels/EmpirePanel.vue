<template>
  <div class="empire-panel-vue">
    <EmpireSection
      id="crew-section"
      section-class="crew-section"
      title-key="crew"
      data-block="crew"
      rules-key="crewRules"
      :summary="crew?.summaryLabel ?? ''"
      :unlocked="unlockedBlocks?.has('crew') ?? false"
    >
      <p class="crew-hint">{{ t('crewHint') }}</p>
      <div
        class="crew-capacity-wrap"
        role="progressbar"
        :aria-valuemin="0"
        :aria-valuemax="100"
        :aria-valuenow="crew ? Math.round(crew.capacityPct) : 0"
        :aria-label="t('crewCapacityAria')"
      >
        <div class="crew-capacity-fill">
          <div
            v-for="seg in crew?.segments ?? []"
            :key="seg.role"
            :class="['crew-capacity-segment', 'crew-capacity-segment--' + seg.role]"
            :style="{ width: seg.widthPct.toFixed(1) + '%', display: seg.show ? '' : 'none' }"
            :title="seg.title"
          />
        </div>
      </div>
      <div class="crew-summary" aria-live="polite">{{ crew?.summary ?? '' }}</div>
      <div
        class="empty-state"
        :aria-hidden="!(crew?.showEmpty ?? true)"
        :hidden="!(crew?.showEmpty ?? true)"
      >
        <span class="empty-state-icon" aria-hidden="true"></span>
        <p class="empty-state-text">{{ t('emptyCrewText') }}</p>
      </div>
      <div class="crew-role-cards">
        <div
          v-for="card in crew?.roleCards ?? []"
          :key="card.role"
          :class="['crew-role-card', 'crew-role-card--' + card.role, { 'crew-role-card--unlocked': card.unlocked }]"
        >
          <div class="crew-role-card-header">
            <span class="crew-role-card-name">{{ card.label }}</span>
            <span class="crew-role-card-count">{{ card.count }}</span>
          </div>
          <div class="crew-role-card-effect">{{ card.effectText }}</div>
          <span class="btn-tooltip-wrap crew-role-wrap" :data-role="card.role">
            <button
              type="button"
              :class="['hire-astronaut-btn', 'hire-astronaut-btn--' + card.role]"
              :data-role="card.role"
              :disabled="!card.canHire"
              :title="card.canHire ? (card.costStr + ' ⬡') : ''"
              @click="handleHire(card.role)"
            >
              <span class="crew-btn-role">{{ card.label }}</span>
              <span class="crew-btn-sep" aria-hidden="true">·</span>
              <span class="crew-btn-cost">{{ card.costStr }} ⬡</span>
            </button>
          </span>
        </div>
      </div>
      <div v-if="crew && crew.assignedCount > 0" class="crew-in-modules" aria-live="polite">
        {{ tParam('crewInModules', { n: String(crew.assignedCount) }) }}
      </div>
      <div v-if="crew && crew.veteranCount > 0" class="crew-veterans" aria-live="polite">
        {{ tParam('crewVeterans', { n: String(crew.veteranCount) }) }}
      </div>
    </EmpireSection>

    <EmpireSection
      id="planets-section"
      section-class="planets-section"
      title-key="planets"
      data-block="planets"
      rules-key="planetsRules"
      :summary="planetSummary"
      :unlocked="unlockedBlocks?.has('planets') ?? false"
    >
      <p class="planets-hint">{{ t('planetsHint') }}</p>
      <div ref="planetListRef" class="planet-list">
        <template v-if="!planetSystems?.length">
          <div class="empty-state">
            <span class="empty-state-icon" aria-hidden="true"></span>
            <p class="empty-state-text">{{ t('emptyPlanetsText') }}</p>
          </div>
        </template>
        <template v-else>
          <section
            v-for="sys in planetSystems"
            :key="sys.systemIndex"
            :class="['planet-system', { 'planet-system--collapsed': collapsedSystems.has(sys.systemIndex) }]"
            :data-system-index="sys.systemIndex"
            :aria-label="sys.systemName"
          >
            <button
              type="button"
              class="planet-system-header"
              :aria-expanded="!collapsedSystems.has(sys.systemIndex)"
              :aria-controls="'planet-system-planets-' + sys.systemIndex"
              :id="'planet-system-toggle-' + sys.systemIndex"
              @click="toggleSystem(sys.systemIndex)"
            >
              <span class="planet-system-toggle-icon" aria-hidden="true">
                {{ collapsedSystems.has(sys.systemIndex) ? '▶' : '▼' }}
              </span>
              <span class="planet-system-name">{{ sys.systemName }}</span>
            </button>
            <div
              v-show="!collapsedSystems.has(sys.systemIndex)"
              :id="'planet-system-planets-' + sys.systemIndex"
              class="planet-system-planets"
              role="region"
              :aria-labelledby="'planet-system-toggle-' + sys.systemIndex"
            >
              <div
                v-for="planet in sys.planets"
                :key="planet.id"
                class="planet-card"
                :data-planet-id="planet.id"
                role="button"
                tabindex="0"
                :title="planet.infoTooltip"
                @click="openPlanetDetail(planet.id)"
                @keydown.enter="openPlanetDetail(planet.id)"
                @keydown.space.prevent="openPlanetDetail(planet.id)"
              >
                <div class="planet-card-header">
                  <canvas
                    class="planet-card-visual"
                    width="112"
                    height="112"
                    :data-planet-id="planet.id"
                    :data-planet-name="planet.name"
                    :data-planet-visual-seed="planet.visualSeed"
                    aria-hidden="true"
                  ></canvas>
                  <div class="planet-card-name-wrap">
                    <div class="planet-card-name-block">
                      <span class="planet-card-name">{{ planet.displayName }}</span>
                      <span class="planet-card-system-name">{{ planet.systemName }}</span>
                    </div>
                    <span class="planet-card-info-wrap">
                      <span class="planet-card-info" :aria-label="t('planetInfoTitle')">ℹ</span>
                    </span>
                  </div>
                </div>
                <div class="planet-card-slots">
                  <span class="planet-slot-value">{{ planet.effectiveUsed }}/{{ planet.maxUpgrades }}</span> {{ t('slots') }}
                </div>
                <div :class="planet.productionClass">{{ planet.productionStr }}/s</div>
                <div class="planet-card-actions">
                  <button
                    type="button"
                    class="add-slot-btn"
                    :data-planet-id="planet.id"
                    :disabled="!planet.canAddSlot"
                    :title="planet.addSlotTooltip"
                    @click.stop="handleAddSlot(planet.id)"
                  >
                    {{ tParam('addSlotBtn', { cost: planet.addSlotCostStr }) }}
                  </button>
                  <button
                    v-if="planet.hasSlot"
                    type="button"
                    class="build-housing-btn"
                    :data-planet-id="planet.id"
                    :disabled="!planet.canBuildHousing"
                    :title="planet.housingTooltip"
                    @click.stop="handleBuildHousing(planet.id)"
                  >
                    {{ tParam('buildHousingBtn', { cost: planet.housingCostStr }) }}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </template>
      </div>
      <div class="expedition-area">
        <template v-if="expedition?.inProgress">
          <div class="expedition-progress-wrap">
            <div class="expedition-progress-bar-wrap">
              <div
                class="expedition-progress-fill"
                :style="{ width: (expedition?.progressPct ?? 0).toFixed(1) + '%' }"
              ></div>
            </div>
            <div class="expedition-progress-row">
              <p class="expedition-progress-text">{{ expedition?.progressText }}</p>
              <button type="button" class="expedition-cancel-btn" @click="handleCancelExpedition">
                {{ t('expeditionCancel') }}
              </button>
            </div>
          </div>
        </template>
        <template v-else>
          <span class="btn-tooltip-wrap">
            <button
              type="button"
              class="buy-planet-btn"
              :disabled="!expedition?.canLaunch"
              :title="expeditionTooltip"
              @click="openExpeditionModal"
            >
              {{ tParam('sendExpeditionBtn', { cost: expedition?.costStr ?? '0', n: String(expedition?.astronautsRequired ?? 0) }) }}
            </button>
          </span>
          <p v-if="expedition?.isNewSystem" class="expedition-new-system-hint" aria-live="polite">
            {{ t('expeditionNextNewSystemLabel') }}
          </p>
        </template>
      </div>
    </EmpireSection>

    <EmpireSection
      id="prestige-section"
      section-class="prestige-section"
      title-key="prestige"
      data-block="prestige"
      rules-key="prestigeRules"
      :summary="prestige?.summaryText ?? ''"
      :unlocked="unlockedBlocks?.has('prestige') ?? false"
    >
      <p class="prestige-hint">{{ t('prestigeHint') }}</p>
      <div class="prestige-status">{{ prestige?.statusText ?? '' }}</div>
      <div class="prestige-actions">
        <span class="btn-tooltip-wrap" id="prestige-btn-wrap">
          <button
            type="button"
            class="prestige-btn"
            :disabled="!prestige?.canPrestige"
            :title="prestige?.statusText"
            @click="handlePrestige"
          >
            {{ t('prestige') }}
          </button>
        </span>
        <button type="button" class="prestige-rewards-btn" @click="openPrestigeRewardsModal">
          {{ t('prestigeRewardsWhatFor') }}
        </button>
      </div>
    </EmpireSection>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUpdated, watch } from 'vue';
import { t, tParam } from '../../../application/strings.js';
import {
  handlePrestige as doPrestige,
  handleHireAstronaut,
  handleAddSlot as doAddSlot,
  handleBuildHousing as doBuildHousing,
  handleCancelExpedition,
  openPrestigeRewardsModal,
} from '../../../application/handlers.js';
import { openExpeditionModal } from '../../expeditionModal.js';
import { openPlanetDetail } from '../../planetDetailView.js';
import { renderPlanetThumbnails } from '../../planetThumbnail3D.js';
import { useEmpireData } from '../composables/useEmpireData.js';
import EmpireSection from '../components/EmpireSection.vue';
import type { CrewRole } from '../../../domain/constants.js';

const { crew, planetSystems, prestige, expedition, unlockedBlocks } = useEmpireData();

const planetListRef = ref<HTMLElement | null>(null);
const collapsedSystems = ref<Set<number>>(new Set());

const planetSummary = computed(() => {
  const n = planetSystems.value?.flatMap((s) => s.planets).length ?? 0;
  return n > 0 ? `${n} planet${n !== 1 ? 's' : ''}` : '';
});

const expeditionTooltip = computed(() => {
  const exp = expedition.value;
  if (!exp) return '';
  return exp.canLaunch
    ? tParam('sendExpeditionTooltip', { n: exp.astronautsRequired, cost: exp.costStr })
    : tParam('needForExpedition', { cost: exp.costStr, n: exp.astronautsRequired });
});

function toggleSystem(systemIndex: number): void {
  const next = new Set(collapsedSystems.value);
  if (next.has(systemIndex)) next.delete(systemIndex);
  else next.add(systemIndex);
  collapsedSystems.value = next;
}

function handleHire(role: CrewRole): void {
  handleHireAstronaut(role);
}

function handleAddSlot(planetId: string): void {
  doAddSlot(planetId);
}

function handleBuildHousing(planetId: string): void {
  doBuildHousing(planetId);
}

function handlePrestige(): void {
  doPrestige();
}

onUpdated(() => {
  if (planetListRef.value?.querySelector('.planet-card-visual')) {
    renderPlanetThumbnails();
  }
});

watch(
  planetSystems,
  () => {
    if (planetListRef.value?.querySelector('.planet-card-visual')) {
      renderPlanetThumbnails();
    }
  },
  { flush: 'post' }
);
</script>
