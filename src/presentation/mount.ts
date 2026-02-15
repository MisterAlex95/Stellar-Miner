import { createMineZoneCanvas } from './MineZoneCanvas.js';
import { getSettings, getEventContext, setSettings, setMineZoneCanvasApi } from '../application/gameState.js';
import { t, applyTranslations } from '../application/strings.js';
import {
  openSettings,
  closeSettings,
  applySettingsToUI,
  openResetConfirmModal,
  closeResetConfirmModal,
  handleResetProgress,
  openPrestigeConfirmModal,
  closePrestigeConfirmModal,
  confirmPrestige,
  handleMineClick,
  handleUpgradeBuy,
  handleUpgradeBuyMax,
  handleBuyNewPlanet,
  handleAddSlot,
  handleBuildHousing,
  handlePrestige,
  handleHireAstronaut,
  handleClaimQuest,
  startResearchWithProgress,
  handleExportSave,
  handleImportSave,
  openDebugMenu,
  closeDebugMenu,
  toggleDebugMenu,
  handleDebugAction,
  updateDebugPanel,
  renderAchievementsList,
} from '../application/handlers.js';
import { renderPrestigeSection } from './prestigeView.js';
import { renderCrewSection } from './crewView.js';
import { renderQuestSection } from './questView.js';
import { renderPlanetList } from './planetListView.js';
import { renderHousingSection } from './housingView.js';
import { renderResearchSection } from './researchView.js';
import { renderStatisticsSection } from './statisticsView.js';
import {
  bindIntroModal,
  updateProgressionVisibility,
  maybeShowWelcomeModal,
  isIntroOverlayOpen,
  dismissIntroModal,
} from './progressionView.js';
import { initTooltips } from './tooltip.js';

const TAB_STORAGE_KEY = 'stellar-miner-active-tab';
const DEFAULT_TAB = 'mine';

function isAnyModalOpen(): boolean {
  return (
    isIntroOverlayOpen() ||
    document.getElementById('settings-overlay')?.classList.contains('settings-overlay--open') === true ||
    document.getElementById('reset-confirm-overlay')?.classList.contains('reset-confirm-overlay--open') === true ||
    document.getElementById('prestige-confirm-overlay')?.classList.contains('prestige-confirm-overlay--open') === true
  );
}

export function switchTab(tabId: string): void {
  const tabs = document.querySelectorAll('.app-tab');
  const panels = document.querySelectorAll('.app-tab-panel');
  tabs.forEach((tab) => {
    const t = tab as HTMLElement;
    const isSelected = t.getAttribute('data-tab') === tabId;
    t.classList.toggle('app-tab--active', isSelected);
    t.setAttribute('aria-selected', String(isSelected));
  });
  panels.forEach((panel) => {
    const p = panel as HTMLElement;
    const isSelected = p.getAttribute('data-tab') === tabId;
    p.classList.toggle('app-tab-panel--active', isSelected);
    p.hidden = !isSelected;
  });
  try {
    localStorage.setItem(TAB_STORAGE_KEY, tabId);
  } catch {
    // ignore
  }
  if (tabId === 'research') renderResearchSection();
}

/** Apply layout mode: tabs (one panel at a time) or one-page (all sections stacked). */
export function applyLayout(): void {
  const layout = getSettings().layout;
  const tabsNav = document.querySelector('.app-tabs') as HTMLElement | null;
  const panels = document.querySelectorAll<HTMLElement>('.app-tab-panel');
  if (layout === 'one-page') {
    if (tabsNav) tabsNav.style.display = 'none';
    panels.forEach((p) => {
      p.style.display = 'block';
      p.hidden = false;
    });
  } else {
    if (tabsNav) tabsNav.style.display = '';
    const activeId =
      document.querySelector('.app-tab--active')?.getAttribute('data-tab') ||
      localStorage.getItem(TAB_STORAGE_KEY) ||
      DEFAULT_TAB;
    const validId = ['mine', 'base', 'research', 'upgrades', 'stats'].includes(activeId) ? activeId : DEFAULT_TAB;
    switchTab(validId);
  }
}

