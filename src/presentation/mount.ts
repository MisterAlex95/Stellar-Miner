import { createMineZoneCanvas } from './MineZoneCanvas.js';
import { getSession, getSettings, getEventContext, setSettings, setMineZoneCanvasApi } from '../application/gameState.js';
import { getUnlockedBlocks } from '../application/progression.js';
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
  updateLastSavedIndicator,
} from '../application/handlers.js';
import { subscribe } from '../application/eventBus.js';
import { renderPrestigeSection } from './prestigeView.js';
import { renderCrewSection } from './crewView.js';
import { renderQuestSection } from './questView.js';
import { renderPlanetList } from './planetListView.js';
import { renderResearchSection } from './researchView.js';
import { renderStatisticsSection } from './statisticsView.js';
import { renderDashboardSection } from './dashboardView.js';
import {
  bindIntroModal,
  updateProgressionVisibility,
  maybeShowWelcomeModal,
  isIntroOverlayOpen,
  dismissIntroModal,
} from './progressionView.js';
import { initTooltips } from './tooltip.js';
import { APP_VERSION, hasNewUpdate, markUpdateSeen } from '../application/version.js';
import { getChangelog } from '../application/changelog.js';
import { buildChangelogHtml } from './components/changelog.js';
import { buildDebugPanelHtml } from './components/debugPanel.js';
import { getOpenOverlayElement, openOverlay, closeOverlay } from './components/overlay.js';
import { getAppHtml } from './appShell.js';

const TAB_STORAGE_KEY = 'stellar-miner-active-tab';
const DEFAULT_TAB = 'mine';
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
];
const STATS_COMPACT_ENTER = 70;
const STATS_COMPACT_LEAVE = 35;
const VALID_TAB_IDS = ['mine', 'dashboard', 'empire', 'research', 'upgrades', 'stats'] as const;

function isAnyModalOpen(): boolean {
  return getOpenOverlayElement() !== null;
}

function openInfoModal(): void {
  const list = document.getElementById('info-changelog-list');
  openOverlay('info-overlay', 'info-overlay--open', {
    focusId: 'info-close',
    onOpen: () => {
      markUpdateSeen();
      updateVersionAndChangelogUI();
      if (list) renderChangelogList(list);
    },
  });
}

function closeInfoModal(): void {
  closeOverlay('info-overlay', 'info-overlay--open');
}

const SECTION_RULES_OVERLAY_CLASS = 'section-rules-overlay--open';

/** Parses rules text: lines starting with "- " or "• " become list items; others become paragraphs. */
function formatRulesContent(text: string): DocumentFragment {
  const frag = document.createDocumentFragment();
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  let ul: HTMLUListElement | null = null;
  for (const line of lines) {
    const isListItem = line.startsWith('- ') || line.startsWith('• ');
    const content = isListItem ? line.slice(2).trim() : line;
    if (isListItem) {
      if (!ul) {
        ul = document.createElement('ul');
        ul.className = 'section-rules-list';
        frag.appendChild(ul);
      }
      const li = document.createElement('li');
      li.textContent = content;
      ul.appendChild(li);
    } else {
      ul = null;
      const p = document.createElement('p');
      p.textContent = content;
      frag.appendChild(p);
    }
  }
  return frag;
}

function openSectionRulesModal(rulesKey: string, titleKey: string): void {
  const titleEl = document.getElementById('section-rules-title');
  const bodyEl = document.getElementById('section-rules-body');
  if (titleEl) titleEl.textContent = t(titleKey as StringKey);
  if (bodyEl) {
    bodyEl.innerHTML = '';
    bodyEl.appendChild(formatRulesContent(t(rulesKey as StringKey)));
  }
  openOverlay('section-rules-overlay', SECTION_RULES_OVERLAY_CLASS, { focusId: 'section-rules-close' });
}

function closeSectionRulesModal(): void {
  closeOverlay('section-rules-overlay', SECTION_RULES_OVERLAY_CLASS);
}

