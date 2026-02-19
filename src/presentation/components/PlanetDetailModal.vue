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

<style scoped>
.planet-detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.7);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.25s, visibility 0.25s;
}

.planet-detail-overlay--open {
  opacity: 1;
  visibility: visible;
}

.planet-detail-modal {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.planet-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.planet-detail-header h2 {
  margin: 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text);
}

.planet-detail-close {
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-dim);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.2s, background 0.2s;
}

.planet-detail-close:hover {
  color: var(--text);
  background: var(--bg-card);
}

.planet-detail-body {
  padding: 1rem 1.25rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.planet-detail-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.planet-detail-canvas-3d {
  border-radius: 8px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
  background: transparent;
  display: block;
  margin: 0 auto;
}

.planet-detail-drag-hint {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-dim);
  opacity: 0.7;
  text-align: center;
}

.planet-detail-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.planet-detail-name {
  margin: 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  color: var(--accent);
  text-align: center;
}

.planet-detail-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem 1rem;
}

.planet-detail-stat {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.4rem 0.6rem;
  background: var(--bg-card);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.planet-detail-stat-label {
  font-size: 0.7rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}

.planet-detail-stat-value {
  font-size: 0.85rem;
  color: var(--text);
  font-weight: 500;
}

.planet-detail-stat-value--prod {
  color: var(--success);
  font-weight: 600;
}

.planet-detail-stat-accent {
  color: var(--accent);
  font-weight: 600;
}

.planet-detail-type--rocky { color: #a8a29e; }
.planet-detail-type--desert { color: #d4b896; }
.planet-detail-type--ice { color: #7dd3fc; }
.planet-detail-type--volcanic { color: #f87171; }
.planet-detail-type--gas { color: #facc15; }

.planet-detail-upgrades-section {
  margin-top: 0.25rem;
}

.planet-detail-upgrades-title {
  margin: 0 0 0.5rem 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.planet-detail-upgrade-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.planet-detail-upgrade-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.35rem 0.6rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.8rem;
}

.planet-detail-upgrade-name {
  color: var(--text);
  font-weight: 500;
}

.planet-detail-upgrade-count {
  color: var(--accent);
  font-weight: 600;
  font-size: 0.75rem;
}

.planet-detail-empty {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-dim);
}

@media (max-width: 480px) {
  .planet-detail-modal {
    max-width: 100%;
    border-radius: 12px;
  }

  .planet-detail-stats {
    grid-template-columns: 1fr;
  }
}
</style>
