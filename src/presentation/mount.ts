import { createMineZone3D } from './MineZone3D.js';
import { getSettings, getEventContext, setMineZoneCanvasApi } from '../application/gameState.js';
import { t, applyTranslations, type StringKey } from '../application/strings.js';
import {
  openSettings,
  closeSettings,
  applySettingsToUI,
  openResetConfirmModal,
  closeResetConfirmModal,
  handleResetProgress,
  openPrestigeConfirmModal,
  closePrestigeConfirmModal,
  openPrestigeRewardsModal,
  closePrestigeRewardsModal,
  confirmPrestige,
  handleMineClick,
  handleCancelExpedition,
  handleAddSlot,
  handleBuildHousing,
  handlePrestige,
  handleHireAstronaut,
  handleDebugAction,
  closeDebugMenu,
  toggleDebugMenu,
  renderAchievementsModalContent,
  updateLastSavedIndicator,
} from '../application/handlers.js';
import { subscribe } from '../application/eventBus.js';
import { openPlanetDetail, closePlanetDetail, PLANET_DETAIL_OVERLAY_ID, PLANET_DETAIL_OPEN_CLASS } from './planetDetailView.js';
import {
  closeUpgradeChoosePlanetModal,
  bindUpgradeChoosePlanetModal,
} from './upgradeChoosePlanetModal.js';
import { openExpeditionModal, closeExpeditionModal, bindExpeditionModal } from './expeditionModal.js';
import { getSession } from '../application/gameState.js';
import {
  bindIntroModal,
  updateProgressionVisibility,
  maybeShowWelcomeModal,
  isIntroOverlayOpen,
  dismissIntroModal,
} from './progressionView.js';
import { initTooltips } from './tooltip.js';
import { wireSettingsSubscribers } from '../application/refreshSubscribers.js';
import { APP_VERSION, hasNewUpdate } from '../application/version.js';
import { getChangelog } from '../application/changelog.js';
import { buildChangelogHtml } from './components/changelog.js';
import { buildDebugPanelHtml } from './components/debugPanel.js';
import { getOpenOverlayElement, openOverlay, closeOverlay } from './components/overlay.js';
import {
  switchTab,
  applyLayout,
  getInitialTab,
  replaceTabState,
} from './mount/mountTabs.js';
import {
  openInfoModal,
  closeInfoModal,
  openAchievementsModal,
  closeAchievementsModal,
  openSectionRulesModal,
  closeSectionRulesModal,
  isAnyModalOpen,
  SECTION_RULES_OVERLAY_CLASS,
  ACHIEVEMENTS_OVERLAY_ID,
  ACHIEVEMENTS_OVERLAY_OPEN_CLASS,
} from './mount/mountModals.js';

export { switchTab, applyLayout, getTabsSnapshot } from './mount/mountTabs.js';

const EVENTS_HINT_OVERLAY_ID = 'events-hint-overlay';
const EVENTS_HINT_OPEN_CLASS = 'events-hint-overlay--open';
const CHART_HELP_OVERLAY_ID = 'chart-help-overlay';
const CHART_HELP_OPEN_CLASS = 'chart-help-overlay--open';

export function renderChangelogList(container: HTMLElement): void {
  container.innerHTML = buildChangelogHtml(getChangelog());
}

export function updateVersionAndChangelogUI(): void {
  const versionEl = document.getElementById('info-version-value');
  if (versionEl) versionEl.textContent = APP_VERSION;
  const badge = document.getElementById('info-update-badge');
  if (badge) {
    const show = hasNewUpdate();
    badge.classList.toggle('info-update-badge--visible', show);
    badge.setAttribute('aria-hidden', String(!show));
  }
}

function applyThemeAndMotion(): void {
  const s = getSettings();
  const root = document.documentElement;
  root.setAttribute('data-theme', s.theme);
  root.setAttribute('data-reduced-motion', s.reducedMotion ? 'true' : 'false');
}

