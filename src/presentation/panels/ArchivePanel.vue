<template>
  <div class="archive-panel">
    <nav class="archive-tabs" role="tablist" aria-label="Archive sections">
      <button
        type="button"
        role="tab"
        :aria-selected="archiveSubTab === 'log'"
        class="archive-tab"
        :class="{ 'archive-tab--active': archiveSubTab === 'log' }"
        @click="archiveSubTab = 'log'"
      >
        {{ t('archiveLogTab') }}
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="archiveSubTab === 'sets'"
        class="archive-tab"
        :class="{ 'archive-tab--active': archiveSubTab === 'sets' }"
        @click="archiveSubTab = 'sets'"
      >
        {{ t('archiveSetsTab') }}
      </button>
    </nav>
    <template v-if="archiveSubTab === 'log'">
      <p class="archive-intro">{{ t('codexIntro') }}</p>
      <div class="archive-filters">
        <label class="archive-filter-label">
          <span class="archive-filter-label-text">{{ t('archiveFilterCategory') }}</span>
          <select v-model="logCategoryFilter" class="archive-filter-select" aria-label="Filter by category">
            <option value="">{{ t('archiveFilterAll') }}</option>
            <option v-for="cat in logCategoryOptions" :key="cat" :value="cat">
              {{ categoryLabel(cat) }}
            </option>
          </select>
        </label>
        <input
          v-model.trim="logSearchQuery"
          type="search"
          class="archive-filter-search"
          :placeholder="t('archiveSearchPlaceholder')"
          aria-label="Search log entries"
        />
      </div>
      <div class="ship-log" role="log" aria-label="Ship log">
        <template v-if="filteredLogEntries.length > 0">
          <div
            v-for="entry in filteredLogEntries"
            :key="entry.id"
            class="ship-log-line"
          >
            <div class="ship-log-head">
              <span class="ship-log-time">[{{ formatTime(entry.at) }}]</span>
              <span class="ship-log-tag">{{ (entry.category || 'log').toUpperCase() }}</span>
              <span class="ship-log-title">{{ entry.title }}</span>
            </div>
            <p class="ship-log-body">{{ entry.body }}</p>
          </div>
        </template>
        <p v-else class="ship-log-empty">{{ logEntries.length === 0 ? t('codexLockedPlaceholder') : t('archiveFilterNoResults') }}</p>
      </div>
    </template>
    <template v-else>
      <p class="archive-intro">{{ t('archiveSetsIntro') }}</p>
      <div class="archive-filters">
        <label class="archive-filter-label">
          <span class="archive-filter-label-text">{{ t('archiveSetsFilterPlanet') }}</span>
          <select v-model="setsPlanetFilter" class="archive-filter-select" aria-label="Filter by planet type">
            <option value="">{{ t('archivePlanetTypeAny') }}</option>
            <option v-for="pt in setsPlanetTypeOptions" :key="pt" :value="pt">
              {{ planetTypeLabel(pt) }}
            </option>
          </select>
        </label>
        <input
          v-model.trim="setsSearchQuery"
          type="search"
          class="archive-filter-search"
          :placeholder="t('archiveSetsSearchPlaceholder')"
          aria-label="Search set bonuses"
        />
      </div>
      <div class="archive-sets" role="list">
        <template v-if="filteredDiscoveredSets.length > 0">
          <div
            v-for="set in filteredDiscoveredSets"
            :key="set.id"
            class="archive-set-line"
            role="listitem"
          >
            <div class="archive-set-row">
              <span class="archive-set-name">{{ set.moduleName }}</span>
              <span class="archive-set-bonus">+{{ set.bonusPercent }}%</span>
            </div>
            <p class="archive-set-requirement">{{ set.requiredCount }}× {{ set.moduleName }}</p>
            <span v-if="set.planetTypes && set.planetTypes.length" class="archive-set-condition">
              {{ tParam('setBonusPlanetCondition', { types: set.planetTypes.join(', ') }) }}
            </span>
          </div>
        </template>
        <p v-else class="archive-sets-empty">{{ discoveredSets.length === 0 ? t('archiveSetsEmpty') : t('archiveFilterNoResults') }}</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { t, tParam } from '../../application/strings.js';
import { useCodexData } from '../composables/useCodexData.js';
import { useGameStateStore } from '../stores/gameState.js';
import { getDiscoveredSetsDisplay } from '../../application/moduleSetBonuses.js';
import type { DiscoveredSetDisplay } from '../../application/moduleSetBonuses.js';

const { logEntries } = useCodexData();
const store = useGameStateStore();

const archiveSubTab = ref<'log' | 'sets'>('log');
const logCategoryFilter = ref<string>('');
const logSearchQuery = ref<string>('');
const setsPlanetFilter = ref<string>('');
const setsSearchQuery = ref<string>('');

const discoveredSets = computed(() => getDiscoveredSetsDisplay(store.discoveredSetIds));

const logCategoryOptions = computed(() => {
  const cats = new Set<string>();
  for (const e of logEntries.value) {
    const c = e.category ?? 'other';
    if (c !== 'other') cats.add(c);
  }
  return ['achievement', 'event', 'expedition', 'planet', 'prestige', 'quest', 'research'].filter((c) => cats.has(c));
});

