<template>
  <div
    class="research-list"
    @mouseenter="clearPathHighlight"
  >
    <div class="research-tree" role="tree" :aria-label="t('research') + ' tree'">
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
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { t, tParam } from '../../application/strings.js';
import { startResearchWithProgress } from '../../application/handlers.js';
import { useResearchCollapsed } from '../composables/useResearchCollapsed.js';
import { useResearchTiers } from '../composables/useResearchTiers.js';
import { useResearchDataDisplay } from '../composables/useResearchDataDisplay.js';
import ResearchCard from '../components/ResearchCard.vue';

const { collapsedTiers, toggleTier } = useResearchCollapsed();
const { tiers } = useResearchTiers(collapsedTiers);
const { label: researchDataLabel } = useResearchDataDisplay();

watch(researchDataLabel, (val) => {
  const el = document.getElementById('research-data-display');
  if (el) el.textContent = val;
}, { immediate: true });

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
