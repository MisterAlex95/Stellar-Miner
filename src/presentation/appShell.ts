import { createModalOverlay } from './components/modal.js';
import { createGameplayBlock } from './components/gameplayBlock.js';
import { createProgressBarWithWrap } from './components/progressBar.js';
import { TOAST_CONTAINER_ID } from './components/toasts.js';

function getHeaderHtml(): string {
  return `
    <div class="offline-banner" id="offline-banner" aria-live="polite" aria-hidden="true" role="status" hidden data-i18n="offlineIndicator">You are offline. Progress may not be saved.</div>
    <header>
      <div class="header-row">
        <div>
          <h1 data-i18n="appTitle">STELLAR MINER</h1>
          <p class="subtitle" data-i18n="appSubtitle">Mine coins. Buy upgrades. Conquer the belt.</p>
        </div>
        <span class="header-actions">
          <span class="info-btn-wrap">
            <button type="button" class="info-btn" id="info-btn" data-i18n-aria-label="whatsNew">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            </button>
            <span class="info-update-badge" id="info-update-badge" aria-hidden="true"></span>
          </span>
          <button type="button" class="achievements-btn" id="achievements-btn" data-i18n-aria-label="openAchievements">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
          </button>
          <button type="button" class="settings-btn" id="settings-btn" data-i18n-aria-label="openSettings">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-1.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h1.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v1.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-1.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
        </span>
      </div>
    </header>`;
}

