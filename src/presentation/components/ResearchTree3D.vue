<template>
  <div
    ref="containerRef"
    class="research-tree-3d"
    role="img"
    :aria-label="t('research') + ' tree (3D)'"
  >
    <div
      v-if="hoveredDisplay"
      class="research-tree-3d-tooltip"
    >
      <p class="research-tree-3d-tooltip-name">
        <ResearchIcon
          :name="hoveredDisplay.icon"
          :node-id="hoveredDisplay.node.id"
          :size="18"
          class="research-tree-3d-tooltip-icon"
        />
        {{ hoveredDisplay.name }}
      </p>
      <p class="research-tree-3d-tooltip-desc">{{ hoveredDisplay.desc }}</p>
      <p v-if="hoveredDisplay.lore" class="research-tree-3d-tooltip-lore">{{ hoveredDisplay.lore }}</p>
      <p v-if="hoveredDisplay.modText && hoveredDisplay.modText !== '—'" class="research-tree-3d-tooltip-mods">
        {{ t('researchEffectsLabel') }} {{ hoveredDisplay.modText }}
      </p>
      <template v-if="!hoveredDisplay.done">
        <p class="research-tree-3d-tooltip-meta">
          <span>{{ hoveredDisplay.costStr }} ⬡</span>
          <span>{{ hoveredDisplay.effectivePct }}% success</span>
        </p>
        <p v-if="hoveredDisplay.prereqText" class="research-tree-3d-tooltip-prereq">
          {{ tParam('researchRequires', { names: hoveredDisplay.prereqText }) }}
        </p>
      </template>
      <p v-else class="research-tree-3d-tooltip-done">
        ✓ {{ t('unlockedLabel') }}
      </p>
    </div>
    <div class="research-tree-3d-zoom">
      <button
        type="button"
        class="research-tree-3d-zoom-btn"
        :aria-label="t('researchTree3DZoomOut')"
        @click="onZoomOut"
      >
        −
      </button>
      <button
        type="button"
        class="research-tree-3d-zoom-btn"
        :aria-label="t('researchTree3DZoomIn')"
        @click="onZoomIn"
      >
        +
      </button>
    </div>
    <p class="research-tree-3d-hint">
      {{ t('researchTree3DHint') }}
    </p>
    <ResearchNodeDetailModal
      :data="selectedDisplay"
      @close="selectedNodeId = null"
      @attempt="onModalAttempt"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import { useGameStateStore } from '../stores/gameState.js';
import { useAppUIStore } from '../stores/appUI.js';
import { t, tParam } from '../../application/strings.js';
import { startResearchWithProgress } from '../../application/handlers.js';
import {
  getResearchTreeRows,
  getResearchBranchSegments,
  getResearchSpriteIndexById,
  getUnlockedResearch,
  canAttemptResearch,
  getResearchData,
  getRecommendedResearchNodeIds,
  getUnlockPathIds,
  RESEARCH_CATALOG,
} from '../../application/research.js';
import { getSession, getSettings } from '../../application/gameState.js';
import { getResearchNodeDisplayData, type ResearchNodeDisplayData } from '../../application/researchDisplay.js';
import {
  createResearchTreeScene,
  type ResearchTreeScene,
  type ResearchNodeState,
} from '../canvas/researchTree3D.js';
import ResearchIcon from './ResearchIcon.vue';
import ResearchNodeDetailModal from './ResearchNodeDetailModal.vue';

const containerRef = ref<HTMLElement | null>(null);
const hoveredNodeId = ref<string | null>(null);
const selectedNodeId = ref<string | null>(null);
let scene: ResearchTreeScene | null = null;
let resizeObserver: ResizeObserver | null = null;

const store = useGameStateStore();
const { researchProgress } = storeToRefs(useAppUIStore());

function getDisplayDataForNode(id: string | null): ResearchNodeDisplayData | null {
  if (!id) return null;
  const node = RESEARCH_CATALOG.find((n) => n.id === id);
  if (!node) return null;
  const session = getSession();
  const settings = getSettings();
  const unlocked = getUnlockedResearch();
  const scientistCount = session?.player.crewByRole?.scientist ?? 0;
  const researchData = getResearchData();
  const recommendedIds = getRecommendedResearchNodeIds(scientistCount);
  return getResearchNodeDisplayData(
    node,
    session,
    settings.compactNumbers,
    unlocked,
    scientistCount,
    researchData,
    recommendedIds
  );
}

const hoveredDisplay = computed((): ResearchNodeDisplayData | null => {
  store.coins;
  store.runStats;
  return getDisplayDataForNode(hoveredNodeId.value);
});

const selectedDisplay = computed((): ResearchNodeDisplayData | null => {
  store.coins;
  store.runStats;
  return getDisplayDataForNode(selectedNodeId.value);
});

