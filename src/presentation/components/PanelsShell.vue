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
          ref="dashboardContentRef"
          id="dashboard-content"
          class="dashboard-content"
        ></div>
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
    <div ref="empireContentRef" id="empire-content"></div>
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
          ref="researchListRef"
          id="research-list"
          class="research-list"
        ></div>
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
          ref="upgradeListRef"
          id="upgrade-list"
          class="upgrade-list"
        ></div>
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
        <div ref="statisticsContainerRef" id="statistics-container"></div>
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
import { handleMineClick } from '../../application/handlers.js';

const store = useGameStateStore();
const sectionCollapse = useSectionCollapse();
const { label: researchDataDisplayLabel } = useResearchDataDisplay();
const appUI = useAppUIStore();
const questClaimBtnRef = ref<HTMLButtonElement | null>(null);
const mineZoneRef = ref<HTMLElement | null>(null);
const dashboardContentRef = ref<HTMLElement | null>(null);
const empireContentRef = ref<HTMLElement | null>(null);
const researchListRef = ref<HTMLElement | null>(null);
const upgradeListRef = ref<HTMLElement | null>(null);
const statisticsContainerRef = ref<HTMLElement | null>(null);

onMounted(() => {
  if (questClaimBtnRef.value) appUI.setQuestClaimAnchor(questClaimBtnRef.value);
  if (mineZoneRef.value) appUI.setMineZoneElement(mineZoneRef.value);
  if (dashboardContentRef.value) appUI.setPanelContainer('dashboard-content', dashboardContentRef.value);
  if (empireContentRef.value) appUI.setPanelContainer('empire-content', empireContentRef.value);
  if (researchListRef.value) appUI.setPanelContainer('research-list', researchListRef.value);
  if (upgradeListRef.value) appUI.setPanelContainer('upgrade-list', upgradeListRef.value);
  if (statisticsContainerRef.value) appUI.setPanelContainer('statistics-container', statisticsContainerRef.value);
});
onBeforeUnmount(() => {
  appUI.setQuestClaimAnchor(null);
  appUI.setMineZoneElement(null);
  appUI.setPanelContainer('dashboard-content', null);
  appUI.setPanelContainer('empire-content', null);
  appUI.setPanelContainer('research-list', null);
  appUI.setPanelContainer('upgrade-list', null);
  appUI.setPanelContainer('statistics-container', null);
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
