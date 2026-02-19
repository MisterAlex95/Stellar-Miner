<template>
  <div
    id="panel-mine"
    class="app-tab-panel"
    :class="{ 'app-tab-panel--active': isPanelActive('mine') }"
    role="tabpanel"
    aria-labelledby="tab-mine"
    data-tab="mine"
    :hidden="isPanelHidden('mine')"
  >
    <section
      ref="mineZoneRef"
      id="mine-zone"
      class="mine-zone"
      :class="{ 'mine-zone--active': appUI.mineZoneActive }"
      :title="t('mineZoneTitle')"
      @click="onMineZoneClick"
      @mousedown="appUI.setMineZoneActive(true)"
      @mouseup="appUI.setMineZoneActive(false)"
      @mouseleave="appUI.setMineZoneActive(false)"
    >
      <div
        id="mine-zone-floats"
        class="mine-zone-floats"
        aria-hidden="true"
      ></div>
      <MineZoneCanvas />
      <p
        id="mine-zone-hint"
        class="mine-zone-hint"
        :class="{ 'mine-zone-hint--dismissed': appUI.mineZoneHintDismissed }"
        :aria-hidden="appUI.mineZoneHintDismissed"
      ></p>
      <span
        id="combo-indicator"
        class="combo-indicator"
        :class="{
          'combo-indicator--active': store.combo.active,
          'combo-indicator--fading': store.combo.fading,
        }"
        :data-combo-tier="store.combo.dataTier"
        aria-live="polite"
      >
        <template v-if="store.combo.active">
          <span class="combo-indicator__mult">{{ store.combo.multLabel }}</span>
          <span class="combo-indicator__time">{{ store.combo.timeSec }}</span>
        </template>
      </span>
    </section>
    <section
      id="quest-section"
      class="gameplay-block quest-section"
      :class="{
        'gameplay-block--locked': !isSectionUnlocked('quest-section'),
        'gameplay-block--unlocked': isSectionUnlocked('quest-section'),
        'gameplay-block--collapsed': sectionCollapse.isCollapsed('quest-section'),
        'quest-section--complete': store.quest.sectionComplete,
        'quest-section--claimed': appUI.questClaimedFlash,
      }"
      data-block="quest"
      :aria-hidden="!isSectionUnlocked('quest-section')"
      aria-labelledby="quest-title"
    >
      <div class="gameplay-block-header">
        <h2 id="quest-title">{{ t('quest') }}</h2>
        <span
          id="quest-section-summary"
          class="gameplay-block-summary"
          aria-hidden="true"
        >{{ store.quest.summary }}</span>
        <div class="gameplay-block-header-actions">
          <button
            type="button"
            class="gameplay-block-rules-btn"
            data-rules-key="questRules"
            data-title-key="quest"
            :aria-label="t('sectionRulesAria')"
            @click.stop="onRulesClick('questRules', 'quest')"
          >
            ?
          </button>
          <button
            type="button"
            class="gameplay-block-toggle"
            :aria-expanded="!sectionCollapse.isCollapsed('quest-section')"
            :aria-label="sectionCollapse.isCollapsed('quest-section') ? t('expandSection') : t('collapseSection')"
            :title="sectionCollapse.isCollapsed('quest-section') ? t('expandSection') : t('collapseSection')"
            @click="sectionCollapse.toggle('quest-section')"
          >
            <span
              class="gameplay-block-toggle-icon"
              aria-hidden="true"
            >{{ sectionCollapse.isCollapsed('quest-section') ? '▶' : '▼' }}</span>
          </button>
        </div>
      </div>
      <div class="gameplay-block-body">
        <div
          id="quest-progress-wrap"
          class="quest-progress-wrap"
        >
          <div
            id="quest-progress-bar"
            class="quest-progress-bar"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="Math.round(store.quest.progressPct)"
            :style="{ width: store.quest.progressPct + '%' }"
          />
        </div>
        <p
          id="quest-progress"
          class="quest-progress"
        >
          {{ store.quest.progressText }}
        </p>
        <p
          id="quest-streak-hint"
          class="quest-streak-hint"
          aria-live="polite"
          :style="store.quest.streakHintVisible ? '' : { display: 'none' }"
        >
          {{ store.quest.streakHint }}
        </p>
        <span
          id="quest-claim-wrap"
          class="btn-tooltip-wrap"
        >
          <button
            ref="questClaimBtnRef"
            id="quest-claim"
            type="button"
            class="quest-claim-btn"
            :disabled="store.quest.claimDisabled"
            :title="store.quest.claimTitle"
            @click="handleClaimQuest()"
          >
            {{ store.quest.claimLabel }}
          </button>
        </span>
      </div>
    </section>
  </div>
  <div
    id="panel-dashboard"
    class="app-tab-panel"
    :class="{ 'app-tab-panel--active': isPanelActive('dashboard') }"
    role="tabpanel"
    aria-labelledby="tab-dashboard"
    data-tab="dashboard"
    :hidden="isPanelHidden('dashboard')"
  >
    <section
      id="dashboard-section"
      class="gameplay-block gameplay-block--unlocked dashboard-section"
      :class="{ 'gameplay-block--collapsed': sectionCollapse.isCollapsed('dashboard-section') }"
      aria-hidden="false"
      aria-labelledby="dashboard-title"
    >
      <div class="gameplay-block-header">
        <h2
          id="dashboard-title"
          class="dashboard-title"
        >
          {{ t('dashboardTitle') }}
        </h2>
        <span
          id="dashboard-section-summary"
          class="gameplay-block-summary"
          aria-hidden="true"
        ></span>
        <div class="gameplay-block-header-actions">
          <button
            type="button"
            class="gameplay-block-toggle"
            :aria-expanded="!sectionCollapse.isCollapsed('dashboard-section')"
            :aria-label="sectionCollapse.isCollapsed('dashboard-section') ? t('expandSection') : t('collapseSection')"
            :title="sectionCollapse.isCollapsed('dashboard-section') ? t('expandSection') : t('collapseSection')"
            @click="sectionCollapse.toggle('dashboard-section')"
          >
            <span
              class="gameplay-block-toggle-icon"
              aria-hidden="true"
            >{{ sectionCollapse.isCollapsed('dashboard-section') ? '▶' : '▼' }}</span>
          </button>
        </div>
      </div>
      <div class="gameplay-block-body">
        <div
          id="dashboard-content"
          class="dashboard-content"
        >
          <DashboardPanel v-if="store.hydratedPanels.includes('dashboard')" />
        </div>
      </div>
    </section>
  </div>
  <div
    id="panel-empire"
    class="app-tab-panel"
    :class="{ 'app-tab-panel--active': isPanelActive('empire') }"
    role="tabpanel"
    aria-labelledby="tab-empire"
    data-tab="empire"
    :hidden="isPanelHidden('empire')"
  >
    <div id="empire-content">
      <EmpirePanel v-if="store.hydratedPanels.includes('empire')" />
    </div>
  </div>
  <div
    id="panel-research"
    class="app-tab-panel"
    :class="{ 'app-tab-panel--active': isPanelActive('research') }"
    role="tabpanel"
    aria-labelledby="tab-research"
    data-tab="research"
    :hidden="isPanelHidden('research')"
  >
    <section
      id="research-section"
      class="gameplay-block research-section"
      :class="{
        'gameplay-block--locked': !isSectionUnlocked('research-section'),
        'gameplay-block--unlocked': isSectionUnlocked('research-section'),
        'gameplay-block--collapsed': sectionCollapse.isCollapsed('research-section'),
      }"
      data-block="research"
      :aria-hidden="!isSectionUnlocked('research-section')"
      aria-labelledby="research-title"
    >
      <div class="gameplay-block-header">
        <h2 id="research-title">{{ t('research') }}</h2>
        <span
          id="research-section-summary"
          class="gameplay-block-summary"
          aria-hidden="true"
        ></span>
        <div class="gameplay-block-header-actions">
          <button
            type="button"
            class="gameplay-block-rules-btn"
            data-rules-key="researchRules"
            data-title-key="research"
            :aria-label="t('sectionRulesAria')"
            @click.stop="onRulesClick('researchRules', 'research')"
          >
            ?
          </button>
          <button
            type="button"
            class="gameplay-block-toggle"
            :aria-expanded="!sectionCollapse.isCollapsed('research-section')"
            :aria-label="sectionCollapse.isCollapsed('research-section') ? t('expandSection') : t('collapseSection')"
            :title="sectionCollapse.isCollapsed('research-section') ? t('expandSection') : t('collapseSection')"
            @click="sectionCollapse.toggle('research-section')"
          >
            <span
              class="gameplay-block-toggle-icon"
              aria-hidden="true"
            >{{ sectionCollapse.isCollapsed('research-section') ? '▶' : '▼' }}</span>
          </button>
        </div>
      </div>
      <div class="gameplay-block-body">
        <p class="research-hint">{{ t('researchHint') }}</p>
        <p
          id="research-data-display"
          class="research-data-line"
          aria-live="polite"
        >
          {{ researchDataDisplayLabel }}
        </p>
        <div
          id="research-list"
          class="research-list"
        >
          <ResearchPanel v-if="store.hydratedPanels.includes('research')" />
        </div>
      </div>
    </section>
  </div>
  <div
    id="panel-upgrades"
    class="app-tab-panel"
    :class="{ 'app-tab-panel--active': isPanelActive('upgrades') }"
    role="tabpanel"
    aria-labelledby="tab-upgrades"
    data-tab="upgrades"
    :hidden="isPanelHidden('upgrades')"
  >
    <section
      id="upgrades-section"
      class="gameplay-block upgrades-section"
      :class="{
        'gameplay-block--locked': !isSectionUnlocked('upgrades-section'),
        'gameplay-block--unlocked': isSectionUnlocked('upgrades-section'),
        'gameplay-block--collapsed': sectionCollapse.isCollapsed('upgrades-section'),
      }"
      data-block="upgrades"
      :aria-hidden="!isSectionUnlocked('upgrades-section')"
      aria-labelledby="upgrades-title"
    >
      <div class="gameplay-block-header">
        <h2 id="upgrades-title">{{ t('upgrades') }}</h2>
        <span
          id="upgrades-section-summary"
          class="gameplay-block-summary"
          aria-hidden="true"
        ></span>
        <div class="gameplay-block-header-actions">
          <button
            type="button"
            class="gameplay-block-rules-btn"
            data-rules-key="upgradesRules"
            data-title-key="upgrades"
            :aria-label="t('sectionRulesAria')"
            @click.stop="onRulesClick('upgradesRules', 'upgrades')"
          >
            ?
          </button>
          <button
            type="button"
            class="gameplay-block-toggle"
            :aria-expanded="!sectionCollapse.isCollapsed('upgrades-section')"
            :aria-label="sectionCollapse.isCollapsed('upgrades-section') ? t('expandSection') : t('collapseSection')"
            :title="sectionCollapse.isCollapsed('upgrades-section') ? t('expandSection') : t('collapseSection')"
            @click="sectionCollapse.toggle('upgrades-section')"
          >
            <span
              class="gameplay-block-toggle-icon"
              aria-hidden="true"
            >{{ sectionCollapse.isCollapsed('upgrades-section') ? '▶' : '▼' }}</span>
          </button>
        </div>
      </div>
      <div class="gameplay-block-body">
        <p class="upgrades-hint">{{ t('upgradesHint') }}</p>
        <div
          id="upgrade-list"
          class="upgrade-list"
        >
          <UpgradesPanel v-if="store.hydratedPanels.includes('upgrades')" />
        </div>
      </div>
    </section>
  </div>
  <div
    id="panel-stats"
    class="app-tab-panel"
    :class="{ 'app-tab-panel--active': isPanelActive('stats') }"
    role="tabpanel"
    aria-labelledby="tab-stats"
    data-tab="stats"
    :hidden="isPanelHidden('stats')"
  >
    <section
      id="statistics-section"
      class="gameplay-block gameplay-block--unlocked statistics-section"
      :class="{ 'gameplay-block--collapsed': sectionCollapse.isCollapsed('statistics-section') }"
      aria-hidden="false"
      aria-labelledby="statistics-title"
    >
      <div class="gameplay-block-header">
        <h2 id="statistics-title">{{ t('statisticsTitle') }}</h2>
        <span
          id="statistics-section-summary"
          class="gameplay-block-summary"
          aria-hidden="true"
        ></span>
        <div class="gameplay-block-header-actions">
          <button
            type="button"
            class="gameplay-block-rules-btn"
            data-rules-key="statisticsRules"
            data-title-key="statisticsTitle"
            :aria-label="t('sectionRulesAria')"
            @click.stop="onRulesClick('statisticsRules', 'statisticsTitle')"
          >
            ?
          </button>
          <button
            type="button"
            class="gameplay-block-toggle"
            :aria-expanded="!sectionCollapse.isCollapsed('statistics-section')"
            :aria-label="sectionCollapse.isCollapsed('statistics-section') ? t('expandSection') : t('collapseSection')"
            :title="sectionCollapse.isCollapsed('statistics-section') ? t('expandSection') : t('collapseSection')"
            @click="sectionCollapse.toggle('statistics-section')"
          >
            <span
              class="gameplay-block-toggle-icon"
              aria-hidden="true"
            >{{ sectionCollapse.isCollapsed('statistics-section') ? '▶' : '▼' }}</span>
          </button>
        </div>
      </div>
      <div class="gameplay-block-body">
        <div id="statistics-container">
          <StatisticsPanel v-if="store.hydratedPanels.includes('stats')" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { t } from '../../application/strings.js';
