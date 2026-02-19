<template>
  <div
    class="research-list"
    @mouseenter="clearPathHighlight"
  >
    <div class="research-view-toggle">
      <button
        type="button"
        class="research-view-toggle-btn"
        :class="{ 'research-view-toggle-btn--active': viewMode === 'list' }"
        :aria-pressed="viewMode === 'list'"
        aria-label="List view"
        @click="viewMode = 'list'"
      >
        {{ t('researchViewList') }}
      </button>
      <button
        type="button"
        class="research-view-toggle-btn"
        :class="{ 'research-view-toggle-btn--active': viewMode === '3d' }"
        :aria-pressed="viewMode === '3d'"
        aria-label="3D tree view"
        @click="viewMode = '3d'"
      >
        {{ t('researchView3D') }}
      </button>
    </div>
    <div
      v-show="viewMode === 'list'"
      class="research-tree"
      role="tree"
      :aria-label="t('research') + ' tree'"
    >
      <div
        v-for="tierVm in tiers"
        :key="tierVm.tier"
        class="research-tier"
        :data-tier="tierVm.tier"
      >
        <button
          type="button"
          class="research-tier-toggle"
          :data-tier="tierVm.tier"
          :aria-expanded="!tierVm.isCollapsed"
          :aria-label="tParam('tierLabel', { n: String(tierVm.tier) }) + ' ' + (tierVm.isCollapsed ? t('expandSection') : t('collapseSection'))"
          @click="toggleTier(tierVm.tier)"
        >
          <span class="research-tier-toggle-icon" aria-hidden="true">{{ tierVm.isCollapsed ? '▶' : '▼' }}</span>
          <span class="research-tier-label">{{ tParam('tierLabel', { n: tierVm.tier }) }}</span>
        </button>
        <div v-show="!tierVm.isCollapsed" class="research-tier-body">
          <div
            v-for="(row, rowIdx) in tierVm.rows"
            :key="rowIdx"
            class="research-tree-row"
            :data-row="tierVm.tier"
            role="list"
          >
            <div class="research-tree-row-nodes" :style="{ '--row-nodes': row.length }">
              <ResearchCard
                v-for="data in row"
                :key="data.node.id"
                :data="data"
                :class="{ 'research-card--path-highlight': isPathHighlighted(data.node.id) }"
                @attempt="onAttempt"
                @path-highlight="setPathHighlight"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    <ResearchTree3D v-if="viewMode === '3d'" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { t, tParam } from '../../application/strings.js';
import { startResearchWithProgress } from '../../application/handlers.js';
import { useResearchCollapsed } from '../composables/useResearchCollapsed.js';
import { useResearchTiers } from '../composables/useResearchTiers.js';
import ResearchCard from '../components/ResearchCard.vue';
import ResearchTree3D from '../components/ResearchTree3D.vue';

const { collapsedTiers, toggleTier } = useResearchCollapsed();
const { tiers } = useResearchTiers(collapsedTiers);

const viewMode = ref<'list' | '3d'>('list');
const pathHighlightIds = ref<Set<string>>(new Set());

function isPathHighlighted(nodeId: string): boolean {
  return pathHighlightIds.value.has(nodeId);
}

function setPathHighlight(unlockPathIds: string[]): void {
  pathHighlightIds.value = new Set(unlockPathIds);
}

function clearPathHighlight(): void {
  pathHighlightIds.value = new Set();
}

function onAttempt(id: string, cardEl: HTMLElement): void {
  startResearchWithProgress(cardEl, id);
}
</script>

<style scoped>
.research-list {
  display: block;
}

.research-view-toggle {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
}

.research-view-toggle-btn {
  padding: 0.35rem 0.75rem;
  font: inherit;
  font-size: 0.85rem;
  color: var(--text-dim);
  background: rgba(42, 47, 61, 0.4);
  border: 1px solid rgba(42, 47, 61, 0.6);
  border-radius: 6px;
  cursor: pointer;
}

.research-view-toggle-btn:hover {
  color: var(--text);
  background: rgba(42, 47, 61, 0.6);
}

.research-view-toggle-btn--active {
  color: var(--text);
  background: rgba(42, 47, 61, 0.8);
  border-color: rgba(42, 47, 61, 0.9);
}

.research-tree {
  display: flex;
  flex-direction: column;
  gap: 0;
  align-items: center;
  padding: 1rem 0.5rem;
  background: linear-gradient(180deg, rgba(10, 11, 15, 0.6) 0%, rgba(18, 20, 28, 0.4) 100%);
  border: 1px solid rgba(42, 47, 61, 0.8);
  border-radius: 12px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.research-tier {
  width: 100%;
  min-width: 0;
}

.research-tier-toggle {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  width: 100%;
  padding: 0.4rem 0.5rem;
  margin: 0.5rem 0 0 0;
  font: inherit;
  font-weight: 600;
  color: var(--text);
  background: rgba(42, 47, 61, 0.4);
  border: 1px solid rgba(42, 47, 61, 0.6);
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
}

.research-tier-toggle:hover {
  background: rgba(42, 47, 61, 0.6);
}

.research-tier-toggle-icon {
  font-size: 0.7rem;
  color: var(--text-dim);
}

.research-tier-label {
  font-size: 0.9rem;
}

.research-tier-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  min-width: 0;
  margin-top: 0.5rem;
  padding-left: 1.25rem;
}

.research-tier-body[hidden] {
  display: none;
}

.research-tree-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  position: relative;
  min-width: 0;
}

.research-tree-row:not(:first-child) {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(42, 47, 61, 0.6);
}

.research-tree-row-nodes {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

@media (max-width: 768px) {
  .research-tree-row:not(:first-child) {
    margin-top: 1rem;
    padding-top: 1rem;
  }

  .research-tree {
    padding: 0.75rem 0.4rem;
  }
}

@media (max-width: 480px) {
  .research-list {
    margin: 0 -0.25rem;
  }

  .research-tree {
    padding: 0.6rem 0.35rem;
    border-radius: 10px;
  }

  .research-tree-row:not(:first-child) {
    margin-top: 0.85rem;
    padding-top: 0.85rem;
  }
}

@media (max-width: 360px) {
  .research-tree {
    padding: 0.45rem 0.25rem;
  }

  .research-tree-row-nodes {
    gap: 0.4rem;
  }

  .research-tree-row:not(:first-child) {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
  }
}
</style>
