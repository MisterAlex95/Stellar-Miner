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
  handleClaimQuest,
  handleDebugAction,
  closeDebugMenu,
  toggleDebugMenu,
  renderAchievementsModalContent,
  updateLastSavedIndicator,
} from '../application/handlers.js';
import { subscribe } from '../application/eventBus.js';
import { questProgressStore } from '../application/questProgressStore.js';
import { renderQuestSection } from './questView.js';
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
  updateTabMenuVisibility,
  updateTabBadges,
  updateTabMoreActiveState,
  applyLayout,
  getInitialTab,
  replaceTabState,
  pushTabState,
  VALID_TAB_IDS,
  HISTORY_STATE_KEY,
  type TabId,
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

export { switchTab, updateTabMenuVisibility, updateTabBadges, updateTabMoreActiveState, applyLayout } from './mount/mountTabs.js';

const EVENTS_HINT_OVERLAY_ID = 'events-hint-overlay';
const EVENTS_HINT_OPEN_CLASS = 'events-hint-overlay--open';
const CHART_HELP_OVERLAY_ID = 'chart-help-overlay';
const CHART_HELP_OPEN_CLASS = 'chart-help-overlay--open';
const COLLAPSED_STORAGE_PREFIX = 'stellar-miner-collapsed-';
const COLLAPSIBLE_SECTION_IDS = [
  'quest-section',
  'crew-section',
  'planets-section',
  'prestige-section',
  'research-section',
  'upgrades-section',
  'statistics-section',
  'dashboard-section',
];
const STATS_COMPACT_ENTER = 70;
const STATS_COMPACT_LEAVE = 35;

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
  const root = app;

  function goToTab(tabId: string): void {
    pushTabState(tabId);
    switchTab(tabId);
  }

  // --- Collapsible sections ---
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
    const target = e.target as HTMLElement;
    const rulesBtn = target.closest('.gameplay-block-rules-btn');
    if (rulesBtn) {
      e.preventDefault();
      e.stopPropagation();
      const rulesKey = rulesBtn.getAttribute('data-rules-key');
      const titleKey = rulesBtn.getAttribute('data-title-key');
      if (rulesKey && titleKey) openSectionRulesModal(rulesKey, titleKey);
      return;
    }
    const header = target.closest('.gameplay-block-header');
    if (!header) return;
    const section = header.closest('.gameplay-block');
    if (!section || !section.id) return;
    const btn = section.querySelector('.gameplay-block-toggle');
    if (!btn) return;
    const isCollapsed = section.classList.toggle('gameplay-block--collapsed');
    (btn as HTMLElement).setAttribute('aria-expanded', String(!isCollapsed));
    (btn as HTMLElement).setAttribute('title', isCollapsed ? t('expandSection') : t('collapseSection'));
    (btn as HTMLElement).setAttribute('aria-label', isCollapsed ? t('expandSection') : t('collapseSection'));
    try {
      localStorage.setItem(COLLAPSED_STORAGE_PREFIX + section.id, isCollapsed ? '1' : '0');
    } catch {
      // ignore
    }
  }

  initCollapsedState();
  root.addEventListener('click', onCollapseToggle);

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
  renderQuestSection();
  questProgressStore.subscribe(() => renderQuestSection());

  const claimBtn = document.getElementById('quest-claim');
  if (claimBtn) claimBtn.addEventListener('click', handleClaimQuest);

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

  // --- Tabs, layout, offline, stats compact ---
  window.addEventListener('popstate', (e: PopStateEvent) => {
    const tabId = e.state?.[HISTORY_STATE_KEY];
    if (tabId && VALID_TAB_IDS.includes(tabId as TabId)) switchTab(tabId);
  });
  document.querySelectorAll<HTMLElement>('.app-tab[data-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabId = tab.getAttribute('data-tab');
      if (tabId) goToTab(tabId);
    });
  });
  document.querySelectorAll<HTMLElement>('.app-tab-bottom[data-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabId = tab.getAttribute('data-tab');
      if (tabId) goToTab(tabId);
    });
  });
  const tabMore = document.getElementById('tab-more');
  const appTabsMenu = document.getElementById('app-tabs-menu');
  function closeTabsMenu(): void {
    if (appTabsMenu) appTabsMenu.hidden = true;
    if (tabMore) {
      tabMore.setAttribute('aria-expanded', 'false');
      tabMore.classList.remove('app-tab-more--expanded');
    }
  }
  function openTabsMenu(): void {
    if (appTabsMenu) appTabsMenu.hidden = false;
    if (tabMore) {
      tabMore.setAttribute('aria-expanded', 'true');
      tabMore.classList.add('app-tab-more--expanded');
    }
  }
  if (tabMore && appTabsMenu) {
    tabMore.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = appTabsMenu.hidden === false;
      if (isOpen) closeTabsMenu();
      else openTabsMenu();
    });
    document.querySelectorAll<HTMLElement>('.app-tabs-menu-item').forEach((item) => {
      item.addEventListener('click', () => {
        const tabId = item.getAttribute('data-tab');
        if (tabId) goToTab(tabId);
        closeTabsMenu();
      });
    });
    document.addEventListener('click', (e) => {
      if (appTabsMenu.hidden) return;
      const target = e.target as Node;
      if (!appTabsMenu.contains(target) && !tabMore.contains(target)) closeTabsMenu();
    });
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && !appTabsMenu.hidden) {
        closeTabsMenu();
        tabMore?.focus();
      }
    });
  }
  const tabBottomMore = document.getElementById('tab-bottom-more');
  const appTabsBottomMenu = document.getElementById('app-tabs-bottom-menu');
  function closeBottomTabsMenu(): void {
    if (appTabsBottomMenu) appTabsBottomMenu.hidden = true;
    if (tabBottomMore) {
      tabBottomMore.setAttribute('aria-expanded', 'false');
      tabBottomMore.classList.remove('app-tab-bottom-more--expanded');
    }
  }
  function openBottomTabsMenu(): void {
    if (appTabsBottomMenu) appTabsBottomMenu.hidden = false;
    if (tabBottomMore) {
      tabBottomMore.setAttribute('aria-expanded', 'true');
      tabBottomMore.classList.add('app-tab-bottom-more--expanded');
    }
  }
  if (tabBottomMore && appTabsBottomMenu) {
    tabBottomMore.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = appTabsBottomMenu.hidden === false;
      if (isOpen) closeBottomTabsMenu();
      else openBottomTabsMenu();
    });
    document.querySelectorAll<HTMLElement>('.app-tabs-bottom-menu-item').forEach((item) => {
      item.addEventListener('click', () => {
        const tabId = item.getAttribute('data-tab');
        if (tabId) goToTab(tabId);
        closeBottomTabsMenu();
      });
    });
    document.addEventListener('click', (e) => {
      if (appTabsBottomMenu.hidden) return;
      const target = e.target as Node;
      const wrap = document.querySelector('.app-tabs-bottom-more-wrap');
      if (!wrap?.contains(target) && !appTabsBottomMenu.contains(target)) closeBottomTabsMenu();
    });
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && !appTabsBottomMenu.hidden) {
        closeBottomTabsMenu();
        tabBottomMore?.focus();
      }
    });
  }
  document.addEventListener('keydown', (e) => {
    const key = e.key;
    if (key !== '1' && key !== '2' && key !== '3' && key !== '4' && key !== '5' && key !== '6') return;
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.closest('[role="dialog"]'))) return;
    const idx = parseInt(key, 10) - 1;
    const tabId = VALID_TAB_IDS[idx];
    if (!tabId) return;
    goToTab(tabId);
  });
  const initialTab = getInitialTab();
  replaceTabState(initialTab);
  switchTab(initialTab);
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

  const statsSection = document.querySelector('.stats') as HTMLElement | null;
  const statsSpacer = document.getElementById('stats-spacer');
  let statsCompactRaf: number | null = null;
  function updateStatsCompact(): void {
    if (!statsSection) return;
    const app = document.getElementById('app');
    const activeTab = app?.getAttribute('data-active-tab') ?? '';
    const isMine = activeTab === 'mine';
    if (isMine) {
      statsSection.classList.remove('stats--compact');
      if (statsSpacer) {
        statsSpacer.style.display = 'none';
        statsSpacer.style.height = '';
      }
      const crewCompactCard = document.getElementById('crew-compact-card');
      if (crewCompactCard) crewCompactCard.setAttribute('aria-hidden', 'true');
      return;
    }
    const y = window.scrollY;
    const wasCompact = statsSection.classList.contains('stats--compact');
    const compact = wasCompact ? y > STATS_COMPACT_LEAVE : y > STATS_COMPACT_ENTER;
    const crewCompactCard = document.getElementById('crew-compact-card');
    if (crewCompactCard) crewCompactCard.setAttribute('aria-hidden', String(!compact));
    if (compact && !wasCompact && statsSpacer) {
      const spacerHeight = statsSection.offsetHeight;
      statsSpacer.style.height = `${spacerHeight}px`;
      statsSpacer.style.display = 'block';
      statsSection.classList.add('stats--compact');
    } else if (!compact) {
      statsSection.classList.remove('stats--compact');
      if (statsSpacer) {
        statsSpacer.style.display = 'none';
        statsSpacer.style.height = '';
      }
    }
  }
  function onScrollForStatsCompact(): void {
    if (statsCompactRaf != null) return;
    statsCompactRaf = requestAnimationFrame(() => {
      statsCompactRaf = null;
      updateStatsCompact();
    });
  }
  updateStatsCompact();
  window.addEventListener('scroll', onScrollForStatsCompact, { passive: true });
  window.addEventListener('resize', () => {
    if (statsSection?.classList.contains('stats--compact') && statsSpacer) {
      statsSpacer.style.height = `${statsSection.offsetHeight}px`;
    }
  });

  initTooltips();
}