import { useGameStateStore } from '../stores/gameState.js';
import { handleClaimQuest } from '../../application/handlers.js';
import { openSectionRulesModal } from '../modals/mount.js';
import { useSectionCollapse } from '../composables/useSectionCollapse.js';
import { useResearchDataDisplay } from '../composables/useResearchDataDisplay.js';
import { useAppUIStore } from '../stores/appUI.js';
import MineZoneCanvas from './MineZoneCanvas.vue';
import DashboardPanel from '../panels/DashboardPanel.vue';
import EmpirePanel from '../panels/EmpirePanel.vue';
import ResearchPanel from '../panels/ResearchPanel.vue';
import UpgradesPanel from '../panels/UpgradesPanel.vue';
import StatisticsPanel from '../panels/StatisticsPanel.vue';
import { handleMineClick } from '../../application/handlers.js';

const store = useGameStateStore();
const sectionCollapse = useSectionCollapse();
const { label: researchDataDisplayLabel } = useResearchDataDisplay();
const appUI = useAppUIStore();
const questClaimBtnRef = ref<HTMLButtonElement | null>(null);
const mineZoneRef = ref<HTMLElement | null>(null);

onMounted(() => {
  if (questClaimBtnRef.value) appUI.setQuestClaimAnchor(questClaimBtnRef.value);
  if (mineZoneRef.value) appUI.setMineZoneElement(mineZoneRef.value);
});
onBeforeUnmount(() => {
  appUI.setQuestClaimAnchor(null);
  appUI.setMineZoneElement(null);
});

