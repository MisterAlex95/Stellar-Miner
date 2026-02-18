<template>
  <div
    id="planet-detail-overlay"
    class="planet-detail-overlay"
    aria-hidden="true"
    @click.self="handleClose"
  >
    <div
      v-if="planetDetail"
      class="planet-detail-modal"
      role="dialog"
      aria-labelledby="planet-detail-title"
    >
      <div class="planet-detail-header">
        <h2 id="planet-detail-title">
          {{ t('planetDetailTitle') }}
        </h2>
        <button
          id="planet-detail-close"
          type="button"
          class="planet-detail-close"
          :aria-label="t('close')"
          @click="handleClose"
        >
          ×
        </button>
      </div>
      <div class="planet-detail-body">
        <div
          ref="threeContainerRef"
          class="planet-detail-visual"
          id="planet-detail-3d-container"
        >
          <p class="planet-detail-drag-hint">
            {{ t('planetDetailDragHint') }}
          </p>
        </div>
        <div class="planet-detail-info">
          <h3 class="planet-detail-name">
            {{ planetDetail.displayName }}
          </h3>
          <div class="planet-detail-stats">
            <div class="planet-detail-stat">
              <span class="planet-detail-stat-label">{{ t('planetDetailSystem') }}</span>
              <span class="planet-detail-stat-value">{{ planetDetail.systemName }}</span>
            </div>
            <div class="planet-detail-stat">
              <span class="planet-detail-stat-label">{{ t('planetDetailType') }}</span>
              <span
                class="planet-detail-stat-value planet-detail-type"
                :class="'planet-detail-type--' + planetDetail.planetType"
              >
                {{ planetDetail.typeLabel }}
              </span>
            </div>
            <div class="planet-detail-stat">
              <span class="planet-detail-stat-label">{{ t('planetDetailProduction') }}</span>
              <span class="planet-detail-stat-value planet-detail-stat-value--prod">{{ planetDetail.prodStr }}/s</span>
            </div>
            <div class="planet-detail-stat">
              <span class="planet-detail-stat-label">{{ t('planetDetailSlots') }}</span>
              <span class="planet-detail-stat-value">
                <span class="planet-detail-stat-accent">{{ planetDetail.effectiveUsed }}</span>/{{ planetDetail.maxUpgrades }}
              </span>
            </div>
            <div class="planet-detail-stat">
              <span class="planet-detail-stat-label">{{ t('planetDetailHousing') }}</span>
              <span class="planet-detail-stat-value">{{ planetDetail.housingLine }}</span>
            </div>
            <div class="planet-detail-stat">
              <span class="planet-detail-stat-label">{{ t('planetDetailCrew') }}</span>
              <span class="planet-detail-stat-value">{{ planetDetail.crewLine }}</span>
            </div>
            <div class="planet-detail-stat">
              <span class="planet-detail-stat-label">{{ t('planetDetailMoons') }}</span>
              <span class="planet-detail-stat-value">{{ planetDetail.moonCount }}</span>
            </div>
            <div class="planet-detail-stat">
              <span class="planet-detail-stat-label">{{ t('planetDetailExtra') }}</span>
              <span class="planet-detail-stat-value">{{ planetDetail.extraLabel }}</span>
            </div>
          </div>
          <div class="planet-detail-upgrades-section">
            <h4 class="planet-detail-upgrades-title">
              {{ t('planetDetailUpgrades') }}
            </h4>
            <ul
              v-if="planetDetail.upgradeItems.length > 0"
              class="planet-detail-upgrade-list"
            >
              <li
                v-for="(item, idx) in planetDetail.upgradeItems"
                :key="idx"
                class="planet-detail-upgrade-item"
              >
                <span class="planet-detail-upgrade-name">{{ item.name }}</span>
                <span class="planet-detail-upgrade-count">×{{ item.count }}</span>
              </li>
            </ul>
            <p
              v-else
              class="planet-detail-empty"
            >
              {{ t('planetDetailNoUpgrades') }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import { useAppUIStore } from '../stores/appUI.js';
import { closePlanetDetail } from '../modals/planetDetail.js';
import { t } from '../../application/strings.js';
import { createPlanetScene, type PlanetScene } from '../canvas/planetDetail3D.js';

const store = useAppUIStore();
const { planetDetail } = storeToRefs(store);

const threeContainerRef = ref<HTMLElement | null>(null);
let currentScene: PlanetScene | null = null;
let resizeObserver: ResizeObserver | null = null;

function disposeScene(): void {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (currentScene) {
    currentScene.dispose();
    currentScene = null;
  }
}

watch(
  planetDetail,
  (detail) => {
    if (!detail) {
      disposeScene();
      return;
    }
    nextTick(() => {
      const container = threeContainerRef.value;
      if (!container) return;
      const scene3d = createPlanetScene(detail.planetName, detail.planetType, detail.visualSeed);
      currentScene = scene3d;
      scene3d.domElement.className = 'planet-detail-canvas-3d';
      container.prepend(scene3d.domElement);

      const rect = container.getBoundingClientRect();
      const size = Math.min(rect.width, 340);
      scene3d.resize(size, size);

      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = entry.contentRect.width;
          const s = Math.min(w, 340);
          scene3d.resize(s, s);
        }
      });
      resizeObserver.observe(container);
    });
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  disposeScene();
});

function handleClose(): void {
  disposeScene();
  store.clearPlanetDetail();
  closePlanetDetail();
}
</script>
