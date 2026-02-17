import { createModalOverlay } from './components/modal.js';
import { createGameplayBlock } from './components/gameplayBlock.js';
import { createProgressBarWithWrap } from './components/progressBar.js';
import { TOAST_CONTAINER_ID } from './components/toasts.js';

function getModalsHtml(): string {
  return [
    createModalOverlay({
      overlayId: 'info-overlay',
      overlayClass: 'info-overlay',
      dialogClass: 'info-modal',
      role: 'dialog',
      ariaLabelledBy: 'info-title',
      bodyHtml: `
        <div class="info-header">
          <h2 id="info-title" data-i18n="infoTitle">What's new</h2>
          <button type="button" class="info-close" id="info-close" data-i18n-aria-label="close">×</button>
        </div>
        <div class="info-body">
          <div class="info-version-row">
            <span class="info-version-label" data-i18n="infoVersionLabel">Version</span>
            <span class="info-version-value" id="info-version-value">–</span>
          </div>
          <div class="info-changelog-list" id="info-changelog-list"></div>
        </div>
      `,
    }),
    createModalOverlay({
      overlayId: 'achievements-overlay',
      overlayClass: 'achievements-overlay',
      dialogClass: 'achievements-modal',
      role: 'dialog',
      ariaLabelledBy: 'achievements-modal-title',
      bodyHtml: `
        <div class="achievements-modal-header">
          <h2 id="achievements-modal-title" data-i18n="achievementsTitle">Achievements</h2>
          <button type="button" class="achievements-modal-close" id="achievements-modal-close" data-i18n-aria-label="close">×</button>
        </div>
        <div class="achievements-modal-body">
          <div class="achievements-modal-list" id="achievements-modal-list"></div>
        </div>
      `,
    }),
    createModalOverlay({
      overlayId: 'reset-confirm-overlay',
      overlayClass: 'reset-confirm-overlay',
      dialogClass: 'reset-confirm-modal',
      role: 'alertdialog',
      ariaLabelledBy: 'reset-confirm-title',
      ariaDescribedBy: 'reset-confirm-desc',
      bodyHtml: `
        <h2 id="reset-confirm-title" data-i18n="resetConfirmTitle">Reset progress?</h2>
        <p id="reset-confirm-desc" data-i18n="resetConfirmDesc">Coins, planets, upgrades, crew, achievements and all progress will be lost. This cannot be undone.</p>
        <div class="reset-confirm-actions">
          <button type="button" class="reset-confirm-cancel" id="reset-confirm-cancel" data-i18n="cancel">Cancel</button>
          <button type="button" class="reset-confirm-reset" id="reset-confirm-reset" data-i18n="resetAll">Reset all</button>
        </div>
      `,
    }),
    createModalOverlay({
      overlayId: 'prestige-confirm-overlay',
      overlayClass: 'prestige-confirm-overlay',
      dialogClass: 'prestige-confirm-modal',
      role: 'alertdialog',
      ariaLabelledBy: 'prestige-confirm-title',
      ariaDescribedBy: 'prestige-confirm-desc',
      bodyHtml: `
        <h2 id="prestige-confirm-title" data-i18n="prestigeConfirmTitle">Prestige?</h2>
        <p id="prestige-confirm-desc" data-i18n="prestigeConfirmDesc">You'll reset to 0 coins and 1 planet. You keep your new Prestige level and +4% production per level forever.</p>
        <p id="prestige-confirm-after" class="prestige-confirm-after"></p>
        <div class="prestige-confirm-actions">
          <button type="button" class="prestige-confirm-cancel" id="prestige-confirm-cancel" data-i18n="cancel">Cancel</button>
          <button type="button" class="prestige-confirm-do" id="prestige-confirm-do" data-i18n="prestige">Prestige</button>
        </div>
      `,
    }),
    createModalOverlay({
      overlayId: 'prestige-rewards-overlay',
      overlayClass: 'prestige-rewards-overlay',
      dialogClass: 'prestige-rewards-modal',
      role: 'dialog',
      ariaLabelledBy: 'prestige-rewards-title',
      ariaDescribedBy: 'prestige-rewards-desc',
      bodyHtml: `
        <h2 id="prestige-rewards-title" data-i18n="prestigeRewardsTitle">Prestige rewards</h2>
        <p id="prestige-rewards-desc" class="prestige-rewards-intro" data-i18n="prestigeRewardsIntro">What you gain at each prestige level:</p>
        <ul id="prestige-rewards-list" class="prestige-rewards-list" aria-describedby="prestige-rewards-desc"></ul>
        <div class="prestige-confirm-actions">
          <button type="button" class="prestige-confirm-cancel" id="prestige-rewards-close" data-i18n="gotIt">Got it</button>
        </div>
      `,
    }),
    createModalOverlay({
      overlayId: 'intro-overlay',
      overlayClass: 'intro-overlay',
      dialogClass: 'intro-modal',
      role: 'dialog',
      ariaLabelledBy: 'intro-title',
      ariaDescribedBy: 'intro-body',
      bodyHtml: `
        <h2 id="intro-title"></h2>
        <p id="intro-body"></p>
        ${createProgressBarWithWrap('intro-progress-wrap', 'intro-progress-wrap', 'intro-progress-bar', 'intro-progress-bar', true)}
        <button type="button" class="intro-got-it" id="intro-got-it" data-i18n="gotIt">Got it</button>
      `,
    }),
    createModalOverlay({
      overlayId: 'events-hint-overlay',
      overlayClass: 'events-hint-overlay',
      dialogClass: 'events-hint-modal',
      role: 'dialog',
      ariaLabelledBy: 'events-hint-modal-title',
      ariaDescribedBy: 'events-hint-modal-body',
      bodyHtml: `
        <div class="events-hint-modal-header">
          <h2 id="events-hint-modal-title" data-i18n="eventsHintTitle">Events you have seen</h2>
          <button type="button" class="events-hint-close" id="events-hint-close" data-i18n-aria-label="close">×</button>
        </div>
        <div id="events-hint-modal-body" class="events-hint-modal-body" aria-describedby="events-hint-modal-body"></div>
      `,
    }),
    createModalOverlay({
      overlayId: 'chart-help-overlay',
      overlayClass: 'chart-help-overlay',
      dialogClass: 'chart-help-modal',
      role: 'dialog',
      ariaLabelledBy: 'chart-help-modal-title',
      ariaDescribedBy: 'chart-help-modal-body',
      bodyHtml: `
        <div class="chart-help-modal-header">
          <h2 id="chart-help-modal-title" class="chart-help-modal-title"></h2>
          <button type="button" class="chart-help-close" id="chart-help-close" data-i18n-aria-label="close">×</button>
        </div>
        <p id="chart-help-modal-body" class="chart-help-modal-body" aria-describedby="chart-help-modal-body"></p>
      `,
    }),
    createModalOverlay({
      overlayId: 'planet-detail-overlay',
      overlayClass: 'planet-detail-overlay',
      dialogClass: 'planet-detail-modal',
      role: 'dialog',
      ariaLabelledBy: 'planet-detail-title',
      bodyHtml: `
        <div class="planet-detail-header">
          <h2 id="planet-detail-title" data-i18n="planetDetailTitle">Planet details</h2>
          <button type="button" class="planet-detail-close" id="planet-detail-close" data-i18n-aria-label="close">×</button>
        </div>
        <div class="planet-detail-body" id="planet-detail-body"></div>
      `,
    }),
    createModalOverlay({
      overlayId: 'section-rules-overlay',
      overlayClass: 'section-rules-overlay',
      dialogClass: 'section-rules-modal',
      role: 'dialog',
      ariaLabelledBy: 'section-rules-title',
      ariaDescribedBy: 'section-rules-body',
      bodyHtml: `
        <div class="section-rules-header">
          <h2 id="section-rules-title" class="section-rules-title"></h2>
          <button type="button" class="section-rules-close" id="section-rules-close" data-i18n-aria-label="close">×</button>
        </div>
        <div class="section-rules-content">
          <div id="section-rules-body" class="section-rules-body"></div>
        </div>
        <div class="section-rules-actions">
          <button type="button" class="section-rules-got-it" id="section-rules-got-it" data-i18n="gotIt">Got it</button>
        </div>
      `,
    }),
    createModalOverlay({
      overlayId: 'upgrade-choose-planet-overlay',
      overlayClass: 'upgrade-choose-planet-overlay',
      dialogClass: 'upgrade-choose-planet-modal',
      role: 'dialog',
      ariaLabelledBy: 'upgrade-choose-planet-title',
      bodyHtml: `
        <div class="upgrade-choose-planet-header">
          <h2 id="upgrade-choose-planet-title" class="upgrade-choose-planet-title"></h2>
          <button type="button" class="upgrade-choose-planet-close" id="upgrade-choose-planet-close" data-i18n-aria-label="close">×</button>
        </div>
        <div class="upgrade-choose-planet-list" id="upgrade-choose-planet-list" role="list"></div>
        <div class="upgrade-choose-planet-actions">
          <button type="button" class="upgrade-choose-planet-cancel" id="upgrade-choose-planet-cancel" data-i18n="cancel">Cancel</button>
        </div>
      `,
    }),
    createModalOverlay({
      overlayId: 'expedition-modal-overlay',
      overlayClass: 'expedition-modal-overlay',
      dialogClass: 'expedition-modal',
      role: 'dialog',
      ariaLabelledBy: 'expedition-modal-title',
      bodyHtml: `
        <div class="expedition-modal-header">
          <h2 id="expedition-modal-title" class="expedition-modal-title"></h2>
          <button type="button" class="expedition-modal-close" id="expedition-modal-close" data-i18n-aria-label="close">×</button>
        </div>
        <div class="expedition-modal-body">
          <div class="expedition-modal-cost-wrap">
            <p class="expedition-modal-cost" id="expedition-modal-cost"></p>
            <span class="expedition-new-system" id="expedition-modal-new-system" aria-hidden="true" title=""></span>
          </div>
          <h3 class="expedition-modal-dest-title" id="expedition-modal-dest-title" data-i18n="expeditionSelectTier">Choose destination</h3>
          <div class="expedition-modal-tiers" id="expedition-modal-tiers" role="group" aria-label="Destination"></div>
          <h3 class="expedition-crew-section-title" id="expedition-modal-crew-title" data-i18n="crew">Crew</h3>
          <div class="expedition-modal-crew-wrap" id="expedition-modal-crew"></div>
        </div>
        <div class="expedition-modal-actions">
          <button type="button" class="expedition-modal-cancel" id="expedition-modal-cancel" data-i18n="cancel">Cancel</button>
          <button type="button" class="expedition-modal-launch" id="expedition-modal-launch" disabled>Launch</button>
        </div>
      `,
    }),
  ].join('\n');
}