function onMineZoneClick(e: MouseEvent): void {
  if (!appUI.mineZoneHintDismissed) appUI.dismissMineHint();
  handleMineClick(e);
}

function isSectionUnlocked(sectionId: string): boolean {
  return store.progression.sectionUnlocked[sectionId] !== false;
}

function isPanelHidden(tabId: string): boolean {
  if (store.layout === 'one-page') return false;
  return store.activeTab !== tabId;
}

function isPanelActive(tabId: string): boolean {
  return store.layout === 'tabs' && store.activeTab === tabId;
}

function onRulesClick(rulesKey: string, titleKey: string): void {
  openSectionRulesModal(rulesKey, titleKey);
}
</script>

<style scoped>
.dashboard-section {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: var(--panel-shadow);
}

.dashboard-title {
  margin: 0 0 1rem;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
}

.dashboard-section.gameplay-block .gameplay-block-header .dashboard-title {
  margin-bottom: 0;
}

#app[data-layout="one-page"] .dashboard-section {
  margin-bottom: 1.75rem;
}

/* Mine zone */
.mine-zone {
  position: relative;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 0;
  text-align: center;
  margin-bottom: 1.5rem;
  transition: box-shadow 0.25s ease, border-color 0.2s ease, transform 0.1s ease;
  overflow: hidden;
  min-height: 320px;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  animation: mine-zone-pulse 3s ease-in-out infinite;
  -webkit-tap-highlight-color: transparent;
  tap-highlight-color: transparent;
}