function getModalsHtml(): string {
      const settingsBody = `
        <div class="settings-header">
          <h2 id="settings-title" data-i18n="settings">Settings</h2>
          <button type="button" class="settings-close" id="settings-close" data-i18n-aria-label="close">×</button>
        </div>
        <div class="settings-body">
          <div class="settings-group">
            <h3 class="settings-group-title" data-i18n="settingsGroupVisual">Visual</h3>
            <div class="settings-option">
              <label for="setting-language" data-i18n="language">Language</label>
              <select id="setting-language" data-i18n-aria-label="language">
                <option value="en" data-i18n="languageEn">English</option>
                <option value="fr" data-i18n="languageFr">Français</option>
              </select>
            </div>
            <div class="settings-option">
              <label for="setting-starfield-speed" data-i18n="starfieldSpeed">Starfield speed</label>
              <select id="setting-starfield-speed">
                <option value="0.5" data-i18n="starfieldSpeedSlow">Slow</option>
                <option value="1" selected data-i18n="starfieldSpeedNormal">Normal</option>
                <option value="1.5" data-i18n="starfieldSpeedFast">Fast</option>
              </select>
            </div>
            <div class="settings-option">
              <label class="settings-toggle">
                <input type="checkbox" id="setting-orbit-lines" checked />
                <span data-i18n="showOrbitLines">Show orbit lines</span>
              </label>
            </div>
            <div class="settings-option">
              <label class="settings-toggle">
                <input type="checkbox" id="setting-click-particles" checked />
                <span data-i18n="clickParticles">Click particles</span>
              </label>
            </div>
            <div class="settings-option">
              <label for="setting-theme" data-i18n="theme">Theme</label>
              <select id="setting-theme" data-i18n-aria-label="theme">
                <option value="dark" data-i18n="themeDark">Dark</option>
                <option value="light" data-i18n="themeLight">Light</option>
              </select>
            </div>
          </div>
          <div class="settings-group">
            <h3 class="settings-group-title" data-i18n="settingsGroupGameplay">Gameplay</h3>
            <div class="settings-option">
              <label class="settings-toggle">
                <input type="checkbox" id="setting-compact-numbers" checked />
                <span data-i18n="compactNumbers">Compact numbers (1.2K)</span>
              </label>
            </div>
            <div class="settings-option">
              <label class="settings-toggle">
                <input type="checkbox" id="setting-space-key-repeat" />
                <span data-i18n="spaceKeyRepeat">Allow Space key repeat (hold to mine)</span>
              </label>
            </div>
            <div class="settings-option">
              <label for="setting-layout" data-i18n="layout">Layout</label>
              <select id="setting-layout" data-i18n-aria-label="layout">
                <option value="tabs" data-i18n="layoutTabs">Tabs</option>
                <option value="one-page" data-i18n="layoutOnePage">One page</option>
              </select>
            </div>
            <div class="settings-option">
              <label class="settings-toggle">
                <input type="checkbox" id="setting-pause-background" />
                <span data-i18n="pauseWhenBackground">Pause production when tab in background</span>
              </label>
            </div>
            <div class="settings-option">
              <label class="settings-toggle">
                <input type="checkbox" id="setting-sound" />
                <span data-i18n="soundEnabled">Sound effects</span>
              </label>
            </div>
            <div class="settings-option">
              <label class="settings-toggle">
                <input type="checkbox" id="setting-reduced-motion" />
                <span data-i18n="reducedMotion">Reduce motion</span>
              </label>
            </div>
          </div>
          <div class="settings-group">
            <h3 class="settings-group-title" data-i18n="settingsGroupSaveData">Save & data</h3>
          <div class="settings-option settings-save-export">
            <div class="settings-save-buttons">
              <button type="button" class="settings-export-btn" id="settings-export-btn" data-i18n="exportSave">Export save</button>
              <button type="button" class="settings-import-btn" id="settings-import-btn" data-i18n="importSave">Import save</button>
            </div>
            <input type="file" id="settings-import-file" accept=".json,application/json" class="settings-import-file" aria-hidden="true" />
            <p class="settings-last-saved" id="last-saved-indicator" aria-live="polite"></p>
          </div>
          <div class="settings-option settings-reset">
            <button type="button" class="reset-btn" id="settings-reset-btn" data-i18n="resetProgress">Reset progress</button>
          </div>
          </div>
        </div>
      `;
  return [
    createModalOverlay({
      overlayId: 'settings-overlay',
      overlayClass: 'settings-overlay',
      dialogClass: 'settings-modal',
      role: 'dialog',
      ariaLabelledBy: 'settings-title',
      bodyHtml: settingsBody,
    }),
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
          <p class="expedition-modal-cost" id="expedition-modal-cost"></p>
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
  const crewBlock = createGameplayBlock({
    id: 'crew-section',
    sectionClass: 'crew-section',
    titleKey: 'crew',
    dataBlock: 'crew',
    rulesKey: 'crewRules',
    bodyHtml: `
          <p class="crew-hint" data-i18n="crewHint">Hire astronauts (no job at first). Unlock Miner, Scientist and Pilot via Research for bonuses. Resets on Prestige.</p>
          <div class="crew-capacity-wrap" id="crew-capacity-wrap" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-i18n-aria-label="crewCapacityAria">
            <div class="crew-capacity-fill" id="crew-capacity-fill">
              <div class="crew-capacity-segment crew-capacity-segment--astronaut" id="crew-capacity-segment-astronaut"></div>
              <div class="crew-capacity-segment crew-capacity-segment--miner" id="crew-capacity-segment-miner"></div>
              <div class="crew-capacity-segment crew-capacity-segment--scientist" id="crew-capacity-segment-scientist"></div>
              <div class="crew-capacity-segment crew-capacity-segment--pilot" id="crew-capacity-segment-pilot"></div>
              <div class="crew-capacity-segment crew-capacity-segment--medic" id="crew-capacity-segment-medic"></div>
              <div class="crew-capacity-segment crew-capacity-segment--engineer" id="crew-capacity-segment-engineer"></div>
              <div class="crew-capacity-segment crew-capacity-segment--equipment" id="crew-capacity-segment-equipment"></div>
              <div class="crew-capacity-segment crew-capacity-segment--free" id="crew-capacity-segment-free"></div>
            </div>
          </div>
          <div class="crew-summary" id="crew-summary" aria-live="polite">No crew yet</div>
          <div class="empty-state" id="crew-empty-state" aria-hidden="true" hidden>
            <span class="empty-state-icon" aria-hidden="true"></span>
            <p class="empty-state-text" id="crew-empty-state-text" data-i18n="emptyCrewText">No crew yet. Hire astronauts below to boost production.</p>
          </div>
          <div class="crew-role-cards" id="crew-role-cards">
            <div class="crew-role-card crew-role-card--astronaut" id="crew-role-card-astronaut">
              <div class="crew-role-card-header">
                <span class="crew-role-card-name" data-i18n="crewRoleAstronaut">Astronaut</span>
                <span class="crew-role-card-count" id="crew-role-count-astronaut">0</span>
              </div>
              <div class="crew-role-card-effect" id="crew-role-effect-astronaut"></div>
              <span class="btn-tooltip-wrap crew-role-wrap" data-role="astronaut"><button type="button" class="hire-astronaut-btn hire-astronaut-btn--astronaut" id="hire-astronaut-astronaut" data-role="astronaut"><span class="crew-btn-role">Astronaut</span><span class="crew-btn-sep" aria-hidden="true">·</span><span class="crew-btn-cost">0 ⬡</span></button></span>
            </div>
            <div class="crew-role-card crew-role-card--miner" id="crew-role-card-miner">
              <div class="crew-role-card-header">
                <span class="crew-role-card-name" data-i18n="crewRoleMiner">Miner</span>
                <span class="crew-role-card-count" id="crew-role-count-miner">0</span>
              </div>
              <div class="crew-role-card-effect" id="crew-role-effect-miner"></div>
              <span class="btn-tooltip-wrap crew-role-wrap" data-role="miner"><button type="button" class="hire-astronaut-btn hire-astronaut-btn--miner" id="hire-astronaut-miner" data-role="miner"><span class="crew-btn-role">Miner</span><span class="crew-btn-sep" aria-hidden="true">·</span><span class="crew-btn-cost">0 ⬡</span></button></span>
            </div>
            <div class="crew-role-card crew-role-card--scientist" id="crew-role-card-scientist">
              <div class="crew-role-card-header">
                <span class="crew-role-card-name" data-i18n="crewRoleScientist">Scientist</span>
                <span class="crew-role-card-count" id="crew-role-count-scientist">0</span>
              </div>
              <div class="crew-role-card-effect" id="crew-role-effect-scientist"></div>
              <span class="btn-tooltip-wrap crew-role-wrap" data-role="scientist"><button type="button" class="hire-astronaut-btn hire-astronaut-btn--scientist" id="hire-astronaut-scientist" data-role="scientist"><span class="crew-btn-role">Scientist</span><span class="crew-btn-sep" aria-hidden="true">·</span><span class="crew-btn-cost">0 ⬡</span></button></span>
            </div>
            <div class="crew-role-card crew-role-card--pilot" id="crew-role-card-pilot">
              <div class="crew-role-card-header">
                <span class="crew-role-card-name" data-i18n="crewRolePilot">Pilot</span>
                <span class="crew-role-card-count" id="crew-role-count-pilot">0</span>
              </div>
              <div class="crew-role-card-effect" id="crew-role-effect-pilot"></div>
              <span class="btn-tooltip-wrap crew-role-wrap" data-role="pilot"><button type="button" class="hire-astronaut-btn hire-astronaut-btn--pilot" id="hire-astronaut-pilot" data-role="pilot"><span class="crew-btn-role">Pilot</span><span class="crew-btn-sep" aria-hidden="true">·</span><span class="crew-btn-cost">0 ⬡</span></button></span>
            </div>
            <div class="crew-role-card crew-role-card--medic" id="crew-role-card-medic">
              <div class="crew-role-card-header">
                <span class="crew-role-card-name" data-i18n="crewRoleMedic">Medic</span>
                <span class="crew-role-card-count" id="crew-role-count-medic">0</span>
              </div>
              <div class="crew-role-card-effect" id="crew-role-effect-medic"></div>
              <span class="btn-tooltip-wrap crew-role-wrap" data-role="medic"><button type="button" class="hire-astronaut-btn hire-astronaut-btn--medic" id="hire-astronaut-medic" data-role="medic"><span class="crew-btn-role">Medic</span><span class="crew-btn-sep" aria-hidden="true">·</span><span class="crew-btn-cost">0 ⬡</span></button></span>
            </div>
            <div class="crew-role-card crew-role-card--engineer" id="crew-role-card-engineer">
              <div class="crew-role-card-header">
                <span class="crew-role-card-name" data-i18n="crewRoleEngineer">Engineer</span>
                <span class="crew-role-card-count" id="crew-role-count-engineer">0</span>
              </div>
              <div class="crew-role-card-effect" id="crew-role-effect-engineer"></div>
              <span class="btn-tooltip-wrap crew-role-wrap" data-role="engineer"><button type="button" class="hire-astronaut-btn hire-astronaut-btn--engineer" id="hire-astronaut-engineer" data-role="engineer"><span class="crew-btn-role">Engineer</span><span class="crew-btn-sep" aria-hidden="true">·</span><span class="crew-btn-cost">0 ⬡</span></button></span>
            </div>
          </div>
          <div class="crew-in-modules" id="crew-in-modules" aria-live="polite"></div>
          <div class="crew-veterans" id="crew-veterans" aria-live="polite"></div>
        `,
  });
  const planetsBlock = createGameplayBlock({
    id: 'planets-section',
    sectionClass: 'planets-section',
    titleKey: 'planets',
    dataBlock: 'planets',
    rulesKey: 'planetsRules',
    bodyHtml: `
          <p class="planets-hint" data-i18n="planetsHint">Each planet has upgrade slots (expandable). More planets = +4% production each. Send astronauts on an expedition to discover a new planet (some may die); if all survive or at least one returns, you discover it. Add slots or build housing on a planet (+2 crew capacity per module, uses 1 slot).</p>
          <div class="planet-list" id="planet-list"></div>
          <div class="expedition-area" id="expedition-area"></div>
        `,
  });
  const prestigeBlock = createGameplayBlock({
    id: 'prestige-section',
    sectionClass: 'prestige-section',
    titleKey: 'prestige',
    dataBlock: 'prestige',
    rulesKey: 'prestigeRules',
    bodyHtml: `
          <p class="prestige-hint" data-i18n="prestigeHint">Reset coins and planets to gain +4% production per prestige level forever.</p>
          <div class="prestige-status" id="prestige-status"></div>
          <div class="prestige-actions">
            <span class="btn-tooltip-wrap" id="prestige-btn-wrap"><button type="button" class="prestige-btn" id="prestige-btn" disabled>Prestige</button></span>
            <button type="button" class="prestige-rewards-btn" id="prestige-rewards-btn" data-i18n="prestigeRewardsWhatFor">What do I get?</button>
          </div>
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
    <nav class="app-tabs" role="tablist" data-i18n-aria-label="gameSections">
      <div class="app-tabs-scroll">
        <button type="button" class="app-tab app-tab--active" role="tab" id="tab-mine" aria-selected="true" aria-controls="panel-mine" data-tab="mine"><span data-i18n="tabMine">Mine</span></button>
        <button type="button" class="app-tab" role="tab" id="tab-dashboard" aria-selected="false" aria-controls="panel-dashboard" data-tab="dashboard"><span data-i18n="tabDashboard">Dashboard</span></button>
        <button type="button" class="app-tab" role="tab" id="tab-empire" aria-selected="false" aria-controls="panel-empire" data-tab="empire"><span data-i18n="tabBase">Empire</span></button>
        <button type="button" class="app-tab" role="tab" id="tab-research" aria-selected="false" aria-controls="panel-research" data-tab="research"><span data-i18n="tabResearch">Research</span></button>
        <button type="button" class="app-tab" role="tab" id="tab-upgrades" aria-selected="false" aria-controls="panel-upgrades" data-tab="upgrades"><span data-i18n="tabUpgrades">Upgrades</span></button>
        <button type="button" class="app-tab" role="tab" id="tab-stats" aria-selected="false" aria-controls="panel-stats" data-tab="stats"><span data-i18n="tabStats">Stats</span></button>
      </div>
      <div class="app-tabs-more-wrap">
        <button type="button" class="app-tab app-tab-more" id="tab-more" aria-haspopup="true" aria-expanded="false" aria-label="" data-i18n-aria-label="tabsMoreLabel"><span class="app-tab-more-dots">⋯</span></button>
        <div class="app-tabs-menu" id="app-tabs-menu" role="menu" aria-label="" hidden>
          <button type="button" class="app-tabs-menu-item" role="menuitem" data-tab="dashboard" data-i18n="tabDashboard">Dashboard</button>
          <button type="button" class="app-tabs-menu-item" role="menuitem" data-tab="empire" data-i18n="tabBase">Empire</button>
          <button type="button" class="app-tabs-menu-item" role="menuitem" data-tab="research" data-i18n="tabResearch">Research</button>
          <button type="button" class="app-tabs-menu-item" role="menuitem" data-tab="upgrades" data-i18n="tabUpgrades">Upgrades</button>
          <button type="button" class="app-tabs-menu-item" role="menuitem" data-tab="stats" data-i18n="tabStats">Stats</button>
        </div>
      </div>
    </nav>
    <p class="keyboard-hint keyboard-hint--below-tabs" id="keyboard-hint" data-i18n-aria-label="keyboardShortcutsHint">
      <span class="key key--space" data-i18n="keyboardShortcutsSpaceKey">Space</span>
      <span class="keyboard-hint-text" data-i18n="keyboardShortcutsMine">to mine</span>
      <span class="keyboard-hint-sep" aria-hidden="true">·</span>
      <span class="key" aria-hidden="true">1</span><span class="key" aria-hidden="true">2</span><span class="key" aria-hidden="true">3</span><span class="key" aria-hidden="true">4</span><span class="key" aria-hidden="true">5</span><span class="key" aria-hidden="true">6</span>
      <span class="keyboard-hint-text" data-i18n="keyboardShortcutsTabs">switch tabs</span>
    </p>
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
      ${crewBlock}
      ${planetsBlock}
      ${prestigeBlock}
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
    <nav class="app-tabs-bottom" id="app-tabs-bottom" aria-label="Quick navigation" data-i18n-aria-label="gameSections">
      <button type="button" class="app-tab-bottom app-tab-bottom--active" role="tab" data-tab="mine" aria-selected="true"><span data-i18n="tabMine">Mine</span></button>
      <button type="button" class="app-tab-bottom" role="tab" data-tab="empire" aria-selected="false"><span data-i18n="tabBase">Empire</span></button>
      <div class="app-tabs-bottom-more-wrap">
        <button type="button" class="app-tab-bottom app-tab-bottom-more" id="tab-bottom-more" aria-haspopup="true" aria-expanded="false" data-i18n-aria-label="tabsMoreLabel"><span class="app-tab-more-dots">⋯</span></button>
        <div class="app-tabs-bottom-menu" id="app-tabs-bottom-menu" role="menu" aria-label="" hidden>
          <button type="button" class="app-tabs-bottom-menu-item" role="menuitem" data-tab="dashboard" data-i18n="tabDashboard">Dashboard</button>
          <button type="button" class="app-tabs-bottom-menu-item" role="menuitem" data-tab="research" data-i18n="tabResearch">Research</button>
          <button type="button" class="app-tabs-bottom-menu-item" role="menuitem" data-tab="upgrades" data-i18n="tabUpgrades">Upgrades</button>
          <button type="button" class="app-tabs-bottom-menu-item" role="menuitem" data-tab="stats" data-i18n="tabStats">Stats</button>
        </div>
      </div>
    </nav>
  `;
}

export function getAppHtml(): string {
  return [
    getHeaderHtml(),
    getModalsHtml(),
    getStatsHtml(),
    getTabsAndPanelsHtml(),
  ].join('\n');
}
