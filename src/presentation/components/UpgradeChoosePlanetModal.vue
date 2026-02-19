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
import { t } from '../../application/strings.js';
import { closeUpgradeChoosePlanetModal, onPlanetChosen } from '../modals/upgradeChoosePlanet.js';
import { startPlanetThumbnail3DLoop } from '../canvas/planetThumbnail3D.js';
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

<style scoped>
.upgrade-choose-planet-overlay {
  position: fixed;
  inset: 0;
  z-index: 101;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s, visibility 0.2s;
}

.upgrade-choose-planet-overlay--open {
  opacity: 1;
  visibility: visible;
}

.upgrade-choose-planet-modal {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 100%;
  max-width: 360px;
  height: 70vh;
  max-height: 90vh;
  padding: 1.25rem;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.upgrade-choose-planet-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-shrink: 0;
}

.upgrade-choose-planet-title {
  margin: 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 1.1rem;
  color: var(--text);
  flex: 1;
}

.upgrade-choose-planet-close {
  flex-shrink: 0;
  font-size: 1.5rem;
  line-height: 1;
  padding: 0.25rem;
  border: none;
  background: transparent;
  color: var(--text-dim);
  cursor: pointer;
  border-radius: 6px;
}

.upgrade-choose-planet-close:hover {
  color: var(--text);
  background: var(--bg-card);
}

.upgrade-choose-planet-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1 1 0;
  min-height: 0;
  max-height: calc(70vh - 8rem);
  overflow-y: scroll;
  overflow-x: hidden;
  overscroll-behavior: contain;
  margin-bottom: 1rem;
  -webkit-overflow-scrolling: touch;
  scrollbar-gutter: stable;
}

.upgrade-choose-planet-list [role="listitem"] {
  display: block;
  flex-shrink: 0;
}

.upgrade-choose-planet-item {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-card);
  overflow: hidden;
  position: relative;
}

.upgrade-choose-planet-item--expanded {
  z-index: 1;
}

.upgrade-choose-planet-item--recommended {
  border-color: var(--accent);
  background: rgba(var(--accent-rgb, 99, 102, 241), 0.08);
}

.upgrade-choose-planet-item-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.65rem;
  min-height: 2.5rem;
}

.upgrade-choose-planet-item-name {
  flex: 1;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upgrade-choose-planet-count-chip {
  flex-shrink: 0;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--bg-dark);
  background: var(--accent);
  padding: 0.12rem 0.35rem;
  border-radius: 4px;
  white-space: nowrap;
}

.upgrade-choose-planet-recommended {
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--accent);
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  border: 1px solid var(--accent);
  white-space: nowrap;
}

.upgrade-choose-planet-toggle {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-dim);
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upgrade-choose-planet-toggle:hover {
  background: var(--bg-panel);
  color: var(--text);
}

.upgrade-choose-planet-select {
  flex-shrink: 0;
  font-family: 'Exo 2', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--accent);
  background: rgba(var(--accent-rgb, 99, 102, 241), 0.2);
  color: var(--accent);
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

.upgrade-choose-planet-select:hover {
  background: rgba(var(--accent-rgb, 99, 102, 241), 0.35);
}

.upgrade-choose-planet-item--collapsed .upgrade-choose-planet-item-body {
  display: none;
}

.upgrade-choose-planet-item--expanded .upgrade-choose-planet-item-body {
  display: flex;
}

.upgrade-choose-planet-item-body {
  padding: 0.65rem 0.65rem 0.75rem;
  border-top: 1px solid var(--border);
  background: var(--bg-panel);
  flex-direction: row;
  gap: 0.75rem;
  align-items: flex-start;
}

.upgrade-choose-planet-preview {
  flex-shrink: 0;
}

.upgrade-choose-planet-visual {
  display: block;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--bg-card);
  border: 1px solid var(--border);
}

.upgrade-choose-planet-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.upgrade-choose-planet-detail {
  font-size: 0.8rem;
  color: var(--text-dim);
}

.upgrade-choose-planet-detail-label {
  display: inline-block;
  min-width: 5rem;
  font-weight: 500;
  color: var(--text);
}

.upgrade-choose-planet-type {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
}

.upgrade-choose-planet-type--rocky {
  background: rgba(107, 114, 128, 0.3);
  color: #9ca3af;
}

.upgrade-choose-planet-type--desert {
  background: rgba(217, 119, 6, 0.25);
  color: #fcd34d;
}

.upgrade-choose-planet-type--ice {
  background: rgba(96, 165, 250, 0.25);
  color: #93c5fd;
}

.upgrade-choose-planet-type--volcanic {
  background: rgba(234, 88, 12, 0.25);
  color: #fdba74;
}

.upgrade-choose-planet-type--gas {
  background: rgba(139, 92, 246, 0.25);
  color: #c4b5fd;
}

.upgrade-choose-planet-actions {
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

.upgrade-choose-planet-cancel {
  font-family: 'Exo 2', sans-serif;
  font-size: 0.95rem;
  padding: 0.6rem 1.25rem;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text);
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

.upgrade-choose-planet-cancel:hover {
  background: var(--bg-panel);
  border-color: var(--accent);
}
</style>