@keyframes mine-zone-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
  50% { box-shadow: 0 0 20px 0 rgba(245, 158, 11, 0.08); }
}

.mine-zone:hover {
  animation: none;
  box-shadow: 0 0 32px var(--accent-glow);
  border-color: rgba(245, 158, 11, 0.25);
}

.mine-zone--active {
  transform: scale(0.99);
  box-shadow: inset 0 2px 12px rgba(0, 0, 0, 0.2);
}

.mine-zone:focus-within {
  box-shadow: 0 0 24px var(--accent-glow);
}

.mine-zone-floats {
  position: absolute;
  inset: 0;
  pointer-events: none;
  user-select: none;
  z-index: 2;
}

.mine-zone-hint {
  position: absolute;
  bottom: 0.75rem;
  left: 0;
  right: 0;
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-dim);
  pointer-events: none;
  user-select: none;
  opacity: 0.85;
  transition: opacity 0.35s ease;
}

.mine-zone:hover .mine-zone-hint {
  opacity: 1;
  color: var(--text);
}

.mine-zone-hint--dismissed {
  opacity: 0;
  pointer-events: none;
  visibility: hidden;
  transition: opacity 0.35s ease, visibility 0.35s ease;
}

.combo-indicator {
  position: absolute;
  top: 0.5rem;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Orbitron', sans-serif;
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--accent);
  opacity: 0;
  pointer-events: none;
  z-index: 4;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.combo-indicator--active {
  opacity: 1;
  transform: translateX(-50%) scale(1.05);
}