const setsPlanetTypeOptions = computed(() => {
  const types = new Set<string>();
  for (const set of discoveredSets.value) {
    if (set.planetTypes) for (const pt of set.planetTypes) types.add(pt);
  }
  return ['rocky', 'volcanic', 'desert', 'ice', 'gas'].filter((pt) => types.has(pt));
});

const filteredLogEntries = computed(() => {
  let list = logEntries.value;
  if (logCategoryFilter.value) {
    list = list.filter((e) => (e.category ?? 'other') === logCategoryFilter.value);
  }
  const q = logSearchQuery.value.toLowerCase();
  if (q) {
    list = list.filter((e) => e.title.toLowerCase().includes(q) || e.body.toLowerCase().includes(q));
  }
  return list;
});

const filteredDiscoveredSets = computed(() => {
  let list: DiscoveredSetDisplay[] = discoveredSets.value;
  if (setsPlanetFilter.value) {
    list = list.filter(
      (s) => s.planetTypes != null && s.planetTypes.length > 0 && s.planetTypes.includes(setsPlanetFilter.value)
    );
  }
  const q = setsSearchQuery.value.toLowerCase();
  if (q) {
    list = list.filter((s) => s.moduleName.toLowerCase().includes(q));
  }
  return list;
});

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  achievement: 'codexCategoryAchievement',
  event: 'codexCategoryEvent',
  expedition: 'codexCategoryExpedition',
  planet: 'codexCategoryPlanet',
  prestige: 'codexCategoryPrestige',
  quest: 'codexCategoryQuest',
  research: 'codexCategoryResearch',
};

function categoryLabel(cat: string): string {
  const key = CATEGORY_LABEL_KEYS[cat];
  return key ? t(key as 'codexCategoryAchievement') : cat;
}

const PLANET_TYPE_KEYS: Record<string, string> = {
  rocky: 'archivePlanetTypeRocky',
  volcanic: 'archivePlanetTypeVolcanic',
  desert: 'archivePlanetTypeDesert',
  ice: 'archivePlanetTypeIce',
  gas: 'archivePlanetTypeGas',
};

function planetTypeLabel(planetType: string): string {
  const key = PLANET_TYPE_KEYS[planetType];
  return key ? t(key as 'archivePlanetTypeRocky') : planetType;
}

function formatTime(ms: number): string {
  if (!ms || !Number.isFinite(ms)) return '--:--:--';
  const d = new Date(ms);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  const s = d.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}
</script>

<style scoped>
.archive-panel {
  padding: 0.5rem 0;
}

.archive-tabs {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
}

.archive-tab {
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-panel);
  color: var(--text-dim);
  cursor: pointer;
}

.archive-tab:hover {
  color: var(--text);
  background: var(--bg-card);
}

.archive-tab--active {
  background: var(--accent);
  color: var(--text-on-accent, #fff);
  border-color: var(--accent);
}

.archive-sets {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.75rem 1rem;
  max-height: min(60vh, 420px);
  overflow-y: auto;
  font-size: 0.8rem;
  box-shadow: var(--panel-shadow);
}

.archive-set-line {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
}

.archive-set-line:last-child {
  border-bottom: none;
}

.archive-set-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem 0.75rem;
}

.archive-set-name {
  font-weight: 600;
  color: var(--text);
}

.archive-set-bonus {
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.archive-set-requirement {
  margin: 0.2rem 0 0 0;
  font-size: 0.75rem;
  color: var(--text-dim);
  line-height: 1.35;
}

.archive-set-condition {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.75rem;
  color: var(--text-dim);
}

.archive-sets-empty {
  margin: 0;
  font-style: italic;
  color: var(--text-dim);
}

.archive-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
  margin-bottom: 0.75rem;
}

.archive-filter-label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.archive-filter-label-text {
  font-size: 0.75rem;
  color: var(--text-dim);
  white-space: nowrap;
}

.archive-filter-select {
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-card);
  color: var(--text);
  min-width: 6rem;
}

.archive-filter-search {
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-card);
  color: var(--text);
  flex: 1;
  min-width: 8rem;
}

.archive-filter-search::placeholder {
  color: var(--text-dim);
}

.archive-intro {
  font-size: 0.8rem;
  color: var(--text-dim);
  margin: 0 0 0.75rem 0;
  line-height: 1.4;
}

.ship-log {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.75rem 1rem;
  max-height: min(60vh, 420px);
  overflow-y: auto;
  overflow-x: hidden;
  font-family: 'JetBrains Mono', 'Consolas', 'Monaco', monospace;
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--text);
  box-shadow: var(--panel-shadow);
}

.ship-log::-webkit-scrollbar {
  width: 6px;
}

.ship-log::-webkit-scrollbar-track {
  background: var(--bg-panel);
  border-radius: 3px;
}

.ship-log::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

.ship-log-line {
  margin-bottom: 0.85rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid var(--border);
}

.ship-log-line:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.ship-log-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 0.5rem;
}

.ship-log-time {
  color: var(--accent);
  flex-shrink: 0;
}

.ship-log-tag {
  text-transform: uppercase;
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  color: var(--text-dim);
  flex-shrink: 0;
}

.ship-log-title {
  font-weight: 600;
  color: var(--text);
  min-width: 0;
}

.ship-log-body {
  margin: 0.35rem 0 0 0;
  padding-left: 0;
  color: var(--text-dim);
  font-size: 0.72rem;
  line-height: 1.45;
}

.ship-log-empty {
  margin: 0;
  font-style: italic;
  color: var(--text-dim);
}
</style>