export function switchTab(tabId: string): void {
  const tabs = document.querySelectorAll<HTMLElement>('.app-tab[data-tab]');
  const panels = document.querySelectorAll('.app-tab-panel');
  tabs.forEach((tab) => {
    const isSelected = tab.getAttribute('data-tab') === tabId;
    tab.classList.toggle('app-tab--active', isSelected);
    tab.setAttribute('aria-selected', String(isSelected));
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
  if (tabId === 'dashboard') renderDashboardSection();
  document.querySelectorAll<HTMLElement>('.app-tabs-menu-item').forEach((item) => {
    item.classList.toggle('app-tabs-menu-item--active', item.getAttribute('data-tab') === tabId);
  });
  updateTabMoreActiveState();
}

/** Show menu items only when the tab is unlocked (progression). When unlocked, CSS media queries control at which viewport they appear. */
export function updateTabMenuVisibility(): void {
  const session = getSession();
  const unlocked = getUnlockedBlocks(session);
  document.querySelectorAll<HTMLElement>('.app-tabs-menu-item').forEach((item) => {
    const tabId = item.getAttribute('data-tab');
    if (!tabId) return;
    const isUnlocked =
      tabId === 'dashboard' ||
      (tabId === 'upgrades' && unlocked.has('upgrades')) ||
      (tabId === 'empire' && (unlocked.has('crew') || unlocked.has('planets') || unlocked.has('prestige'))) ||
      (tabId === 'research' && unlocked.has('research')) ||
      (tabId === 'stats' && unlocked.has('upgrades'));
    item.style.display = isUnlocked ? '' : 'none';
  });
}

/** Update ⋯ button orange state: only active when current tab is hidden (in overflow menu). Call from switchTab and from game loop on resize. */
export function updateTabMoreActiveState(): void {
  const tabMore = document.getElementById('tab-more');
  if (!tabMore) return;
  const activeTab = document.querySelector<HTMLElement>('.app-tab[data-tab].app-tab--active');
  const tabId = activeTab?.getAttribute('data-tab');
  if (!tabId) return;
  const activeTabEl = document.querySelector<HTMLElement>(`.app-tab[data-tab="${tabId}"]`);
  const isActiveTabHidden = activeTabEl ? activeTabEl.offsetParent === null || getComputedStyle(activeTabEl).display === 'none' : false;
  tabMore.classList.toggle('app-tab-more--active', isActiveTabHidden);
}

/** Apply layout mode: tabs (one panel at a time) or one-page (all sections stacked). */
export function applyLayout(): void {
  const layout = getSettings().layout;
  const app = document.getElementById('app');
  const tabsNav = document.querySelector('.app-tabs') as HTMLElement | null;
  const panels = document.querySelectorAll<HTMLElement>('.app-tab-panel');
  if (app) app.setAttribute('data-layout', layout);
  if (layout === 'one-page') {
    if (tabsNav) tabsNav.style.display = 'none';
    panels.forEach((p) => {
      p.style.display = 'block';
      p.hidden = false;
    });
  } else {
    if (tabsNav) tabsNav.style.display = '';
    panels.forEach((p) => {
      p.style.display = '';
    });
    const activeId =
      document.querySelector('.app-tab--active')?.getAttribute('data-tab') ||
      localStorage.getItem(TAB_STORAGE_KEY) ||
      DEFAULT_TAB;
    const validId = VALID_TAB_IDS.includes(activeId as (typeof VALID_TAB_IDS)[number]) ? activeId : DEFAULT_TAB;
    switchTab(validId);
  }
}

function applyThemeAndMotion(): void {
  const s = getSettings();
  const root = document.documentElement;
  root.setAttribute('data-theme', s.theme);
  root.setAttribute('data-reduced-motion', s.reducedMotion ? 'true' : 'false');
}

function renderChangelogList(container: HTMLElement): void {
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

export function mount(): void {
  const app = document.getElementById('app');
  if (!app) return;
  applyThemeAndMotion();
  app.innerHTML = getAppHtml();
  applyTranslations();

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
  app.addEventListener('click', onCollapseToggle);

  // --- Mine zone canvas ---
  const settings = getSettings();
  const mineZoneVisual = document.getElementById('mine-zone-visual');
  if (mineZoneVisual) {
    setMineZoneCanvasApi(createMineZoneCanvas(mineZoneVisual, getSettings, getEventContext));
  }

  // --- Modals: info, section rules, events hint ---
  const settingsBtn = document.getElementById('settings-btn');
  const settingsOverlay = document.getElementById('settings-overlay');
  const settingsClose = document.getElementById('settings-close');
  const infoBtn = document.getElementById('info-btn');
  const infoOverlay = document.getElementById('info-overlay');
  const infoClose = document.getElementById('info-close');
  if (infoBtn && infoOverlay) {
    infoBtn.addEventListener('click', openInfoModal);
    infoOverlay.addEventListener('click', (e) => {
      if (e.target === infoOverlay) closeInfoModal();
    });
  }
  if (infoClose) infoClose.addEventListener('click', closeInfoModal);

  const sectionRulesClose = document.getElementById('section-rules-close');
  const sectionRulesGotIt = document.getElementById('section-rules-got-it');
  const sectionRulesOverlay = document.getElementById('section-rules-overlay');
  if (sectionRulesClose) sectionRulesClose.addEventListener('click', closeSectionRulesModal);
  if (sectionRulesGotIt) sectionRulesGotIt.addEventListener('click', closeSectionRulesModal);
  if (sectionRulesOverlay) {
    sectionRulesOverlay.addEventListener('click', (e) => {
      if (e.target === sectionRulesOverlay) closeSectionRulesModal();
    });
  }

  const eventsHintTrigger = document.getElementById('events-hint-trigger');
  const eventsHintOverlay = document.getElementById(EVENTS_HINT_OVERLAY_ID);
  const eventsHintClose = document.getElementById('events-hint-close');
  function closeEventsHintModal(): void {
    closeOverlay(EVENTS_HINT_OVERLAY_ID, EVENTS_HINT_OPEN_CLASS);
  }
  if (eventsHintTrigger) {
    eventsHintTrigger.addEventListener('click', () => {
      openOverlay(EVENTS_HINT_OVERLAY_ID, EVENTS_HINT_OPEN_CLASS, { focusId: 'events-hint-close' });
    });
  }
  if (eventsHintClose) eventsHintClose.addEventListener('click', closeEventsHintModal);
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
  const chartHelpClose = document.getElementById('chart-help-close');
  const chartHelpOverlay = document.getElementById(CHART_HELP_OVERLAY_ID);
  if (chartHelpClose) chartHelpClose.addEventListener('click', closeChartHelpModal);
  if (chartHelpOverlay) {
    chartHelpOverlay.addEventListener('click', (e: MouseEvent) => {
      if (e.target === chartHelpOverlay) closeChartHelpModal();
    });
  }

  if (settingsBtn && settingsOverlay) {
    settingsBtn.addEventListener('click', openSettings);
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
      else if (document.getElementById(EVENTS_HINT_OVERLAY_ID)?.classList.contains(EVENTS_HINT_OPEN_CLASS)) closeEventsHintModal();
      else if (document.getElementById(CHART_HELP_OVERLAY_ID)?.classList.contains(CHART_HELP_OPEN_CLASS)) closeChartHelpModal();
      else if (document.getElementById('settings-overlay')?.classList.contains('settings-overlay--open')) closeSettings();
    });
  }
  if (settingsClose) settingsClose.addEventListener('click', closeSettings);
  subscribe('save_success', () => updateLastSavedIndicator());

  // --- Settings form: inputs, export/import, reset, achievements ---
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

  // --- Reset & prestige confirm modals ---
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

  const prestigeRewardsBtn = document.getElementById('prestige-rewards-btn');
  const prestigeRewardsClose = document.getElementById('prestige-rewards-close');
  const prestigeRewardsOverlayEl = document.getElementById('prestige-rewards-overlay');
  if (prestigeRewardsBtn) prestigeRewardsBtn.addEventListener('click', openPrestigeRewardsModal);
  if (prestigeRewardsClose) prestigeRewardsClose.addEventListener('click', closePrestigeRewardsModal);
  if (prestigeRewardsOverlayEl) {
    prestigeRewardsOverlayEl.addEventListener('click', (e) => { if (e.target === prestigeRewardsOverlayEl) closePrestigeRewardsModal(); });
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

  // --- Empire: expedition, planets, prestige, crew ---
  const expeditionArea = document.getElementById('expedition-area');
  if (expeditionArea) {
    expeditionArea.addEventListener('click', (e: Event) => {
      if ((e.target as HTMLElement).closest('.buy-planet-btn')) handleBuyNewPlanet();
    });
  }

  const planetList = document.getElementById('planet-list');
  if (planetList) {
    planetList.addEventListener('click', (e: Event) => {
      const clicked = e.target instanceof Element ? e.target : null;
      if (!clicked) return;
      const addSlotBtn = clicked.closest('.add-slot-btn');
      if (addSlotBtn) {
        const id = (addSlotBtn as HTMLElement).getAttribute('data-planet-id');
        if (id) handleAddSlot(id);
        return;
      }
      const housingBtn = clicked.closest('.build-housing-btn');
      if (housingBtn && !(housingBtn as HTMLButtonElement).disabled) {
        const planetId = (housingBtn as HTMLElement).getAttribute('data-planet-id');
        if (planetId) handleBuildHousing(planetId);
      }
    });
  }

  const prestigeBtn = document.getElementById('prestige-btn');
  if (prestigeBtn) prestigeBtn.addEventListener('click', handlePrestige);

  document.querySelectorAll('.hire-astronaut-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const role = (btn as HTMLElement).getAttribute('data-role') as 'miner' | 'scientist' | 'pilot' | null;
      handleHireAstronaut(role ?? 'miner');
    });
  });

  // --- Intro, progression, initial section renders ---
  bindIntroModal();
  updateProgressionVisibility();
  renderPrestigeSection();
  renderCrewSection();
  renderQuestSection();

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

  const upgradeList = document.getElementById('upgrade-list');
  if (upgradeList) {
    upgradeList.addEventListener('click', (e: Event) => {
      const clicked = e.target as HTMLElement;
      const card = clicked.closest('.upgrade-card');
      if (!card) return;
      // Button may be wrapped in .btn-tooltip-wrap; click can land on the span so closest('button') misses.
      let target = clicked.closest('button.upgrade-btn') as HTMLButtonElement | null;
      if (!target) {
        const wrap = clicked.closest('.btn-tooltip-wrap');
        target = wrap?.querySelector<HTMLButtonElement>('button.upgrade-btn') ?? null;
      }
      if (!target || target.hasAttribute('disabled')) return;
      e.preventDefault();
      const upgradeId = target.getAttribute('data-upgrade-id') ?? card.getAttribute('data-upgrade-id');
      if (!upgradeId) return;
      const select = card?.querySelector('.upgrade-planet-select') as HTMLSelectElement | null;
      let planetId: string | undefined = select?.value ?? undefined;
      if (select && (!planetId || planetId === '') && select.options.length > 0) {
        planetId = select.options[select.selectedIndex]?.value ?? select.options[0].value ?? undefined;
      }
      if (target.getAttribute('data-action') === 'max') {
        handleUpgradeBuyMax(upgradeId, planetId);
      } else {
        handleUpgradeBuy(upgradeId, planetId);
      }
    });
  }

  renderPlanetList();
  renderResearchSection();

  // --- Upgrades list, research list ---
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
  if (statisticsContainer) renderStatisticsSection(statisticsContainer);

  // --- Dashboard: delegated click so buttons work after dynamic render ---
  app.addEventListener('click', (e: Event) => {
    const target = (e.target as HTMLElement).closest('#dashboard-content button');
    if (!target) return;
    const id = target.id;
    const goto = target.getAttribute('data-goto');
    if (id === 'dashboard-do-claim') {
      handleClaimQuest();
      renderDashboardSection();
      return;
    }
    if (id === 'dashboard-do-prestige') {
      openPrestigeConfirmModal();
      return;
    }
    if (id === 'dashboard-do-upgrade') {
      const upgradeId = target.getAttribute('data-upgrade-id');
      const planetId = target.getAttribute('data-planet-id') || undefined;
      if (upgradeId) {
        handleUpgradeBuy(upgradeId, planetId);
        renderDashboardSection();
      }
      return;
    }
    if (id === 'dashboard-goto-mine') {
      switchTab('mine');
      return;
    }
    if (id === 'dashboard-goto-empire') {
      switchTab('empire');
      return;
    }
    if (goto) {
      switchTab(goto);
    }
  });

  // --- Tabs, layout, offline, stats compact ---
  document.querySelectorAll<HTMLElement>('.app-tab[data-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabId = tab.getAttribute('data-tab');
      if (tabId) switchTab(tabId);
    });
  });
  const tabMore = document.getElementById('tab-more');
  const appTabsMenu = document.getElementById('app-tabs-menu');
  function closeTabsMenu(): void {
    if (appTabsMenu) appTabsMenu.hidden = true;
    if (tabMore) tabMore.setAttribute('aria-expanded', 'false');
  }
  function openTabsMenu(): void {
    if (appTabsMenu) appTabsMenu.hidden = false;
    if (tabMore) tabMore.setAttribute('aria-expanded', 'true');
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
        if (tabId) switchTab(tabId);
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
  document.addEventListener('keydown', (e) => {
    const key = e.key;
    if (key !== '1' && key !== '2' && key !== '3' && key !== '4' && key !== '5' && key !== '6') return;
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.closest('[role="dialog"]'))) return;
    const idx = parseInt(key, 10) - 1;
    const tabId = VALID_TAB_IDS[idx];
    if (!tabId) return;
    const tabEl = document.querySelector(`.app-tab[data-tab="${tabId}"]`);
    if (tabEl) switchTab(tabId);
  });
  const savedTab =
    (typeof localStorage !== 'undefined' && localStorage.getItem(TAB_STORAGE_KEY)) || DEFAULT_TAB;
  const validTab = VALID_TAB_IDS.includes(savedTab as (typeof VALID_TAB_IDS)[number]) ? savedTab : DEFAULT_TAB;
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

  const statsSection = document.querySelector('.stats') as HTMLElement | null;
  const statsSpacer = document.getElementById('stats-spacer');
  let statsCompactRaf: number | null = null;
  function updateStatsCompact(): void {
    if (!statsSection) return;
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