.combo-indicator--active[data-combo-tier="hot"] { color: #f59e0b; }
.combo-indicator--active[data-combo-tier="on-fire"] { color: #ea580c; text-shadow: 0 0 8px rgba(234, 88, 12, 0.5); }
.combo-indicator--active[data-combo-tier="unstoppable"] { color: #dc2626; text-shadow: 0 0 10px rgba(220, 38, 38, 0.5); }
.combo-indicator--active[data-combo-tier="legendary"] { color: #fbbf24; text-shadow: 0 0 12px rgba(251, 191, 36, 0.6); }
.combo-indicator--active[data-combo-tier="mega"] { color: #fde047; text-shadow: 0 0 14px rgba(253, 224, 71, 0.7); }
.combo-indicator__time {
  opacity: 0.9;
  font-weight: 600;
  margin-left: 0.15em;
}

@media (prefers-reduced-motion: no-preference) {
  .combo-indicator--active[data-combo-tier="mega"] { animation: combo-mega-pulse 0.5s ease infinite alternate; }
}

@keyframes combo-mega-pulse {
  from { opacity: 1; transform: translateX(-50%) scale(1.05); }
  to { opacity: 0.95; transform: translateX(-50%) scale(1.12); }
}

.combo-indicator--fading {
  opacity: 0.85;
  animation: combo-fading-pulse 0.4s ease infinite alternate;
}

@keyframes combo-fading-pulse {
  from { opacity: 0.9; }
  to { opacity: 0.6; }
}

@media (max-width: 360px) {
  .mine-zone {
    min-height: 180px;
    margin-bottom: 0.75rem;
  }
  .mine-zone-hint {
    font-size: 0.65rem;
  }
}

@media (min-width: 361px) and (max-width: 767px) {
  .mine-zone {
    min-height: 260px;
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .mine-zone {
    min-height: 340px;
  }
}

/* Gameplay blocks (sections) */
.gameplay-block--locked {
  display: none !important;
}

.gameplay-block--unlocked {
  display: block;
}

.prestige-section,
.crew-section,
.quest-section,
.planets-section,
.housing-section,
.research-section,
.upgrades-section,
.statistics-section {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
  box-shadow: var(--panel-shadow);
}

.gameplay-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
  cursor: pointer;
  user-select: none;
}

.gameplay-block-header-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.gameplay-block-rules-btn {
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--bg-card);
  color: var(--text-dim);
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s;
}

.gameplay-block-rules-btn:hover {
  background: var(--accent);
  color: var(--bg);
}

.gameplay-block .gameplay-block-header h2 {
  margin-bottom: 0;
  flex: 1;
  min-width: 0;
}

.gameplay-block-summary {
  font-size: 0.75rem;
  color: var(--text-dim);
  margin-left: 0.35rem;
  flex-shrink: 0;
}

.gameplay-block-summary:empty {
  display: none;
}

.gameplay-block--collapsed .gameplay-block-summary:not(:empty) {
  font-weight: 600;
  color: var(--text);
}

.gameplay-block-body {
  margin-top: 0.5rem;
}

.crew-hint,
.planets-hint,
.prestige-hint,
.research-hint,
.upgrades-hint {
  white-space: pre-line;
}

.gameplay-block--collapsed .gameplay-block-body {
  display: none;
}

.gameplay-block-toggle {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-dim);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s;
}

.gameplay-block-toggle:hover {
  background: var(--bg-card);
  color: var(--text);
}

.gameplay-block-toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.gameplay-block-toggle-icon {
  display: inline-block;
  font-size: 0.65rem;
  line-height: 1;
  transition: transform 0.2s ease;
}

.gameplay-block--collapsed .gameplay-block-toggle-icon {
  transform: rotate(-90deg);
}

.crew-section h2,
.planets-section h2,
.housing-section h2,
.research-section h2,
.upgrades-section h2,
.prestige-section h2,
.quest-section h2,
.statistics-section h2 {
  font-family: 'Orbitron', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 0.35rem 0;
  position: relative;
  padding-bottom: 0.35rem;
  border-bottom: 2px solid var(--border);
  margin-bottom: 0.5rem;
}

.crew-section h2::after,
.planets-section h2::after,
.housing-section h2::after,
.research-section h2::after,
.upgrades-section h2::after,
.prestige-section h2::after,
.quest-section h2::after,
.statistics-section h2::after {
  content: '';
  display: block;
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 3rem;
  height: 2px;
  background: var(--accent);
}

.prestige-hint {
  font-size: 0.85rem;
  color: var(--text-dim);
  margin: 0 0 0.75rem 0;
  line-height: 1.5;
}

.prestige-status {
  font-size: 0.85rem;
  color: var(--text);
  margin-bottom: 0.75rem;
}

.prestige-btn {
  font-family: 'Exo 2', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.6rem 1.25rem;
  border-radius: 10px;
  border: 1px solid var(--accent);
  background: rgba(245, 158, 11, 0.15);
  color: var(--accent);
  cursor: pointer;
  transition: background 0.2s, color 0.2s, box-shadow 0.2s;
}

.prestige-btn:hover:not(:disabled) {
  background: rgba(245, 158, 11, 0.25);
  box-shadow: 0 0 16px var(--accent-glow);
}

.prestige-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.prestige-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.prestige-btn--just-unlocked {
  animation: prestige-just-unlocked 1.5s ease-out;
}

@keyframes prestige-just-unlocked {
  0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.6); }
  40% { box-shadow: 0 0 24px 6px rgba(245, 158, 11, 0.4); }
  100% { box-shadow: 0 0 16px var(--accent-glow); }
}

.crew-hint {
  font-size: 0.85rem;
  color: var(--text-dim);
  margin: 0 0 0.75rem 0;
  line-height: 1.5;
}

.research-hint {
  font-size: 0.8rem;
  color: var(--text-dim);
  margin: 0 0 0.75rem 0;
  line-height: 1.5;
}

.upgrades-hint {
  font-size: 0.8rem;
  color: var(--text-dim);
  margin: 0 0 1rem 0;
  line-height: 1.5;
}

.crew-capacity-wrap {
  height: 8px;
  background: var(--bg-card);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.crew-capacity-fill {
  height: 100%;
  width: 0%;
  display: flex;
  flex-direction: row;
  min-width: 0;
  transition: width 0.25s ease-out;
  position: relative;
}

.crew-capacity-fill::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 4px;
  background: linear-gradient(
    105deg,
    transparent 0%,
    transparent 40%,
    rgba(255, 255, 255, 0.2) 50%,
    transparent 60%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: progress-shimmer 2s ease-in-out infinite;
  pointer-events: none;
}

.crew-capacity-segment {
  height: 100%;
  min-width: 0;
  transition: width 0.25s ease-out;
}

.crew-capacity-segment--astronaut {
  background: var(--crew-astronaut);
}

.crew-capacity-segment--astronaut:first-child {
  border-radius: 4px 0 0 4px;
}

.crew-capacity-segment--miner {
  background: var(--crew-miner);
}

.crew-capacity-segment--scientist {
  background: var(--crew-scientist);
}

.crew-capacity-segment--pilot {
  background: var(--crew-pilot);
}

.crew-capacity-segment--medic {
  background: var(--crew-medic);
}

.crew-capacity-segment--engineer {
  background: var(--crew-engineer);
}

.crew-capacity-segment--equipment {
  background: var(--crew-equipment);
}

.crew-capacity-segment--free {
  background: var(--crew-free);
}

.crew-capacity-segment--free:last-child {
  border-radius: 0 4px 4px 0;
}

.crew-summary {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 0.75rem 0;
}

.crew-role-cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

@media (min-width: 520px) {
  .crew-role-cards {
    grid-template-columns: repeat(3, 1fr);
  }
}

.crew-role-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.85rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.crew-role-card--astronaut {
  border-left: 3px solid var(--crew-astronaut);
}

.crew-role-card--miner,
.crew-role-card--scientist,
.crew-role-card--pilot,
.crew-role-card--medic,
.crew-role-card--engineer {
  display: none;
}

.crew-role-card--miner.crew-role-card--unlocked,
.crew-role-card--scientist.crew-role-card--unlocked,
.crew-role-card--pilot.crew-role-card--unlocked,
.crew-role-card--medic.crew-role-card--unlocked,
.crew-role-card--engineer.crew-role-card--unlocked {
  display: flex;
}

.crew-role-card--miner { border-left: 3px solid var(--crew-miner); }
.crew-role-card--scientist { border-left: 3px solid var(--crew-scientist); }
.crew-role-card--pilot { border-left: 3px solid var(--crew-pilot); }
.crew-role-card--medic { border-left: 3px solid var(--crew-medic); }
.crew-role-card--engineer { border-left: 3px solid var(--crew-engineer); }

.crew-role-card-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}

.crew-role-card-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
}