const APP_HTML = `
    <div class="offline-banner" id="offline-banner" aria-live="polite" aria-hidden="true" role="status" hidden data-i18n="offlineIndicator">You are offline. Progress may not be saved.</div>
    <header>
      <div class="header-row">
        <div>
          <h1 data-i18n="appTitle">STELLAR MINER</h1>
          <p class="subtitle" data-i18n="appSubtitle">Mine coins. Buy upgrades. Conquer the belt.</p>
        </div>
        <button type="button" class="settings-btn" id="settings-btn" data-i18n-title="settings" data-i18n-aria-label="openSettings">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-1.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h1.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v1.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-1.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
      </div>
    </header>
    <div class="settings-overlay" id="settings-overlay" aria-hidden="true">
      <div class="settings-modal" role="dialog" aria-labelledby="settings-title">
        <div class="settings-header">
          <h2 id="settings-title" data-i18n="settings">Settings</h2>
          <button type="button" class="settings-close" id="settings-close" data-i18n-aria-label="close">×</button>
        </div>
        <div class="settings-body">
          <div class="settings-option">
            <label for="setting-language" data-i18n="language">Language</label>
            <select id="setting-language" aria-label="Language">
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
            <select id="setting-layout" aria-label="Layout mode">
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
            <label for="setting-theme" data-i18n="theme">Theme</label>
            <select id="setting-theme" aria-label="Theme">
              <option value="dark" data-i18n="themeDark">Dark</option>
              <option value="light" data-i18n="themeLight">Light</option>
            </select>
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
          <div class="settings-option settings-save-export">
            <div class="settings-save-buttons">
              <button type="button" class="settings-export-btn" id="settings-export-btn" title="Copy save to clipboard and download as file" data-i18n="exportSave">Export save</button>
              <button type="button" class="settings-import-btn" id="settings-import-btn" title="Load a previously exported save (replaces current)" data-i18n="importSave">Import save</button>
            </div>
            <input type="file" id="settings-import-file" accept=".json,application/json" class="settings-import-file" aria-hidden="true" />
          </div>
          <div class="settings-option settings-achievements">
            <button type="button" class="achievements-toggle-btn" id="achievements-toggle-btn" aria-expanded="false" data-i18n="achievements">Achievements</button>
            <div class="achievements-list" id="achievements-list" aria-hidden="true"></div>
          </div>
          <div class="settings-option settings-reset">
            <button type="button" class="reset-btn" id="settings-reset-btn" data-i18n="resetProgress">Reset progress</button>
          </div>
        </div>
      </div>
    </div>
    <div class="reset-confirm-overlay" id="reset-confirm-overlay" aria-hidden="true">
      <div class="reset-confirm-modal" role="alertdialog" aria-labelledby="reset-confirm-title" aria-describedby="reset-confirm-desc">
        <h2 id="reset-confirm-title" data-i18n="resetConfirmTitle">Reset progress?</h2>
        <p id="reset-confirm-desc" data-i18n="resetConfirmDesc">Coins, planets, upgrades, crew, achievements and all progress will be lost. This cannot be undone.</p>
        <div class="reset-confirm-actions">
          <button type="button" class="reset-confirm-cancel" id="reset-confirm-cancel" data-i18n="cancel">Cancel</button>
          <button type="button" class="reset-confirm-reset" id="reset-confirm-reset" data-i18n="resetAll">Reset all</button>
        </div>
      </div>
    </div>
    <div class="prestige-confirm-overlay" id="prestige-confirm-overlay" aria-hidden="true">
      <div class="prestige-confirm-modal" role="alertdialog" aria-labelledby="prestige-confirm-title" aria-describedby="prestige-confirm-desc">
        <h2 id="prestige-confirm-title" data-i18n="prestigeConfirmTitle">Prestige?</h2>
        <p id="prestige-confirm-desc" data-i18n="prestigeConfirmDesc">You'll reset to 0 coins and 1 planet. You keep your new Prestige level and +5% production per level forever.</p>
        <div class="prestige-confirm-actions">
          <button type="button" class="prestige-confirm-cancel" id="prestige-confirm-cancel" data-i18n="cancel">Cancel</button>
          <button type="button" class="prestige-confirm-do" id="prestige-confirm-do" data-i18n="prestige">Prestige</button>
        </div>
      </div>
    </div>
    <div class="intro-overlay" id="intro-overlay" aria-hidden="true">
      <div class="intro-modal" role="dialog" aria-labelledby="intro-title" aria-describedby="intro-body">
        <h2 id="intro-title"></h2>
        <p id="intro-body"></p>
        <div class="intro-progress-wrap" id="intro-progress-wrap" aria-hidden="true">
          <div class="intro-progress-bar" id="intro-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></div>
        </div>
        <button type="button" class="intro-got-it" id="intro-got-it" data-i18n="gotIt">Got it</button>
      </div>
    </div>
    <section class="stats">
      <div class="stat-card stat-card--coins" id="coins-stat-card" data-i18n-title="coinsTitle">
        <div class="stat-label" data-i18n="coins">Coins</div>
        <div class="stat-value stat-value--hero" id="coins-value">0</div>
        <div class="stat-coins-extra" id="crew-stat-line" aria-live="polite"></div>
      </div>
      <div class="stat-card stat-card--production" id="production-stat-card" data-i18n-title="productionTitle">
        <div class="stat-label"><span data-i18n="production">Production</span> <span class="production-live" id="production-live" aria-hidden="true"></span></div>
        <div class="stat-value" id="production-value">0/s</div>
        <div class="stat-breakdown" id="production-breakdown" aria-hidden="true"></div>
        <div class="active-events" id="active-events" aria-live="polite"></div>
        <div class="next-event-progress-wrap" id="next-event-progress-wrap" aria-hidden="true">
          <div class="next-event-progress-bar" id="next-event-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
        <div class="next-event-countdown" id="next-event-countdown" aria-live="polite"></div>
      </div>
    </section>
    <p class="next-milestone" id="next-milestone" aria-live="polite"></p>
    <div class="event-toasts" id="event-toasts" aria-live="polite"></div>
    <nav class="app-tabs" role="tablist" data-i18n-aria-label="gameSections">
      <button type="button" class="app-tab app-tab--active" role="tab" id="tab-mine" aria-selected="true" aria-controls="panel-mine" data-tab="mine" data-i18n="tabMine">Mine</button>
      <button type="button" class="app-tab" role="tab" id="tab-base" aria-selected="false" aria-controls="panel-base" data-tab="base" data-i18n="tabBase">Base</button>
      <button type="button" class="app-tab" role="tab" id="tab-research" aria-selected="false" aria-controls="panel-research" data-tab="research" data-i18n="tabResearch">Research</button>
      <button type="button" class="app-tab" role="tab" id="tab-upgrades" aria-selected="false" aria-controls="panel-upgrades" data-tab="upgrades" data-i18n="tabUpgrades">Upgrades</button>
      <button type="button" class="app-tab" role="tab" id="tab-stats" aria-selected="false" aria-controls="panel-stats" data-tab="stats" data-i18n="tabStats">Stats</button>
    </nav>
    <div class="app-tab-panel app-tab-panel--active" id="panel-mine" role="tabpanel" aria-labelledby="tab-mine" data-tab="mine">
      <section class="mine-zone" id="mine-zone" data-i18n-title="mineZoneTitle">
        <div class="mine-zone-floats" id="mine-zone-floats" aria-hidden="true"></div>
        <div class="mine-zone-visual" id="mine-zone-visual"></div>
        <p class="mine-zone-hint" aria-hidden="true" data-i18n="mineZoneTitle"></p>
        <span class="combo-indicator" id="combo-indicator" aria-live="polite"></span>
      </section>
      <section class="gameplay-block gameplay-block--locked quest-section" id="quest-section" data-block="quest">
        <div class="gameplay-block-header">
          <h2 data-i18n="quest">Quest</h2>
          <button type="button" class="gameplay-block-toggle" aria-expanded="true" aria-label="Collapse" title="Collapse"><span class="gameplay-block-toggle-icon" aria-hidden="true">▼</span></button>
        </div>
        <div class="gameplay-block-body">
          <div class="quest-progress-wrap">
            <div class="quest-progress-bar" id="quest-progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
          </div>
          <p class="quest-progress" id="quest-progress"></p>
          <p class="quest-streak-hint" id="quest-streak-hint" aria-live="polite"></p>
          <span class="btn-tooltip-wrap" id="quest-claim-wrap"><button type="button" class="quest-claim-btn" id="quest-claim" disabled data-i18n="claim">Claim</button></span>
        </div>
      </section>
    </div>
    <div class="app-tab-panel" id="panel-base" role="tabpanel" aria-labelledby="tab-base" data-tab="base" hidden>
      <section class="gameplay-block gameplay-block--locked crew-section" id="crew-section" data-block="crew">
        <div class="gameplay-block-header">
          <h2 data-i18n="crew">Crew</h2>
          <button type="button" class="gameplay-block-toggle" aria-expanded="true" aria-label="Collapse" title="Collapse"><span class="gameplay-block-toggle-icon" aria-hidden="true">▼</span></button>
        </div>
        <div class="gameplay-block-body">
          <p class="crew-hint" data-i18n="crewHint">Hire astronauts for +2% production each. Upgrades cost coins and astronauts (crew is assigned to operate the equipment). Resets on Prestige.</p>
          <div class="crew-count" id="crew-count">No crew yet</div>
          <div class="crew-operates" id="crew-operates"></div>
          <span class="btn-tooltip-wrap" id="hire-astronaut-wrap"><button type="button" class="hire-astronaut-btn" id="hire-astronaut-btn">Hire astronaut</button></span>
        </div>
      </section>
      <section class="gameplay-block gameplay-block--locked planets-section" id="planets-section" data-block="planets">
        <div class="gameplay-block-header">
          <h2 data-i18n="planets">Planets</h2>
          <button type="button" class="gameplay-block-toggle" aria-expanded="true" aria-label="Collapse" title="Collapse"><span class="gameplay-block-toggle-icon" aria-hidden="true">▼</span></button>
        </div>
        <div class="gameplay-block-body">
          <p class="planets-hint" data-i18n="planetsHint">Each planet has upgrade slots (expandable). More planets = +5% production each. Send astronauts on an expedition to discover a new planet (some may die); if all survive or at least one returns, you discover it. Add slots to expand.</p>
          <div class="planet-list" id="planet-list"></div>
          <span class="btn-tooltip-wrap" id="buy-planet-wrap"><button type="button" class="buy-planet-btn" id="buy-planet-btn">Send expedition</button></span>
        </div>
      </section>
      <section class="gameplay-block gameplay-block--locked housing-section" id="housing-section" data-block="planets">
        <div class="gameplay-block-header">
          <h2 data-i18n="housing">Housing</h2>
          <button type="button" class="gameplay-block-toggle" aria-expanded="true" aria-label="Collapse" title="Collapse"><span class="gameplay-block-toggle-icon" aria-hidden="true">▼</span></button>
        </div>
        <div class="gameplay-block-body">
          <p class="housing-hint" data-i18n="housingHint">Build housing on a planet to increase crew capacity (+2 astronauts per module). Each module uses 1 slot on that planet.</p>
          <div class="housing-list" id="housing-list"></div>
        </div>
      </section>
      <section class="gameplay-block gameplay-block--locked prestige-section" id="prestige-section" data-block="prestige">
        <div class="gameplay-block-header">
          <h2 data-i18n="prestige">Prestige</h2>
          <button type="button" class="gameplay-block-toggle" aria-expanded="true" aria-label="Collapse" title="Collapse"><span class="gameplay-block-toggle-icon" aria-hidden="true">▼</span></button>
        </div>
        <div class="gameplay-block-body">
          <p class="prestige-hint" data-i18n="prestigeHint">Reset coins and planets to gain +5% production per prestige level forever.</p>
          <div class="prestige-status" id="prestige-status"></div>
          <span class="btn-tooltip-wrap" id="prestige-btn-wrap"><button type="button" class="prestige-btn" id="prestige-btn" disabled>Prestige</button></span>
        </div>
      </section>
    </div>
    <div class="app-tab-panel" id="panel-research" role="tabpanel" aria-labelledby="tab-research" data-tab="research" hidden>
      <section class="gameplay-block gameplay-block--locked research-section" id="research-section" data-block="research">
        <div class="gameplay-block-header">
          <h2 data-i18n="research">Scientific Research</h2>
          <button type="button" class="gameplay-block-toggle" aria-expanded="true" aria-label="Collapse" title="Collapse"><span class="gameplay-block-toggle-icon" aria-hidden="true">▼</span></button>
        </div>
        <div class="gameplay-block-body">
          <p class="research-hint" data-i18n="researchHint">Skill tree: attempt to unlock nodes for +% production and +% click. Each attempt has a success chance; on failure coins are lost. Resets on Prestige.</p>
          <div class="research-list" id="research-list"></div>
        </div>
      </section>
    </div>
    <div class="app-tab-panel" id="panel-upgrades" role="tabpanel" aria-labelledby="tab-upgrades" data-tab="upgrades" hidden>
      <section class="gameplay-block gameplay-block--locked upgrades-section" id="upgrades-section" data-block="upgrades">
        <div class="gameplay-block-header">
          <h2 data-i18n="upgrades">Upgrades</h2>
          <button type="button" class="gameplay-block-toggle" aria-expanded="true" aria-label="Collapse" title="Collapse"><span class="gameplay-block-toggle-icon" aria-hidden="true">▼</span></button>
        </div>
        <div class="gameplay-block-body">
          <p class="upgrades-hint" data-i18n="upgradesHint">You can buy each upgrade multiple times; production stacks. Assigns to a planet with a free slot.</p>
          <div class="upgrade-list" id="upgrade-list"></div>
        </div>
      </section>
    </div>
    <div class="app-tab-panel" id="panel-stats" role="tabpanel" aria-labelledby="tab-stats" data-tab="stats" hidden>
      <section class="gameplay-block gameplay-block--unlocked statistics-section" id="statistics-section">
        <div class="gameplay-block-header">
          <h2 data-i18n="statisticsTitle">Statistics</h2>
          <button type="button" class="gameplay-block-toggle" aria-expanded="true" aria-label="Collapse" title="Collapse"><span class="gameplay-block-toggle-icon" aria-hidden="true">▼</span></button>
        </div>
        <div class="gameplay-block-body">
          <div id="statistics-container"></div>
        </div>
      </section>
    </div>
  `;

