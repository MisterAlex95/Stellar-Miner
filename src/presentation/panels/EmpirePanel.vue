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
      <div v-if="crew && crew.totalCrew > 0 && crew.retrainUnlocked" class="crew-retrain-wrap">
        <p class="crew-retrain-label">{{ t('crewRetrainLabel') }}</p>
        <div class="crew-retrain-row">
          <label class="crew-retrain-from-label">{{ t('crewRetrainFrom') }}</label>
          <select
            v-model="retrainFrom"
            class="crew-retrain-select"
            :aria-label="t('crewRetrainFrom')"
          >
            <option value="">—</option>
            <option
              v-for="card in crew.roleCards.filter((c) => c.count > 0 && c.unlocked)"
              :key="'from-' + card.role"
              :value="card.role"
            >
              {{ card.label }} ({{ card.count }})
            </option>
          </select>
          <label class="crew-retrain-to-label">{{ t('crewRetrainTo') }}</label>
          <select
            v-model="retrainTo"
            class="crew-retrain-select"
            :aria-label="t('crewRetrainTo')"
          >
            <option value="">—</option>
            <option
              v-for="card in crew.roleCards.filter((c) => c.unlocked)"
              :key="'to-' + card.role"
              :value="card.role"
            >
              {{ card.label }}
            </option>
          </select>
          <button
            type="button"
            class="crew-retrain-btn"
            :disabled="!canRetrain"
            :title="retrainBtnTitle"
            @click="handleRetrain"
          >
            {{ tParam('crewRetrainBtn', { cost: crew.retrainCostStr }) }}
          </button>
        </div>
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
import { t, tParam } from '../../application/strings.js';
import {
  handlePrestige as doPrestige,
  handleHireAstronaut,
  handleRetrainCrew,
  handleAddSlot as doAddSlot,
  handleBuildHousing as doBuildHousing,
  handleCancelExpedition,
  openPrestigeRewardsModal,
} from '../../application/handlers.js';
import { openExpeditionModal } from '../modals/expedition.js';
import { openPlanetDetail } from '../modals/planetDetail.js';
import { renderPlanetThumbnails } from '../canvas/planetThumbnail3D.js';
import { useEmpireData } from '../composables/useEmpireData.js';
import EmpireSection from '../components/EmpireSection.vue';
import type { CrewRole } from '../../domain/constants.js';

const { crew, planetSystems, prestige, expedition, unlockedBlocks } = useEmpireData();

const planetListRef = ref<HTMLElement | null>(null);
const collapsedSystems = ref<Set<number>>(new Set());
const retrainFrom = ref<CrewRole | ''>('');
const retrainTo = ref<CrewRole | ''>('');

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

const canRetrain = computed(() => {
  const c = crew.value;
  if (!c || !retrainFrom.value || !retrainTo.value) return false;
  if (retrainFrom.value === retrainTo.value) return false;
  const fromCard = c.roleCards.find((r) => r.role === retrainFrom.value);
  if (!fromCard || fromCard.count < 1) return false;
  return c.retrainCanAfford;
});

const retrainBtnTitle = computed(() => {
  if (!canRetrain.value) return '';
  return tParam('crewRetrainBtn', { cost: crew.value?.retrainCostStr ?? '' });
});

function handleRetrain(): void {
  if (!retrainFrom.value || !retrainTo.value || retrainFrom.value === retrainTo.value) return;
  handleRetrainCrew(retrainFrom.value, retrainTo.value);
}

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

<style scoped>
.planets-hint {
  font-size: 0.8rem;
  color: var(--text-dim);
  margin: 0 0 0.75rem 0;
  line-height: 1.5;
}

:deep(.housing-section .housing-hint) {
  font-size: 0.8rem;
  color: var(--text-dim);
  margin: 0 0 0.75rem 0;
  line-height: 1.5;
}

.planet-list {
  margin-bottom: 0.75rem;
}

.planet-system {
  margin-bottom: 1rem;
}

.planet-system:last-child {
  margin-bottom: 0;
}

.planet-system-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.6rem;
  margin-bottom: 0.5rem;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
  text-align: left;
}

.planet-system-header:hover {
  background: var(--bg-card);
  border-color: var(--accent);
  color: var(--accent);
}

.planet-system-header:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.planet-system-toggle-icon {
  flex-shrink: 0;
  font-size: 0.75rem;
  color: var(--text-dim);
  transition: transform 0.2s;
}