.crew-role-card-count {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-dim);
  min-width: 1.5em;
  text-align: right;
}

.crew-role-card-effect {
  font-size: 0.8rem;
  color: var(--text-dim);
  line-height: 1.35;
  min-height: 1.2em;
}

.crew-role-card :deep(.btn-tooltip-wrap) {
  display: block;
  min-width: 0;
  margin-top: auto;
}

.crew-in-modules {
  font-size: 0.85rem;
  color: var(--text-dim);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.5rem;
  line-height: 1.35;
}

.crew-veterans {
  font-size: 0.8rem;
  color: var(--text-dim);
  margin: 0 0 0.5rem 0;
  line-height: 1.35;
}

.crew-veterans:not([style*="display: none"]) {
  color: var(--accent);
  font-weight: 500;
}

.hire-astronaut-btn {
  font-family: 'Exo 2', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  width: 100%;
  padding: 0.55rem 0.75rem;
  border-radius: 10px;
  border: 1px solid;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, box-shadow 0.2s, transform 0.15s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.hire-astronaut-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.hire-astronaut-btn:active:not(:disabled) {
  transform: translateY(0);
}

.hire-astronaut-btn--astronaut {
  border-color: var(--crew-astronaut);
  background: var(--crew-astronaut-bg);
  color: var(--crew-astronaut);
}

.hire-astronaut-btn--astronaut:hover:not(:disabled) {
  background: rgba(148, 163, 184, 0.22);
  box-shadow: 0 0 14px rgba(148, 163, 184, 0.3);
}

.hire-astronaut-btn--miner {
  border-color: var(--crew-miner);
  background: var(--crew-miner-bg);
  color: var(--crew-miner);
}

.hire-astronaut-btn--miner:hover:not(:disabled) {
  background: rgba(245, 158, 11, 0.22);
  box-shadow: 0 0 14px rgba(245, 158, 11, 0.3);
}

.hire-astronaut-btn--scientist {
  border-color: var(--crew-scientist);
  background: var(--crew-scientist-bg);
  color: var(--crew-scientist);
}

.hire-astronaut-btn--scientist:hover:not(:disabled) {
  background: rgba(56, 189, 248, 0.22);
  box-shadow: 0 0 14px rgba(56, 189, 248, 0.3);
}

.hire-astronaut-btn--pilot {
  border-color: var(--crew-pilot);
  background: var(--crew-pilot-bg);
  color: var(--crew-pilot);
}

.hire-astronaut-btn--pilot:hover:not(:disabled) {
  background: rgba(167, 139, 250, 0.22);
  box-shadow: 0 0 14px rgba(167, 139, 250, 0.3);
}

.hire-astronaut-btn--medic {
  border-color: var(--crew-medic);
  background: var(--crew-medic-bg);
  color: var(--crew-medic);
}

.hire-astronaut-btn--medic:hover:not(:disabled) {
  background: rgba(16, 185, 129, 0.22);
  box-shadow: 0 0 14px rgba(16, 185, 129, 0.3);
}

.hire-astronaut-btn--engineer {
  border-color: var(--crew-engineer);
  background: var(--crew-engineer-bg);
  color: var(--crew-engineer);
}

.hire-astronaut-btn--engineer:hover:not(:disabled) {
  background: rgba(249, 115, 22, 0.22);
  box-shadow: 0 0 14px rgba(249, 115, 22, 0.3);
}

.hire-astronaut-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
}