export function mount(container?: HTMLElement): void {
  const app = document.getElementById('app');
  const legacyRoot = document.getElementById('legacy-root');
  const legacyPanels = document.getElementById('legacy-panels');
  if (!app || !legacyRoot || !legacyPanels) return;
  applyThemeAndMotion();
  applyTranslations();

  // Collapse and section rules are handled by Vue (PanelsShell, EmpireSection).

  // --- Mine zone canvas ---
  const settings = getSettings();
  const mineZoneVisual = document.getElementById('mine-zone-visual');
  if (mineZoneVisual) {
    setMineZoneCanvasApi(createMineZone3D(mineZoneVisual, getSettings, getEventContext));
  }

  // --- Modals: info, section rules, events hint ---
  const settingsBtn = document.getElementById('settings-btn');
  const settingsOverlay = document.getElementById('settings-overlay');
  const infoOverlay = document.getElementById('info-overlay');
  if (infoOverlay) {
    infoOverlay.addEventListener('click', (e) => {
      if (e.target === infoOverlay) closeInfoModal();
    });
  }

  const achievementsOverlay = document.getElementById(ACHIEVEMENTS_OVERLAY_ID);
  if (achievementsOverlay) {
    achievementsOverlay.addEventListener('click', (e) => {
      if (e.target === achievementsOverlay) closeAchievementsModal();
    });
  }

  const sectionRulesOverlay = document.getElementById('section-rules-overlay');
  if (sectionRulesOverlay) {
    sectionRulesOverlay.addEventListener('click', (e) => {
      if (e.target === sectionRulesOverlay) closeSectionRulesModal();
    });
  }

  const eventsHintTrigger = document.getElementById('events-hint-trigger');
  const eventsHintOverlay = document.getElementById(EVENTS_HINT_OVERLAY_ID);
  function closeEventsHintModal(): void {
    closeOverlay(EVENTS_HINT_OVERLAY_ID, EVENTS_HINT_OPEN_CLASS);
  }
  if (eventsHintTrigger) {
    eventsHintTrigger.addEventListener('click', () => {
      openOverlay(EVENTS_HINT_OVERLAY_ID, EVENTS_HINT_OPEN_CLASS, { focusId: 'events-hint-close' });
    });
  }
  if (eventsHintOverlay) {
    eventsHintOverlay.addEventListener('click', (e: MouseEvent) => {
      if (e.target === eventsHintOverlay) closeEventsHintModal();
    });
  }
  function closeChartHelpModal(): void {
    closeOverlay(CHART_HELP_OVERLAY_ID, CHART_HELP_OPEN_CLASS);
  }
  document.addEventListener('click', (e: MouseEvent) => {
    const help = (e.target as Element)?.closest?.('.statistics-chart-help');
    if (!help || !(help instanceof HTMLElement)) return;
    const titleKey = help.getAttribute('data-chart-title');
    const descKey = help.getAttribute('data-chart-desc');
    if (!titleKey || !descKey) return;
    const titleEl = document.getElementById('chart-help-modal-title');
    const bodyEl = document.getElementById('chart-help-modal-body');
    if (titleEl) titleEl.textContent = t(titleKey as StringKey);
    if (bodyEl) bodyEl.textContent = t(descKey as StringKey);
    openOverlay(CHART_HELP_OVERLAY_ID, CHART_HELP_OPEN_CLASS, { focusId: 'chart-help-close' });
  });
  const chartHelpOverlay = document.getElementById(CHART_HELP_OVERLAY_ID);
  if (chartHelpOverlay) {
    chartHelpOverlay.addEventListener('click', (e: MouseEvent) => {
      if (e.target === chartHelpOverlay) closeChartHelpModal();
    });
  }
  if (settingsOverlay) {
    settingsOverlay.addEventListener('click', (e) => {
      if (e.target === settingsOverlay) closeSettings();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const overlayEl = getOpenOverlayElement();
        if (overlayEl) {
          const focusable = overlayEl.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
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
      if (document.getElementById('reset-confirm-overlay')?.classList.contains('reset-confirm-overlay--open')) closeResetConfirmModal();
      else if (document.getElementById('prestige-confirm-overlay')?.classList.contains('prestige-confirm-overlay--open')) closePrestigeConfirmModal();
      else if (document.getElementById('prestige-rewards-overlay')?.classList.contains('prestige-rewards-overlay--open')) closePrestigeRewardsModal();
      else if (isIntroOverlayOpen()) dismissIntroModal();
      else if (document.getElementById('section-rules-overlay')?.classList.contains(SECTION_RULES_OVERLAY_CLASS)) closeSectionRulesModal();
      else if (document.getElementById('info-overlay')?.classList.contains('info-overlay--open')) closeInfoModal();
      else if (document.getElementById(ACHIEVEMENTS_OVERLAY_ID)?.classList.contains(ACHIEVEMENTS_OVERLAY_OPEN_CLASS)) closeAchievementsModal();
      else if (document.getElementById(EVENTS_HINT_OVERLAY_ID)?.classList.contains(EVENTS_HINT_OPEN_CLASS)) closeEventsHintModal();
      else if (document.getElementById(CHART_HELP_OVERLAY_ID)?.classList.contains(CHART_HELP_OPEN_CLASS)) closeChartHelpModal();
      else if (document.getElementById(PLANET_DETAIL_OVERLAY_ID)?.classList.contains(PLANET_DETAIL_OPEN_CLASS)) closePlanetDetail();
      else if (document.getElementById('upgrade-choose-planet-overlay')?.classList.contains('upgrade-choose-planet-overlay--open')) closeUpgradeChoosePlanetModal();
      else if (document.getElementById('expedition-modal-overlay')?.classList.contains('expedition-modal-overlay--open')) closeExpeditionModal();
      else if (document.getElementById('settings-overlay')?.classList.contains('settings-overlay--open')) closeSettings();
    });
  }
  if (settingsBtn) settingsBtn.addEventListener('click', openSettings);

  subscribe('save_success', () => updateLastSavedIndicator());

  wireSettingsSubscribers(() => {
    applyThemeAndMotion();
    applyLayout();
    applySettingsToUI();
    applyTranslations();
  });

  // --- Reset & prestige confirm modals (overlay click to close; buttons handled by Vue) ---
  const resetConfirmOverlay = document.getElementById('reset-confirm-overlay');
  if (resetConfirmOverlay) {
    resetConfirmOverlay.addEventListener('click', (e) => { if (e.target === resetConfirmOverlay) closeResetConfirmModal(); });
  }
  const prestigeConfirmOverlay = document.getElementById('prestige-confirm-overlay');
  if (prestigeConfirmOverlay) {
    prestigeConfirmOverlay.addEventListener('click', (e) => { if (e.target === prestigeConfirmOverlay) closePrestigeConfirmModal(); });
  }
  const prestigeRewardsOverlayEl = document.getElementById('prestige-rewards-overlay');
  if (prestigeRewardsOverlayEl) {
    prestigeRewardsOverlayEl.addEventListener('click', (e) => { if (e.target === prestigeRewardsOverlayEl) closePrestigeRewardsModal(); });
  }
  const planetDetailOverlay = document.getElementById(PLANET_DETAIL_OVERLAY_ID);
  if (planetDetailOverlay) {
    planetDetailOverlay.addEventListener('click', (e) => {
      if (e.target === planetDetailOverlay) closePlanetDetail();
    });
  }
  bindUpgradeChoosePlanetModal();
  bindExpeditionModal();

  updateVersionAndChangelogUI();

  // --- Mine zone click + Space key ---
  const mineZone = document.getElementById('mine-zone');
  const mineZoneHint = document.getElementById('mine-zone-hint');
  const MINE_HINT_DISMISSED_KEY = 'stellar-miner-mine-hint-dismissed';
  if (mineZoneHint) {
    try {
      if (localStorage.getItem(MINE_HINT_DISMISSED_KEY)) {
        mineZoneHint.classList.add('mine-zone-hint--dismissed');
        mineZoneHint.setAttribute('aria-hidden', 'true');
      } else {
        mineZoneHint.setAttribute('aria-hidden', 'false');
      }
    } catch {
      mineZoneHint.setAttribute('aria-hidden', 'false');
    }
  }
  if (mineZone) {
    mineZone.addEventListener('click', (e: Event) => {
      if (mineZoneHint && !mineZoneHint.classList.contains('mine-zone-hint--dismissed')) {
        try {
          localStorage.setItem(MINE_HINT_DISMISSED_KEY, '1');
        } catch {
          // ignore
        }
        mineZoneHint.classList.add('mine-zone-hint--dismissed');
        mineZoneHint.setAttribute('aria-hidden', 'true');
      }
      handleMineClick(e as MouseEvent);
    });
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
    if (mineZoneHint && !mineZoneHint.classList.contains('mine-zone-hint--dismissed')) {
      try {
        localStorage.setItem(MINE_HINT_DISMISSED_KEY, '1');
      } catch {
        // ignore
      }
      mineZoneHint.classList.add('mine-zone-hint--dismissed');
      mineZoneHint.setAttribute('aria-hidden', 'true');
    }
    const allowRepeat = getSettings().spaceKeyRepeat;
    if (!e.repeat || allowRepeat) handleMineClick();
  });
  document.addEventListener('keyup', (e: KeyboardEvent) => {
    if (e.code !== 'Space') return;
    document.getElementById('mine-zone')?.classList.remove('mine-zone--active');
  });

  // Empire: Vue EmpirePanel handles expedition, planets, prestige, crew clicks when tab is opened.

  // --- Intro, progression, initial section renders ---
  bindIntroModal();
  updateProgressionVisibility();

  // --- Debug panel ---
  if (!document.getElementById('debug-panel')) {
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.className = 'debug-panel debug-panel--closed';
    debugPanel.setAttribute('aria-hidden', 'true');
    debugPanel.innerHTML = buildDebugPanelHtml();
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

  // Planet list: rendered by Vue EmpirePanel when empire tab is opened.

  // Statistics: rendered by Vue StatisticsPanel when stats tab is opened (no init render here).

  // --- Tabs: initial state only; clicks, more menu, popstate, keyboard 1-6 are in AppTabs.vue ---
  const initialTab = getInitialTab();
  replaceTabState(initialTab);
  switchTab(initialTab);
  applyLayout();

  // Offline banner and stats compact are handled by Vue (AppHeader, StatsBlock).

  initTooltips();
}
