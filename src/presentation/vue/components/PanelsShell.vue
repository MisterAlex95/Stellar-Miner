<template>
  <div
    id="panel-mine"
    class="app-tab-panel app-tab-panel--active"
    role="tabpanel"
    aria-labelledby="tab-mine"
    data-tab="mine"
  >
    <section
      id="mine-zone"
      class="mine-zone"
      :title="t('mineZoneTitle')"
    >
      <div
        id="mine-zone-floats"
        class="mine-zone-floats"
        aria-hidden="true"
      ></div>
      <div
        id="mine-zone-visual"
        class="mine-zone-visual"
      ></div>
      <p
        id="mine-zone-hint"
        class="mine-zone-hint"
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
        'quest-section--complete': store.quest.sectionComplete,
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
          >
            ?
          </button>
          <button
            type="button"
            class="gameplay-block-toggle"
            aria-expanded="true"
            :aria-label="t('collapseSection')"
          >
            <span
              class="gameplay-block-toggle-icon"
              aria-hidden="true"
            >▼</span>
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
    role="tabpanel"
    aria-labelledby="tab-dashboard"
    data-tab="dashboard"
    hidden
  >
    <section
      id="dashboard-section"
      class="gameplay-block gameplay-block--unlocked dashboard-section"
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
            aria-expanded="true"
            :aria-label="t('collapseSection')"
          >
            <span
              class="gameplay-block-toggle-icon"
              aria-hidden="true"
            >▼</span>
          </button>
        </div>
      </div>
      <div class="gameplay-block-body">
        <div
          id="dashboard-content"
          class="dashboard-content"
        ></div>
      </div>
    </section>
  </div>
  <div
    id="panel-empire"
    class="app-tab-panel"
    role="tabpanel"
    aria-labelledby="tab-empire"
    data-tab="empire"
    hidden
  >
    <div id="empire-content"></div>
  </div>
  <div
    id="panel-research"
    class="app-tab-panel"
    role="tabpanel"
    aria-labelledby="tab-research"
    data-tab="research"
    hidden
  >
    <section
      id="research-section"
      class="gameplay-block research-section"
      :class="{
        'gameplay-block--locked': !isSectionUnlocked('research-section'),
        'gameplay-block--unlocked': isSectionUnlocked('research-section'),
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
          >
            ?
          </button>
          <button
            type="button"
            class="gameplay-block-toggle"
            aria-expanded="true"
            :aria-label="t('collapseSection')"
          >
            <span
              class="gameplay-block-toggle-icon"
              aria-hidden="true"
            >▼</span>
          </button>
        </div>
      </div>
      <div class="gameplay-block-body">
        <p class="research-hint">{{ t('researchHint') }}</p>
        <p
          id="research-data-display"
          class="research-data-line"
          aria-live="polite"
        ></p>
        <div
          id="research-list"
          class="research-list"
        ></div>
      </div>
    </section>
  </div>
  <div
    id="panel-upgrades"
    class="app-tab-panel"
    role="tabpanel"
    aria-labelledby="tab-upgrades"
    data-tab="upgrades"
    hidden
  >
    <section
      id="upgrades-section"
      class="gameplay-block upgrades-section"
      :class="{
        'gameplay-block--locked': !isSectionUnlocked('upgrades-section'),
        'gameplay-block--unlocked': isSectionUnlocked('upgrades-section'),
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
          >
            ?
          </button>
          <button
            type="button"
            class="gameplay-block-toggle"
            aria-expanded="true"
            :aria-label="t('collapseSection')"
          >
            <span
              class="gameplay-block-toggle-icon"
              aria-hidden="true"
            >▼</span>
          </button>
        </div>
      </div>
      <div class="gameplay-block-body">
        <p class="upgrades-hint">{{ t('upgradesHint') }}</p>
        <div
          id="upgrade-list"
          class="upgrade-list"
        ></div>
      </div>
    </section>
  </div>
  <div
    id="panel-stats"
    class="app-tab-panel"
    role="tabpanel"
    aria-labelledby="tab-stats"
    data-tab="stats"
    hidden
  >
    <section
      id="statistics-section"
      class="gameplay-block gameplay-block--unlocked statistics-section"
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
          >
            ?
          </button>
          <button
            type="button"
            class="gameplay-block-toggle"
            aria-expanded="true"
            :aria-label="t('collapseSection')"
          >
            <span
              class="gameplay-block-toggle-icon"
              aria-hidden="true"
            >▼</span>
          </button>
        </div>
      </div>
      <div class="gameplay-block-body">
        <div id="statistics-container"></div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { t } from '../../../application/strings.js';
import { useGameStateStore } from '../stores/gameState.js';
import { handleClaimQuest } from '../../../application/handlers.js';

const store = useGameStateStore();

function isSectionUnlocked(sectionId: string): boolean {
  return store.progression.sectionUnlocked[sectionId] !== false;
}
</script>