const sceneInput = computed(() => {
  store.coins;
  store.runStats;
  const rows = getResearchTreeRows();
  const segments = getResearchBranchSegments();
  const unlocked = getUnlockedResearch();
  const session = getSession();
  const researchData = getResearchData();
  const stateById: Record<string, ResearchNodeState> = {};
  for (const row of rows) {
    for (const node of row) {
      stateById[node.id] = {
        done: unlocked.includes(node.id),
        canAttempt: !!(
          session &&
          canAttemptResearch(node.id, {
            coinsAvailable: session.player.coins.value.toNumber(),
            researchDataAvailable: researchData,
          })
        ),
      };
    }
  }
  return { rows, segments, stateById, getSpriteIndexForNode: getResearchSpriteIndexById };
});

function initScene(): void {
  const container = containerRef.value;
  if (!container || scene) return;
  const { rows, segments, stateById, getSpriteIndexForNode } = sceneInput.value;
  scene = createResearchTreeScene({ rows, segments, stateById, getSpriteIndexForNode });
  scene.onNodePick((nodeId) => {
    selectedNodeId.value = nodeId;
  });
  scene.onHover((nodeId) => {
    hoveredNodeId.value = nodeId;
  });
  scene.domElement.className = 'research-tree-3d-canvas';
  updateHighlightPath();
  container.prepend(scene.domElement);

  const rect = container.getBoundingClientRect();
  scene.resize(rect.width, rect.height);

  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      scene?.resize(width, height);
    }
  });
  resizeObserver.observe(container);
  syncProgressToScene();
}

function syncProgressToScene(): void {
  if (!scene) return;
  const now = Date.now();
  const data: Record<string, { endTimeMs: number; totalDurationMs: number } | null> = {};
  for (const [id, p] of Object.entries(researchProgress.value)) {
    data[id] = p && now <= p.endTimeMs + 50
      ? { endTimeMs: p.endTimeMs, totalDurationMs: p.totalDurationMs }
      : null;
  }
  scene.setProgress(data);
}

function disposeScene(): void {
  if (resizeObserver && containerRef.value) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (scene) {
    scene.dispose();
    scene = null;
  }
}

watch(
  () => sceneInput.value.stateById,
  (stateById) => {
    scene?.setState(stateById);
  },
  { deep: true }
);

watch(hoveredNodeId, () => {
  updateHighlightPath();
});

watch(researchProgress, () => {
  syncProgressToScene();
}, { deep: true });

function updateHighlightPath(): void {
  if (!scene) return;
  const id = hoveredNodeId.value;
  if (!id) {
    scene.setHighlightPath(null);
    return;
  }
  const pathIds = getUnlockPathIds(id).concat(id);
  scene.setHighlightPath(pathIds);
}

function onZoomIn(): void {
  scene?.zoomIn();
}

function onZoomOut(): void {
  scene?.zoomOut();
}

function onModalAttempt(id: string, cardEl: HTMLElement): void {
  startResearchWithProgress(cardEl, id);
}

onMounted(() => {
  initScene();
});

onBeforeUnmount(() => {
  disposeScene();
});
</script>

<style scoped>
.research-tree-3d {
  position: relative;
  width: 100%;
  min-height: 360px;
  border-radius: 12px;
  overflow: hidden;
  background: #07090c;
  border: 1px solid rgba(51, 65, 85, 0.6);
  box-shadow: inset 0 0 80px rgba(0, 0, 0, 0.4);
}

.research-tree-3d-tooltip {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  right: 0.5rem;
  max-width: 280px;
  padding: 0.5rem 0.6rem;
  font-size: 0.8rem;
  color: var(--text);
  background: rgba(12, 14, 18, 0.95);
  border: 1px solid rgba(42, 47, 61, 0.9);
  border-radius: 8px;
  pointer-events: none;
  z-index: 2;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.research-tree-3d-tooltip-name {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0 0 0.25rem 0;
  font-weight: 600;
  color: var(--text);
}

.research-tree-3d-tooltip-icon {
  flex-shrink: 0;
  font-size: 1.1rem;
  line-height: 1;
}

.research-tree-3d-tooltip-desc,
.research-tree-3d-tooltip-mods,
.research-tree-3d-tooltip-meta,
.research-tree-3d-tooltip-prereq,
.research-tree-3d-tooltip-done {
  margin: 0.2rem 0 0 0;
  font-size: 0.75rem;
  color: var(--text-dim);
  line-height: 1.35;
}

.research-tree-3d-tooltip-lore {
  margin: 0.2rem 0 0 0;
  font-size: 0.7rem;
  font-style: italic;
  color: var(--muted);
  line-height: 1.3;
}

.research-tree-3d-tooltip-done {
  color: var(--text);
}

.research-tree-3d-zoom {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  z-index: 2;
}

.research-tree-3d-zoom-btn {
  width: 2rem;
  height: 2rem;
  padding: 0;
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1;
  color: var(--text);
  background: rgba(42, 47, 61, 0.85);
  border: 1px solid rgba(42, 47, 61, 0.9);
  border-radius: 6px;
  cursor: pointer;
}

.research-tree-3d-zoom-btn:hover {
  background: rgba(42, 47, 61, 1);
}

.research-tree-3d-hint {
  position: absolute;
  bottom: 0.5rem;
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-dim);
  pointer-events: none;
}

.research-tree-3d-canvas {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 360px;
}
</style>