.hire-astronaut-btn .crew-btn-role {
  font-weight: 600;
}

.hire-astronaut-btn .crew-btn-sep {
  opacity: 0.85;
  font-weight: 400;
}

.hire-astronaut-btn .crew-btn-cost {
  font-weight: 600;
}

.hire-astronaut-btn .crew-btn-icon {
  font-size: 1.1em;
  line-height: 1;
  flex-shrink: 0;
}

.hire-astronaut-btn:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

.quest-section h2 {
  font-family: 'Orbitron', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 0.5rem 0;
}

.quest-progress-wrap {
  height: 6px;
  background: var(--bg-card);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.quest-progress-bar {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, var(--accent), #fbbf24);
  border-radius: 3px;
  transition: width 0.2s ease-out;
  position: relative;
}

.quest-progress-bar::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 3px;
  background: linear-gradient(
    105deg,
    transparent 0%,
    transparent 40%,
    rgba(255, 255, 255, 0.25) 50%,
    transparent 60%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: progress-shimmer 2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes progress-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.quest-section--complete .quest-progress-bar {
  background: var(--success);
}

.quest-progress {
  font-size: 0.9rem;
  color: var(--text-dim);
  margin: 0 0 0.5rem 0;
}

.quest-claim-btn {
  font-family: 'Exo 2', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  padding: 0.45rem 0.9rem;
  border-radius: 8px;
  border: 1px solid var(--accent);
  background: rgba(245, 158, 11, 0.15);
  color: var(--accent);
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s;
}

.quest-claim-btn:hover:not(:disabled) {
  background: rgba(245, 158, 11, 0.25);
}

.quest-claim-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.quest-claim-btn:active:not(:disabled) {
  transform: scale(0.97);
}

.quest-section--complete {
  border-color: rgba(34, 197, 94, 0.4);
  background: linear-gradient(135deg, var(--bg-panel) 0%, rgba(34, 197, 94, 0.06) 100%);
  animation: quest-complete-pulse 0.6s ease-out;
}

@keyframes quest-complete-pulse {
  0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.35); }
  50% { box-shadow: 0 0 24px 6px rgba(34, 197, 94, 0.25); }
  100% { box-shadow: none; }
}