function getStatsHtml(): string {
  return `
    <section class="stats">
      <div class="stat-card stat-card--coins" id="coins-stat-card" data-i18n-title="coinsTitle">
        <div class="stat-label" data-i18n="coins">Coins</div>
        <div class="stat-value stat-value--hero" id="coins-value">0</div>
        <div class="stat-coins-extra" id="crew-stat-line" aria-live="polite"></div>
        <div class="stat-coins-extra stat-coins-extra--sub" id="crew-stat-detail" aria-live="polite"></div>
        <div class="stat-coins-extra stat-coins-extra--sub" id="crew-stat-by-job" aria-live="polite"></div>
      </div>
      <div class="stat-card stat-card--crew stats-compact-only" id="crew-compact-card" aria-hidden="true">
        <div class="stat-label" data-i18n="astronautsLabel">Astronauts</div>
        <div class="stat-value" id="stats-compact-crew">0</div>
      </div>
      <div class="stat-card stat-card--production" id="production-stat-card" data-i18n-title="productionTitle">
        <div class="stat-label"><span data-i18n="production">Production</span> <span class="production-live" id="production-live" aria-hidden="true"></span></div>
        <div class="stat-value" id="production-value">0/s</div>
        <div class="stat-breakdown" id="production-breakdown" aria-hidden="true"></div>
        <div class="events-line" id="events-line">
          <div class="events-line-content">
            <div class="active-events" id="active-events" aria-live="polite"></div>
            <div class="next-event-row" id="next-event-row">
              <span class="next-event-label" id="next-event-label" data-i18n="nextEventLabel" aria-hidden="true">Next event</span>
              ${createProgressBarWithWrap('next-event-progress-wrap', 'next-event-progress-wrap', 'next-event-progress-bar', 'next-event-progress-bar', true)}
            </div>
          </div>
          <span class="events-hint-wrap" id="events-hint-wrap">
            <button type="button" class="events-hint-trigger" id="events-hint-trigger" data-i18n-aria-label="eventsHintTitle" aria-haspopup="dialog" title="">?</button>
          </span>
        </div>
      </div>
    </section>
    <div class="stats-spacer" id="stats-spacer" aria-hidden="true"></div>
    <p class="next-milestone" id="next-milestone" aria-live="polite"></p>
    <div class="event-toasts" id="${TOAST_CONTAINER_ID}" aria-live="polite"></div>`;
}

