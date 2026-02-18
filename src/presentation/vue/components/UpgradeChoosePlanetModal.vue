<template>
  <div
    id="upgrade-choose-planet-overlay"
    class="upgrade-choose-planet-overlay"
    aria-hidden="true"
    @click.self="closeUpgradeChoosePlanetModal"
  >
    <div
      class="upgrade-choose-planet-modal"
      role="dialog"
      aria-labelledby="upgrade-choose-planet-title"
    >
      <div class="upgrade-choose-planet-header">
        <h2
          id="upgrade-choose-planet-title"
          class="upgrade-choose-planet-title"
        >
          {{ title }}
        </h2>
        <button
          id="upgrade-choose-planet-close"
          type="button"
          class="upgrade-choose-planet-close"
          :aria-label="t('close')"
          @click="closeUpgradeChoosePlanetModal"
        >
          ×
        </button>
      </div>
      <div
        id="upgrade-choose-planet-list"
        class="upgrade-choose-planet-list"
        role="list"
      >
        <div
          v-for="planet in data?.planets ?? []"
          :key="planet.id"
          role="listitem"
          class="upgrade-choose-planet-item"
          :class="{
            'upgrade-choose-planet-item--expanded': expandedId === planet.id,
            'upgrade-choose-planet-item--collapsed': expandedId !== planet.id,
            'upgrade-choose-planet-item--recommended': planet.isRecommended,
          }"
        >
          <div class="upgrade-choose-planet-item-header">
            <span class="upgrade-choose-planet-item-name">{{ planet.displayName }}</span>
            <span
              class="upgrade-choose-planet-count-chip"
              :aria-label="planet.installedCount + ' ' + t('upgradeChoosePlanetInstalledOnPlanet')"
            >
              ×{{ planet.installedCount }}
            </span>
            <span
              v-if="planet.isRecommended"
              class="upgrade-choose-planet-recommended"
              :title="t('upgradeChoosePlanetRecommendedHint')"
              :aria-label="t('upgradeChoosePlanetRecommendedHint')"
            >
              {{ t('recommended') }}
            </span>
            <button
              type="button"
              class="upgrade-choose-planet-toggle"
              :aria-expanded="expandedId === planet.id"
              :aria-label="expandedId === planet.id ? t('upgradeChoosePlanetCollapse') : t('upgradeChoosePlanetExpand')"
              @click="toggleExpanded(planet.id)"
            >
              {{ expandedId === planet.id ? '▼' : '▶' }}
            </button>
            <button
              type="button"
              class="upgrade-choose-planet-select"
              :data-planet-id="planet.id"
              @click="onSelect(planet.id)"
            >
              {{ t('upgradeChoosePlanetSelect') }}
            </button>
          </div>
          <div class="upgrade-choose-planet-item-body">
            <div class="upgrade-choose-planet-preview" aria-hidden="true">
              <canvas
                class="planet-card-visual upgrade-choose-planet-visual"
                width="80"
                height="80"
                :data-planet-id="planet.id"
                :data-planet-name="planet.name"
                :data-planet-visual-seed="String(planet.visualSeed)"
                aria-hidden="true"
              />
            </div>
            <div class="upgrade-choose-planet-details">
              <div class="upgrade-choose-planet-detail">
                <span class="upgrade-choose-planet-detail-label">{{ t('planetDetailProduction') }}</span>
                {{ planet.productionStr }}/s
              </div>
              <div class="upgrade-choose-planet-detail">
                <span class="upgrade-choose-planet-detail-label">{{ t('planetDetailSlots') }}</span>
                {{ planet.usedSlots }}/{{ planet.maxUpgrades }}
              </div>
              <div class="upgrade-choose-planet-detail">
                <span class="upgrade-choose-planet-detail-label">{{ t('planetDetailType') }}</span>
                <span :class="['upgrade-choose-planet-type', 'upgrade-choose-planet-type--' + planet.planetType]">
                  {{ planetTypeLabel(planet.planetType) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="upgrade-choose-planet-actions">
        <button
          id="upgrade-choose-planet-cancel"
          type="button"
          class="upgrade-choose-planet-cancel"
          @click="closeUpgradeChoosePlanetModal"
        >
          {{ t('cancel') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { t } from '../../../application/strings.js';
import { closeUpgradeChoosePlanetModal, onPlanetChosen } from '../../modals/upgradeChoosePlanetModal.js';
import { startPlanetThumbnail3DLoop } from '../../canvas/planetThumbnail3D.js';
import { useAppUIStore } from '../stores/appUI.js';

const appUI = useAppUIStore();
const data = computed(() => appUI.upgradeChoosePlanet);
const expandedId = ref<string | null>(null);

const title = computed(() => {
  const d = data.value;
  if (!d) return '';
  return d.action === 'uninstall' ? t('upgradeChoosePlanetUninstallTitle') : t('upgradeChoosePlanetInstallTitle');
});

function planetTypeLabel(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function toggleExpanded(planetId: string): void {
  expandedId.value = expandedId.value === planetId ? null : planetId;
}

function onSelect(planetId: string): void {
  const d = data.value;
  if (!d) return;
  onPlanetChosen(d.upgradeId, planetId, d.action, d.maxCount);
}

watch(
  data,
  (val) => {
    expandedId.value = null;
    if (val?.planets?.length) {
      nextTick(() => startPlanetThumbnail3DLoop());
    }
  },
  { immediate: true },
);
</script>
