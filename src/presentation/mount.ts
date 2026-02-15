import { createMineZoneCanvas } from './MineZoneCanvas.js';
import { getSettings, getEventContext, setSettings, setMineZoneCanvasApi } from '../application/gameState.js';
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
  handlePrestige,
  handleHireAstronaut,
  handleClaimQuest,
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
import {
  bindIntroModal,
  updateProgressionVisibility,
  maybeShowWelcomeModal,
  isIntroOverlayOpen,
  dismissIntroModal,
} from './progressionView.js';

const APP_HTML = `
    <header>
      <div class="header-row">
        <div>
          <h1>STELLAR MINER</h1>
          <p class="subtitle">Mine coins. Buy upgrades. Conquer the belt.</p>
        </div>
        <button type="button" class="settings-btn" id="settings-btn" title="Settings" aria-label="Open settings">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-1.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h1.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v1.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-1.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
      </div>
    </header>
    <div class="settings-overlay" id="settings-overlay" aria-hidden="true">
      <div class="settings-modal" role="dialog" aria-labelledby="settings-title">
        <div class="settings-header">
          <h2 id="settings-title">Settings</h2>
          <button type="button" class="settings-close" id="settings-close" aria-label="Close">×</button>
        </div>
        <div class="settings-body">
          <div class="settings-option">
            <label for="setting-starfield-speed">Starfield speed</label>
            <select id="setting-starfield-speed">
              <option value="0.5">Slow</option>
              <option value="1" selected>Normal</option>
              <option value="1.5">Fast</option>
            </select>
          </div>
          <div class="settings-option">
            <label class="settings-toggle">
              <input type="checkbox" id="setting-orbit-lines" checked />
              <span>Show orbit lines</span>
            </label>
          </div>
          <div class="settings-option">
            <label class="settings-toggle">
              <input type="checkbox" id="setting-click-particles" checked />
              <span>Click particles</span>
            </label>
          </div>
          <div class="settings-option">
            <label class="settings-toggle">
              <input type="checkbox" id="setting-compact-numbers" checked />
              <span>Compact numbers (1.2K)</span>
            </label>
          </div>
          <div class="settings-option">
            <label class="settings-toggle">
              <input type="checkbox" id="setting-space-key-repeat" />
              <span>Allow Space key repeat (hold to mine)</span>
            </label>
          </div>
          <div class="settings-option settings-achievements">
            <button type="button" class="achievements-toggle-btn" id="achievements-toggle-btn" aria-expanded="false">Achievements</button>
            <div class="achievements-list" id="achievements-list" aria-hidden="true"></div>
          </div>
          <div class="settings-option settings-reset">
            <button type="button" class="reset-btn" id="settings-reset-btn">Reset progress</button>
          </div>
        </div>
      </div>
    </div>
    <div class="reset-confirm-overlay" id="reset-confirm-overlay" aria-hidden="true">
      <div class="reset-confirm-modal" role="alertdialog" aria-labelledby="reset-confirm-title" aria-describedby="reset-confirm-desc">
        <h2 id="reset-confirm-title">Reset progress?</h2>
        <p id="reset-confirm-desc">Coins, planets, upgrades, crew, achievements and all progress will be lost. This cannot be undone.</p>
        <div class="reset-confirm-actions">
          <button type="button" class="reset-confirm-cancel" id="reset-confirm-cancel">Cancel</button>
          <button type="button" class="reset-confirm-reset" id="reset-confirm-reset">Reset all</button>
        </div>
      </div>
    </div>
    <div class="prestige-confirm-overlay" id="prestige-confirm-overlay" aria-hidden="true">
      <div class="prestige-confirm-modal" role="alertdialog" aria-labelledby="prestige-confirm-title" aria-describedby="prestige-confirm-desc">
        <h2 id="prestige-confirm-title">Prestige?</h2>
        <p id="prestige-confirm-desc">You'll reset to 0 coins and 1 planet. You keep your new Prestige level and +5% production per level forever.</p>
        <div class="prestige-confirm-actions">
          <button type="button" class="prestige-confirm-cancel" id="prestige-confirm-cancel">Cancel</button>
          <button type="button" class="prestige-confirm-do" id="prestige-confirm-do">Prestige</button>
        </div>
      </div>
    </div>
    <div class="intro-overlay" id="intro-overlay" aria-hidden="true">
      <div class="intro-modal" role="dialog" aria-labelledby="intro-title" aria-describedby="intro-body">
        <h2 id="intro-title"></h2>
        <p id="intro-body"></p>
        <button type="button" class="intro-got-it" id="intro-got-it">Got it</button>
      </div>
    </div>
    <section class="stats">
      <div class="stat-card stat-card--coins" id="coins-stat-card">
        <div class="stat-label">Coins</div>
        <div class="stat-value stat-value--hero" id="coins-value">0</div>
        <div class="stat-coins-extra" id="crew-stat-line" aria-live="polite"></div>
      </div>
      <div class="stat-card stat-card--production" id="production-stat-card" title="Base × planets × prestige × events">
        <div class="stat-label">Production <span class="production-live" id="production-live" aria-hidden="true"></span></div>
        <div class="stat-value" id="production-value">0/s</div>
        <div class="stat-breakdown" id="production-breakdown" aria-hidden="true"></div>
        <div class="session-stats" id="session-stats" aria-live="polite"></div>
        <div class="active-events" id="active-events" aria-live="polite"></div>
        <div class="next-event-progress-wrap" id="next-event-progress-wrap" aria-hidden="true">
          <div class="next-event-progress-bar" id="next-event-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
        <div class="next-event-countdown" id="next-event-countdown" aria-live="polite"></div>
      </div>
    </section>
    <div class="event-toasts" id="event-toasts" aria-live="polite"></div>
    <section class="mine-zone" id="mine-zone" title="Click or press Space to mine">
      <div class="mine-zone-floats" id="mine-zone-floats" aria-hidden="true"></div>
      <div class="mine-zone-visual" id="mine-zone-visual"></div>
      <p class="mine-zone-hint" aria-hidden="true">Click or press Space to mine</p>
      <span class="combo-indicator" id="combo-indicator" aria-live="polite"></span>
    </section>
    <section class="gameplay-block gameplay-block--locked quest-section" id="quest-section" data-block="quest">
      <h2>Quest</h2>
      <div class="quest-progress-wrap">
        <div class="quest-progress-bar" id="quest-progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
      </div>
      <p class="quest-progress" id="quest-progress"></p>
      <p class="quest-streak-hint" id="quest-streak-hint" aria-live="polite"></p>
      <button type="button" class="quest-claim-btn" id="quest-claim" disabled>Claim</button>
    </section>
    <section class="gameplay-block gameplay-block--locked prestige-section" id="prestige-section" data-block="prestige">
      <h2>Prestige</h2>
      <p class="prestige-hint">Reset coins and planets to gain +5% production per prestige level forever.</p>
      <div class="prestige-status" id="prestige-status"></div>
      <button type="button" class="prestige-btn" id="prestige-btn" disabled>Prestige</button>
    </section>
    <section class="gameplay-block gameplay-block--locked crew-section" id="crew-section" data-block="crew">
      <h2>Crew</h2>
      <p class="crew-hint">Hire astronauts for +2% production each. Upgrades cost coins and astronauts (crew is assigned to operate the equipment). Resets on Prestige.</p>
      <div class="crew-count" id="crew-count">No crew yet</div>
      <div class="crew-operates" id="crew-operates"></div>
      <button type="button" class="hire-astronaut-btn" id="hire-astronaut-btn">Hire astronaut</button>
    </section>
    <section class="gameplay-block gameplay-block--locked planets-section" id="planets-section" data-block="planets">
      <h2>Planets</h2>
      <p class="planets-hint">Each planet has upgrade slots (expandable). More planets = +5% production each. Buy a new planet or add slots to expand.</p>
      <div class="planet-list" id="planet-list"></div>
      <button type="button" class="buy-planet-btn" id="buy-planet-btn">Buy new planet</button>
    </section>
    <section class="gameplay-block gameplay-block--locked upgrades-section" id="upgrades-section" data-block="upgrades">
      <h2>Upgrades</h2>
      <p class="upgrades-hint">You can buy each upgrade multiple times; production stacks. Assigns to a planet with a free slot.</p>
      <div class="upgrade-list" id="upgrade-list"></div>
    </section>
  `;