function getTabsAndPanelsHtml(): string {
  const questBlock = createGameplayBlock({
    id: 'quest-section',
    sectionClass: 'quest-section',
    titleKey: 'quest',
    dataBlock: 'quest',
    rulesKey: 'questRules',
    bodyHtml: `
          ${createProgressBarWithWrap('quest-progress-wrap', 'quest-progress-wrap', 'quest-progress-bar', 'quest-progress-bar')}
          <p class="quest-progress" id="quest-progress"></p>
          <p class="quest-streak-hint" id="quest-streak-hint" aria-live="polite"></p>
          <span class="btn-tooltip-wrap" id="quest-claim-wrap"><button type="button" class="quest-claim-btn" id="quest-claim" disabled data-i18n="claim">Claim</button></span>
        `,
  });
  const researchBlock = createGameplayBlock({
    id: 'research-section',
    sectionClass: 'research-section',
    titleKey: 'research',
    dataBlock: 'research',
    rulesKey: 'researchRules',
    bodyHtml: `
          <p class="research-hint" data-i18n="researchHint">Skill tree: attempt to unlock nodes for +% production and +% click. Each attempt has a success chance; on failure coins are lost. Resets on Prestige.</p>
          <p class="research-data-line" id="research-data-display" aria-live="polite"></p>
          <div class="research-list" id="research-list"></div>
        `,
  });
  const upgradesBlock = createGameplayBlock({
    id: 'upgrades-section',
    sectionClass: 'upgrades-section',
    titleKey: 'upgrades',
    dataBlock: 'upgrades',
    rulesKey: 'upgradesRules',
    bodyHtml: `
          <p class="upgrades-hint" data-i18n="upgradesHint">You can buy each upgrade multiple times; production stacks. Assigns to a planet with a free slot.</p>
          <div class="upgrade-list" id="upgrade-list"></div>
        `,
  });
  const statisticsBlock = createGameplayBlock({
    id: 'statistics-section',
    sectionClass: 'statistics-section',
    titleKey: 'statisticsTitle',
    rulesKey: 'statisticsRules',
    locked: false,
    bodyHtml: `
          <div id="statistics-container"></div>
        `,
  });

  return `
    <div class="app-tab-panel app-tab-panel--active" id="panel-mine" role="tabpanel" aria-labelledby="tab-mine" data-tab="mine">
      <section class="mine-zone" id="mine-zone" data-i18n-title="mineZoneTitle">
        <div class="mine-zone-floats" id="mine-zone-floats" aria-hidden="true"></div>
        <div class="mine-zone-visual" id="mine-zone-visual"></div>
        <p class="mine-zone-hint" id="mine-zone-hint" data-i18n="mineZoneTitle"></p>
        <span class="combo-indicator" id="combo-indicator" aria-live="polite"></span>
      </section>
      ${questBlock}
    </div>
    <div class="app-tab-panel" id="panel-dashboard" role="tabpanel" aria-labelledby="tab-dashboard" data-tab="dashboard" hidden>
      <section class="gameplay-block gameplay-block--unlocked dashboard-section" id="dashboard-section" aria-labelledby="dashboard-title">
        <div class="gameplay-block-header">
          <h2 id="dashboard-title" class="dashboard-title" data-i18n="dashboardTitle">Dashboard</h2>
          <span class="gameplay-block-summary" id="dashboard-section-summary" aria-hidden="true"></span>
          <div class="gameplay-block-header-actions">
            <button type="button" class="gameplay-block-toggle" aria-expanded="true" aria-label="Collapse"><span class="gameplay-block-toggle-icon" aria-hidden="true">▼</span></button>
          </div>
        </div>
        <div class="gameplay-block-body">
          <div id="dashboard-content" class="dashboard-content"></div>
        </div>
      </section>
    </div>
    <div class="app-tab-panel" id="panel-empire" role="tabpanel" aria-labelledby="tab-empire" data-tab="empire" hidden>
      <div id="empire-content"></div>
    </div>
    <div class="app-tab-panel" id="panel-research" role="tabpanel" aria-labelledby="tab-research" data-tab="research" hidden>
      ${researchBlock}
    </div>
    <div class="app-tab-panel" id="panel-upgrades" role="tabpanel" aria-labelledby="tab-upgrades" data-tab="upgrades" hidden>
      ${upgradesBlock}
    </div>
    <div class="app-tab-panel" id="panel-stats" role="tabpanel" aria-labelledby="tab-stats" data-tab="stats" hidden>
      ${statisticsBlock}
    </div>
  `;
}

/** Stats block (modals + stats section + spacer + milestone + toasts). For Vue shell: injected into #legacy-root. */
export function getStatsBlockHtml(): string {
  return [getModalsHtml(), getStatsHtml()].join('\n');
}

/** Tab panels only. For Vue shell: injected into #legacy-panels (tabs nav is above this in Vue). */
export function getPanelsOnlyHtml(): string {
  return getTabsAndPanelsHtml();
}

export function getAppHtml(): string {
  return [getModalsHtml(), getStatsHtml(), getTabsAndPanelsHtml()].join('\n');
}
