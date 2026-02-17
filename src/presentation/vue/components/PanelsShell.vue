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
        aria-live="polite"
      ></span>
    </section>
    <section
      id="quest-section"
      class="gameplay-block gameplay-block--unlocked quest-section"
      data-block="quest"
      aria-labelledby="quest-title"
    >
      <div class="gameplay-block-header">
        <h2 id="quest-title">{{ t('quest') }}</h2>
        <span
          id="quest-section-summary"
          class="gameplay-block-summary"
          aria-hidden="true"
        ></span>
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
            aria-valuenow="0"
          ></div>
        </div>
        <p
          id="quest-progress"
          class="quest-progress"
        ></p>
        <p
          id="quest-streak-hint"
          class="quest-streak-hint"
          aria-live="polite"
        ></p>
        <span
          id="quest-claim-wrap"
          class="btn-tooltip-wrap"
        >
          <button
            id="quest-claim"
            type="button"
            class="quest-claim-btn"
            disabled
          >
            {{ t('claim') }}
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
      class="gameplay-block gameplay-block--unlocked research-section"
      data-block="research"
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
      class="gameplay-block gameplay-block--unlocked upgrades-section"
      data-block="upgrades"
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
</script>