.quest-section--complete .quest-progress {
  color: var(--success);
}

.quest-section--complete .quest-claim-btn:not(:disabled) {
  border-color: var(--success);
  background: rgba(34, 197, 94, 0.2);
  color: var(--success);
  box-shadow: 0 0 12px rgba(34, 197, 94, 0.25);
}

.quest-section--complete .quest-claim-btn:hover:not(:disabled) {
  background: rgba(34, 197, 94, 0.3);
}

.quest-section--claimed {
  animation: quest-claimed-burst 0.6s ease-out;
}

@keyframes quest-claimed-burst {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
  40% { transform: scale(1.02); box-shadow: 0 0 20px 4px rgba(34, 197, 94, 0.3); }
  100% { transform: scale(1); box-shadow: none; }
}

.next-milestone {
  font-size: 0.8rem;
  color: var(--text-dim);
  margin: -0.5rem 0 1rem 0;
  text-align: center;
  display: none;
}

.quest-streak-hint {
  font-size: 0.75rem;
  color: var(--success);
  margin: 0.25rem 0 0.75rem 0;
}

.info-btn:active,
.settings-btn:active,
.prestige-btn:active:not(:disabled),
.hire-astronaut-btn:active:not(:disabled),
.buy-planet-btn:active:not(:disabled),
.add-slot-btn:active:not(:disabled),
.build-housing-btn:active:not(:disabled),
.research-attempt-btn:active:not(:disabled) {
  transform: scale(0.98);
}

@media (max-width: 360px) {
  .quest-section,
  .prestige-section {
    padding: 0.6rem 0.75rem;
    margin-bottom: 0.75rem;
  }

  .quest-section h2,
  .prestige-section h2,
  .crew-section h2 {
    font-size: 0.85rem;
  }

  .quest-claim-btn,
  .prestige-btn,
  .hire-astronaut-btn {
    padding: 0.5rem 0.8rem;
    font-size: 0.8rem;
    min-height: 44px;
  }
}

@media (min-width: 361px) and (max-width: 767px) {
  .quest-claim-btn,
  .prestige-btn,
  .add-slot-btn,
  .buy-planet-btn {
    min-height: 44px;
  }
}
</style>