function applyThemeAndMotion(): void {
  const s = getSettings();
  const root = document.documentElement;
  root.setAttribute('data-theme', s.theme);
  root.setAttribute('data-reduced-motion', s.reducedMotion ? 'true' : 'false');
}

export function mount(): void {
  const app = document.getElementById('app');
  if (!app) return;
  applyThemeAndMotion();
  app.innerHTML = APP_HTML;
  applyTranslations();

  const COLLAPSED_STORAGE_PREFIX = 'stellar-miner-collapsed-';
  const COLLAPSIBLE_SECTION_IDS = [
    'quest-section', 'crew-section', 'planets-section', 'housing-section',
    'prestige-section', 'research-section', 'upgrades-section', 'statistics-section',
  ];

  function initCollapsedState(): void {
    COLLAPSIBLE_SECTION_IDS.forEach((id) => {
      const section = document.getElementById(id);
      const btn = section?.querySelector('.gameplay-block-toggle') as HTMLElement | null;
      if (!section || !btn) return;
      const isCollapsed = typeof localStorage !== 'undefined' && localStorage.getItem(COLLAPSED_STORAGE_PREFIX + id) === '1';
      if (isCollapsed) {
        section.classList.add('gameplay-block--collapsed');
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('title', t('expandSection'));
        btn.setAttribute('aria-label', t('expandSection'));
      } else {
        btn.setAttribute('title', t('collapseSection'));
        btn.setAttribute('aria-label', t('collapseSection'));
      }
    });
  }

  function onCollapseToggle(e: Event): void {
    const target = (e.target as HTMLElement).closest('.gameplay-block-toggle');
    if (!target) return;
    const section = (target as HTMLElement).closest('.gameplay-block');
    if (!section || !section.id) return;
    const isCollapsed = section.classList.toggle('gameplay-block--collapsed');
    (target as HTMLElement).setAttribute('aria-expanded', String(!isCollapsed));
    (target as HTMLElement).setAttribute('title', isCollapsed ? t('expandSection') : t('collapseSection'));
    (target as HTMLElement).setAttribute('aria-label', isCollapsed ? t('expandSection') : t('collapseSection'));
    try {
      localStorage.setItem(COLLAPSED_STORAGE_PREFIX + section.id, isCollapsed ? '1' : '0');
    } catch {
      // ignore
    }
  }

  initCollapsedState();
  app.addEventListener('click', onCollapseToggle);

  const settings = getSettings();
  const mineZoneVisual = document.getElementById('mine-zone-visual');
  if (mineZoneVisual) {
    setMineZoneCanvasApi(createMineZoneCanvas(mineZoneVisual, getSettings, getEventContext));
  }

  const settingsBtn = document.getElementById('settings-btn');
  const settingsOverlay = document.getElementById('settings-overlay');
  const settingsClose = document.getElementById('settings-close');
  if (settingsBtn && settingsOverlay) {
    settingsBtn.addEventListener('click', openSettings);
    settingsOverlay.addEventListener('click', (e) => {
      if (e.target === settingsOverlay) closeSettings();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const openOverlay = settingsOverlay.classList.contains('settings-overlay--open')
          ? settingsOverlay
          : document.getElementById('reset-confirm-overlay')?.classList.contains('reset-confirm-overlay--open')
            ? document.getElementById('reset-confirm-overlay')
            : document.getElementById('prestige-confirm-overlay')?.classList.contains('prestige-confirm-overlay--open')
              ? document.getElementById('prestige-confirm-overlay')
              : null;
        if (openOverlay) {
          const focusable = openOverlay.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
          const list = Array.from(focusable).filter((el) => el.offsetParent !== null);
          if (list.length === 0) return;
          const i = list.indexOf(document.activeElement as HTMLElement);
          if (e.shiftKey) {
            if (i <= 0) {
              e.preventDefault();
              list[list.length - 1].focus();
            }
          } else {
            if (i === -1 || i >= list.length - 1) {
              e.preventDefault();
              list[0].focus();
            }
          }
        }
        return;
      }
      if (e.key !== 'Escape') return;
      const resetOverlay = document.getElementById('reset-confirm-overlay');
      const prestigeOverlay = document.getElementById('prestige-confirm-overlay');
      if (resetOverlay?.classList.contains('reset-confirm-overlay--open')) closeResetConfirmModal();
      else if (prestigeOverlay?.classList.contains('prestige-confirm-overlay--open')) closePrestigeConfirmModal();
      else if (isIntroOverlayOpen()) dismissIntroModal();
      else if (settingsOverlay.classList.contains('settings-overlay--open')) closeSettings();
    });
  }
  if (settingsClose) settingsClose.addEventListener('click', closeSettings);

  const starfieldSpeedEl = document.getElementById('setting-starfield-speed') as HTMLSelectElement | null;
  const orbitLinesEl = document.getElementById('setting-orbit-lines') as HTMLInputElement | null;
  const clickParticlesEl = document.getElementById('setting-click-particles') as HTMLInputElement | null;
  const compactNumbersEl = document.getElementById('setting-compact-numbers') as HTMLInputElement | null;
  const spaceKeyRepeatEl = document.getElementById('setting-space-key-repeat') as HTMLInputElement | null;
  const layoutEl = document.getElementById('setting-layout') as HTMLSelectElement | null;
  const pauseBackgroundEl = document.getElementById('setting-pause-background') as HTMLInputElement | null;
  const themeEl = document.getElementById('setting-theme') as HTMLSelectElement | null;
  const languageEl = document.getElementById('setting-language') as HTMLSelectElement | null;
  const soundEl = document.getElementById('setting-sound') as HTMLInputElement | null;
  const reducedMotionEl = document.getElementById('setting-reduced-motion') as HTMLInputElement | null;
  if (starfieldSpeedEl) starfieldSpeedEl.value = String(settings.starfieldSpeed);
  if (orbitLinesEl) orbitLinesEl.checked = settings.showOrbitLines;
  if (clickParticlesEl) clickParticlesEl.checked = settings.clickParticles;
  if (compactNumbersEl) compactNumbersEl.checked = settings.compactNumbers;
  if (spaceKeyRepeatEl) spaceKeyRepeatEl.checked = settings.spaceKeyRepeat;
  if (layoutEl) layoutEl.value = settings.layout;
  if (pauseBackgroundEl) pauseBackgroundEl.checked = settings.pauseWhenBackground;
  if (themeEl) themeEl.value = settings.theme;
  if (languageEl) languageEl.value = settings.language;
  if (soundEl) soundEl.checked = settings.soundEnabled;
  if (reducedMotionEl) reducedMotionEl.checked = settings.reducedMotion;
  if (starfieldSpeedEl) starfieldSpeedEl.addEventListener('change', () => {
    const s = getSettings();
    s.starfieldSpeed = Number(starfieldSpeedEl.value);
    setSettings(s);
  });
  if (orbitLinesEl) orbitLinesEl.addEventListener('change', () => {
    const s = getSettings();
    s.showOrbitLines = orbitLinesEl.checked;
    setSettings(s);
  });
  if (clickParticlesEl) clickParticlesEl.addEventListener('change', () => {
    const s = getSettings();
    s.clickParticles = clickParticlesEl.checked;
    setSettings(s);
  });
  if (compactNumbersEl) compactNumbersEl.addEventListener('change', () => {
    const s = getSettings();
    s.compactNumbers = compactNumbersEl.checked;
    setSettings(s);
    applySettingsToUI();
  });
  if (spaceKeyRepeatEl) spaceKeyRepeatEl.addEventListener('change', () => {
    const s = getSettings();
    s.spaceKeyRepeat = spaceKeyRepeatEl.checked;
    setSettings(s);
  });
  if (layoutEl) layoutEl.addEventListener('change', () => {
    const s = getSettings();
    s.layout = layoutEl.value as 'tabs' | 'one-page';
    setSettings(s);
    applyLayout();
  });
  if (pauseBackgroundEl) pauseBackgroundEl.addEventListener('change', () => {
    const s = getSettings();
    s.pauseWhenBackground = pauseBackgroundEl.checked;
    setSettings(s);
  });
  if (themeEl) themeEl.addEventListener('change', () => {
    const s = getSettings();
    s.theme = themeEl.value as 'light' | 'dark';
    setSettings(s);
    applyThemeAndMotion();
  });
  if (languageEl) languageEl.addEventListener('change', () => {
    const s = getSettings();
    s.language = languageEl.value as 'en' | 'fr';
    setSettings(s);
    applyTranslations();
    applySettingsToUI();
  });
  if (soundEl) soundEl.addEventListener('change', () => {
    const s = getSettings();
    s.soundEnabled = soundEl.checked;
    setSettings(s);
  });
  if (reducedMotionEl) reducedMotionEl.addEventListener('change', () => {
    const s = getSettings();
    s.reducedMotion = reducedMotionEl.checked;
    setSettings(s);
    applyThemeAndMotion();
  });

  const exportBtn = document.getElementById('settings-export-btn');
  const importBtn = document.getElementById('settings-import-btn');
  const importFileEl = document.getElementById('settings-import-file') as HTMLInputElement | null;
  if (exportBtn) exportBtn.addEventListener('click', handleExportSave);
  if (importBtn) importBtn.addEventListener('click', () => importFileEl?.click());
  if (importFileEl) {
    importFileEl.addEventListener('change', async (e: Event) => {
      const input = e.target as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      const ok = await handleImportSave(text);
      input.value = '';
      if (ok) location.reload();
      else alert(t('invalidSaveFile'));
    });
  }

  const resetBtn = document.getElementById('settings-reset-btn');
  if (resetBtn) resetBtn.addEventListener('click', openResetConfirmModal);

  const resetConfirmCancel = document.getElementById('reset-confirm-cancel');
  const resetConfirmReset = document.getElementById('reset-confirm-reset');
  const resetConfirmOverlay = document.getElementById('reset-confirm-overlay');
  if (resetConfirmCancel) resetConfirmCancel.addEventListener('click', closeResetConfirmModal);
  if (resetConfirmReset) resetConfirmReset.addEventListener('click', handleResetProgress);
  if (resetConfirmOverlay) {
    resetConfirmOverlay.addEventListener('click', (e) => { if (e.target === resetConfirmOverlay) closeResetConfirmModal(); });
  }

  const prestigeConfirmCancel = document.getElementById('prestige-confirm-cancel');
  const prestigeConfirmDo = document.getElementById('prestige-confirm-do');
  const prestigeConfirmOverlay = document.getElementById('prestige-confirm-overlay');
  if (prestigeConfirmCancel) prestigeConfirmCancel.addEventListener('click', closePrestigeConfirmModal);
  if (prestigeConfirmDo) prestigeConfirmDo.addEventListener('click', confirmPrestige);
  if (prestigeConfirmOverlay) {
    prestigeConfirmOverlay.addEventListener('click', (e) => { if (e.target === prestigeConfirmOverlay) closePrestigeConfirmModal(); });
  }

  const achievementsToggle = document.getElementById('achievements-toggle-btn');
  const achievementsList = document.getElementById('achievements-list');
  if (achievementsToggle && achievementsList) {
    achievementsToggle.addEventListener('click', () => {
      const isOpen = achievementsList.getAttribute('aria-hidden') !== 'true';
      achievementsList.setAttribute('aria-hidden', String(isOpen));
      achievementsToggle.setAttribute('aria-expanded', String(!isOpen));
      achievementsList.classList.toggle('achievements-list--open', !isOpen);
      if (!isOpen) renderAchievementsList(achievementsList);
    });
  }

  const mineZone = document.getElementById('mine-zone');
  if (mineZone) {
    mineZone.addEventListener('click', (e: Event) => handleMineClick(e as MouseEvent));
    mineZone.addEventListener('mousedown', () => mineZone.classList.add('mine-zone--active'));
    mineZone.addEventListener('mouseup', () => mineZone.classList.remove('mine-zone--active'));
    mineZone.addEventListener('mouseleave', () => mineZone.classList.remove('mine-zone--active'));
  }

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.code !== 'Space') return;
    if (isAnyModalOpen()) {
      e.preventDefault();
      return;
    }
    const target = e.target as HTMLElement;
    if (target?.closest('input, select, textarea, [role="dialog"]')) return;
    e.preventDefault();
    mineZone?.classList.add('mine-zone--active');
    const allowRepeat = getSettings().spaceKeyRepeat;
    if (!e.repeat || allowRepeat) handleMineClick();
  });
  document.addEventListener('keyup', (e: KeyboardEvent) => {
    if (e.code !== 'Space') return;
    document.getElementById('mine-zone')?.classList.remove('mine-zone--active');
  });

  const buyPlanetBtn = document.getElementById('buy-planet-btn');
  if (buyPlanetBtn) buyPlanetBtn.addEventListener('click', handleBuyNewPlanet);

  const planetList = document.getElementById('planet-list');
  if (planetList) {
    planetList.addEventListener('click', (e: Event) => {
      const btn = (e.target as HTMLElement).closest('.add-slot-btn');
      if (btn) {
        const id = btn.getAttribute('data-planet-id');
        if (id) handleAddSlot(id);
      }
    });
  }

  const prestigeBtn = document.getElementById('prestige-btn');
  if (prestigeBtn) prestigeBtn.addEventListener('click', handlePrestige);

  const hireAstronautBtn = document.getElementById('hire-astronaut-btn');
  if (hireAstronautBtn) hireAstronautBtn.addEventListener('click', handleHireAstronaut);

  bindIntroModal();
  updateProgressionVisibility();
  renderPrestigeSection();
  renderCrewSection();
  renderQuestSection();

  const claimBtn = document.getElementById('quest-claim');
  if (claimBtn) claimBtn.addEventListener('click', handleClaimQuest);

  if (!document.getElementById('debug-panel')) {
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.className = 'debug-panel debug-panel--closed';
    debugPanel.setAttribute('aria-hidden', 'true');
    debugPanel.innerHTML = `
      <div class="debug-panel-header">
        <span data-i18n="debug">Debug</span>
        <button type="button" class="debug-close" id="debug-close" data-i18n-aria-label="closeDebug">×</button>
      </div>
      <div class="debug-panel-body">
        <div class="debug-section" id="debug-stats"></div>
        <div class="debug-section">
          <div class="debug-actions">
            <button type="button" class="debug-btn" data-debug="coins-1k">+1K coins</button>
            <button type="button" class="debug-btn" data-debug="coins-50k">+50K coins</button>
            <button type="button" class="debug-btn" data-debug="trigger-event" data-i18n="debugTriggerEvent">Trigger event</button>
            <button type="button" class="debug-btn" data-debug="clear-events" data-i18n="debugClearEvents">Clear events</button>
          </div>
        </div>
      </div>
      <p class="debug-hint" data-i18n="debugF3Hint">F3 to toggle</p>
    `;
    document.body.appendChild(debugPanel);
    applyTranslations();
    document.getElementById('debug-close')?.addEventListener('click', closeDebugMenu);
    debugPanel.querySelectorAll('.debug-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = (btn as HTMLElement).getAttribute('data-debug');
        if (action) handleDebugAction(action);
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F3') {
        e.preventDefault();
        toggleDebugMenu();
      }
    });
  }

  const upgradeList = document.getElementById('upgrade-list');
  if (upgradeList) {
    upgradeList.addEventListener('click', (e: Event) => {
      const target = (e.target as HTMLElement).closest('button.upgrade-btn');
      if (!target || target.hasAttribute('disabled')) return;
      e.preventDefault();
      const upgradeId = target.getAttribute('data-upgrade-id');
      if (!upgradeId) return;
      const card = target.closest('.upgrade-card');
      const select = card?.querySelector('.upgrade-planet-select') as HTMLSelectElement | null;
      const planetId = select?.value || undefined;
      if (target.getAttribute('data-action') === 'max') {
        handleUpgradeBuyMax(upgradeId, planetId);
      } else {
        handleUpgradeBuy(upgradeId, planetId);
      }
    });
  }

  renderPlanetList();
  renderHousingSection();
  renderResearchSection();

  const housingList = document.getElementById('housing-list');
  if (housingList) {
    housingList.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.build-housing-btn');
      if (!btn || (btn as HTMLButtonElement).disabled) return;
      const planetId = (btn as HTMLElement).getAttribute('data-planet-id');
      if (!planetId) return;
      handleBuildHousing(planetId);
    });
  }

  const researchList = document.getElementById('research-list');
  if (researchList) {
    researchList.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.research-attempt-btn');
      if (!btn || (btn as HTMLButtonElement).disabled) return;
      const id = (btn as HTMLElement).getAttribute('data-research-id');
      if (!id) return;
      const card = btn.closest('.research-card');
      if (card) startResearchWithProgress(card as HTMLElement, id);
    });
    researchList.addEventListener('mouseenter', (e) => {
      const card = (e.target as HTMLElement).closest('.research-card');
      if (!card) return;
      researchList.querySelectorAll('.research-card--path-highlight').forEach((el) => {
        el.classList.remove('research-card--path-highlight');
      });
      const path = card.getAttribute('data-unlock-path');
      if (!path) return;
      const ids = path.split(',').map((s) => s.trim()).filter(Boolean);
      ids.forEach((id) => {
        const el = researchList.querySelector(`[data-research-id="${id}"]`);
        if (el) el.classList.add('research-card--path-highlight');
      });
    }, true);
    researchList.addEventListener('mouseleave', () => {
      researchList.querySelectorAll('.research-card--path-highlight').forEach((el) => {
        el.classList.remove('research-card--path-highlight');
      });
    }, true);
  }

  const statisticsContainer = document.getElementById('statistics-container');
  if (statisticsContainer) {
    renderStatisticsSection(statisticsContainer);
  }

  document.querySelectorAll('.app-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabId = (tab as HTMLElement).getAttribute('data-tab');
      if (tabId) switchTab(tabId);
    });
  });
  document.addEventListener('keydown', (e) => {
    const key = e.key;
    if (key !== '1' && key !== '2' && key !== '3' && key !== '4' && key !== '5') return;
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.closest('[role="dialog"]'))) return;
    const tabs = Array.from(document.querySelectorAll<HTMLElement>('.app-tab')).filter((t) => (t as HTMLElement).offsetParent !== null);
    const idx = parseInt(key, 10) - 1;
    const tabEl = tabs[idx];
    if (!tabEl) return;
    const tabId = tabEl.getAttribute('data-tab');
    if (tabId) switchTab(tabId);
  });
  const savedTab =
    (typeof localStorage !== 'undefined' && localStorage.getItem(TAB_STORAGE_KEY)) || DEFAULT_TAB;
  const validTab = ['mine', 'base', 'research', 'upgrades', 'stats'].includes(savedTab) ? savedTab : DEFAULT_TAB;
  switchTab(validTab);
  applyLayout();

  const offlineBanner = document.getElementById('offline-banner');
  function updateOfflineBanner(): void {
    if (!offlineBanner) return;
    const offline = typeof navigator !== 'undefined' && !navigator.onLine;
    offlineBanner.hidden = !offline;
    offlineBanner.setAttribute('aria-hidden', String(!offline));
    if (offline) offlineBanner.textContent = t('offlineIndicator');
  }
  updateOfflineBanner();
  window.addEventListener('online', updateOfflineBanner);
  window.addEventListener('offline', updateOfflineBanner);

  initTooltips();
}