.planet-system-name {
  flex: 1;
  min-width: 0;
}

.planet-system-planets {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-left: 0.25rem;
}

.planet-system--collapsed .planet-system-planets {
  display: none;
}

@media (max-width: 360px) {
  .planet-system-planets {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
}

.planet-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.85rem 1rem;
  min-height: 88px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: border-color 0.2s, box-shadow 0.2s;
  align-items: stretch;
}

.planet-card:hover {
  border-color: rgba(245, 158, 11, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

@media (max-width: 360px) {
  .planet-card {
    padding: 0.75rem;
    min-height: 80px;
  }
}

.planet-card-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.planet-card-visual {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 4px;
  display: block;
  cursor: pointer;
  background: transparent;
  transition: transform 0.15s ease, filter 0.15s ease;
  overflow: visible;
}

.planet-card-visual:hover {
  transform: scale(1.12);
  filter: brightness(1.15);
}

.planet-card-name-wrap {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
}

.planet-card-name-block {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.planet-card-name {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
  min-width: 0;
}

.planet-card-system-name {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-dim);
  min-width: 0;
}

.planet-card-info {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 50%;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-dim);
  background: var(--bg-card);
  border: 1px solid var(--border);
  cursor: help;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}

.planet-card-info:hover {
  color: var(--accent);
  border-color: var(--accent);
  background: rgba(245, 158, 11, 0.08);
}

.planet-card-info-wrap {
  display: inline-flex;
  flex-shrink: 0;
  cursor: help;
}

.planet-card-slots {
  font-size: 0.8rem;
  color: var(--text-dim);
  min-height: 1.25em;
}

.planet-slot-value {
  color: var(--accent);
  font-weight: 600;
}

.planet-card-production {
  font-size: 0.8rem;
  color: var(--success);
  min-height: 1.25em;
  display: flex;
  align-items: center;
}

.planet-card-production--zero {
  color: var(--text-dim);
}

.planet-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.add-slot-btn {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.35rem 0.65rem;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg-panel);
  color: var(--text-dim);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.add-slot-btn:hover:not(:disabled) {
  background: var(--bg-card);
  color: var(--text);
  border-color: var(--accent);
}

.add-slot-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.buy-planet-btn {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-panel);
  color: var(--text);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.buy-planet-btn:hover:not(:disabled) {
  background: var(--accent);
  color: var(--bg-dark);
  border-color: var(--accent);
}

.buy-planet-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.buy-planet-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 360px) {
  .buy-planet-btn {
    width: 100%;
    min-height: 44px;
  }
}

.housing-empty {
  font-size: 0.8rem;
  color: var(--text-dim);
  margin: 0 0 0.5rem 0;
}

.housing-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.housing-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.85rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.housing-card:hover {
  border-color: rgba(245, 158, 11, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.housing-planet-name {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
}

.build-housing-btn {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.35rem 0.65rem;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg-panel);
  color: var(--text-dim);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.build-housing-btn:hover:not(:disabled) {
  background: var(--bg-card);
  color: var(--text);
  border-color: var(--accent);
}

.build-housing-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.expedition-area {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.expedition-new-system-hint {
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  color: var(--text-dim);
  font-weight: 500;
}

.expedition-progress-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.expedition-progress-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.expedition-cancel-btn {
  flex-shrink: 0;
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--bg-panel);
  color: var(--text-dim);
  cursor: pointer;
}

.expedition-cancel-btn:hover {
  background: var(--bg-input);
  color: var(--text);
}

.expedition-progress-bar-wrap {
  height: 8px;
  background: var(--bg-panel);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.expedition-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), #e69500);
  border-radius: 3px;
  transition: width 0.2s ease;
  min-width: 0;
}

.expedition-progress-text {
  font-size: 0.8rem;
  color: var(--text-dim);
  margin: 0;
}

.crew-retrain-wrap {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
}

.crew-retrain-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-dim);
  margin: 0 0 0.35rem 0;
}

.crew-retrain-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 0.6rem;
}

.crew-retrain-from-label,
.crew-retrain-to-label {
  font-size: 0.75rem;
  color: var(--text-dim);
}

.crew-retrain-select {
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--bg-panel);
  color: var(--text);
  min-width: 6rem;
}

.crew-retrain-btn {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg-panel);
  color: var(--text-dim);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.crew-retrain-btn:hover:not(:disabled) {
  background: var(--bg-card);
  color: var(--accent);
  border-color: var(--accent);
}

.crew-retrain-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