export function mount(): void {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = APP_HTML;

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
  if (starfieldSpeedEl) starfieldSpeedEl.value = String(settings.starfieldSpeed);
  if (orbitLinesEl) orbitLinesEl.checked = settings.showOrbitLines;
  if (clickParticlesEl) clickParticlesEl.checked = settings.clickParticles;
  if (compactNumbersEl) compactNumbersEl.checked = settings.compactNumbers;
  if (spaceKeyRepeatEl) spaceKeyRepeatEl.checked = settings.spaceKeyRepeat;
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
        <span>Debug</span>
        <button type="button" class="debug-close" id="debug-close" aria-label="Close debug">×</button>
      </div>
      <div class="debug-panel-body">
        <div class="debug-section" id="debug-stats"></div>
        <div class="debug-section">
          <div class="debug-actions">
            <button type="button" class="debug-btn" data-debug="coins-1k">+1K coins</button>
            <button type="button" class="debug-btn" data-debug="coins-50k">+50K coins</button>
            <button type="button" class="debug-btn" data-debug="trigger-event">Trigger event</button>
            <button type="button" class="debug-btn" data-debug="clear-events">Clear events</button>
          </div>
        </div>
      </div>
      <p class="debug-hint">F3 to toggle</p>
    `;
    document.body.appendChild(debugPanel);
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
}
