/**
 * Tab switching, badges, layout. Extracted from mount.ts.
 */
import { getSession, getSettings, getExpeditionEndsAt, planetService } from '../../application/gameState.js';
import { getUnlockedBlocks } from '../../application/progression.js';
import { getQuestProgress } from '../../application/quests.js';
import { RESEARCH_CATALOG, canAttemptResearch } from '../../application/research.js';
import { PRESTIGE_COIN_THRESHOLD, getAstronautCost, getMaxAstronauts } from '../../domain/constants.js';
import { hasEffectiveFreeSlot } from '../../application/research.js';
import { renderResearchSection } from '../researchView.js';
import { renderDashboardSection } from '../dashboardView.js';
import { renderUpgradeList } from '../upgradeListView.js';
import { renderPlanetList } from '../planetListView.js';
import { renderCrewSection } from '../crewView.js';
import { renderPrestigeSection } from '../prestigeView.js';
import { renderStatisticsSection } from '../statisticsView.js';
import { markPanelHydrated } from '../../application/lazyPanels.js';
import { getNextAffordableUpgrade } from '../dashboardView.js';

const TAB_STORAGE_KEY = 'stellar-miner-active-tab';
const DEFAULT_TAB = 'mine';
const VALID_TAB_IDS = ['mine', 'dashboard', 'empire', 'research', 'upgrades', 'stats'] as const;
const HISTORY_STATE_KEY = 'tab';

export type TabId = (typeof VALID_TAB_IDS)[number];

export function getTabFromHash(): TabId | null {
  if (typeof location === 'undefined' || !location.hash) return null;
  const id = location.hash.slice(1).toLowerCase();
  return VALID_TAB_IDS.includes(id as TabId) ? (id as TabId) : null;
}

export function getInitialTab(): TabId {
  const fromHash = getTabFromHash();
  if (fromHash) return fromHash;
  const stored =
    typeof localStorage !== 'undefined' ? localStorage.getItem(TAB_STORAGE_KEY) : null;
  return stored && VALID_TAB_IDS.includes(stored as TabId) ? (stored as TabId) : DEFAULT_TAB;
}

export function pushTabState(tabId: string): void {
  if (typeof history === 'undefined') return;
  const url = `${location.pathname}${location.search}#${tabId}`;
  history.pushState({ [HISTORY_STATE_KEY]: tabId }, '', url);
}

export function replaceTabState(tabId: string): void {
  if (typeof history === 'undefined') return;
  const url = `${location.pathname}${location.search}#${tabId}`;
  history.replaceState({ [HISTORY_STATE_KEY]: tabId }, '', url);
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
  document.querySelectorAll<HTMLElement>('.app-tab-bottom[data-tab]').forEach((tab) => {
    const isSelected = tab.getAttribute('data-tab') === tabId;
    tab.classList.toggle('app-tab-bottom--active', isSelected);
    tab.setAttribute('aria-selected', String(isSelected));
  });
  try {
    localStorage.setItem(TAB_STORAGE_KEY, tabId);
  } catch {
    // ignore
  }
  if (tabId === 'research') {
    renderResearchSection();
    markPanelHydrated('research');
  }
  if (tabId === 'dashboard') {
    renderDashboardSection();
    markPanelHydrated('dashboard');
  }
  if (tabId === 'upgrades') {
    renderUpgradeList();
    markPanelHydrated('upgrades');
  }
  if (tabId === 'empire') {
    renderCrewSection();
    renderPlanetList();
    renderPrestigeSection();
    markPanelHydrated('empire');
  }
  if (tabId === 'stats') {
    const container = document.getElementById('statistics-container');
    if (container) renderStatisticsSection(container);
    markPanelHydrated('stats');
  }
  document.querySelectorAll<HTMLElement>('.app-tabs-menu-item').forEach((item) => {
    item.classList.toggle('app-tabs-menu-item--active', item.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll<HTMLElement>('.app-tabs-bottom-menu-item').forEach((item) => {
    item.classList.toggle('app-tabs-bottom-menu-item--active', item.getAttribute('data-tab') === tabId);
  });
  const tabBottomMore = document.getElementById('tab-bottom-more');
  const isOverflowTab = ['dashboard', 'research', 'upgrades', 'stats'].includes(tabId);
  if (tabBottomMore) tabBottomMore.classList.toggle('app-tab-bottom-more--active', isOverflowTab);
  const app = document.getElementById('app');
  if (app) app.setAttribute('data-active-tab', tabId);
  updateTabMoreActiveState();
}

export function updateTabMenuVisibility(): void {
  const session = getSession();
  const unlocked = getUnlockedBlocks(session);
  const isUnlockedFor = (tabId: string) =>
    tabId === 'mine' ||
    tabId === 'dashboard' ||
    (tabId === 'upgrades' && unlocked.has('upgrades')) ||
    (tabId === 'empire' && (unlocked.has('crew') || unlocked.has('planets') || unlocked.has('prestige'))) ||
    (tabId === 'research' && unlocked.has('research')) ||
    (tabId === 'stats' && unlocked.has('upgrades'));
  document.querySelectorAll<HTMLElement>('.app-tabs-menu-item').forEach((item) => {
    const tabId = item.getAttribute('data-tab');
    if (!tabId) return;
    item.style.display = isUnlockedFor(tabId) ? '' : 'none';
  });
  document.querySelectorAll<HTMLElement>('.app-tab-bottom[data-tab]').forEach((tab) => {
    const tabId = tab.getAttribute('data-tab');
    if (!tabId) return;
    tab.style.display = isUnlockedFor(tabId) ? '' : 'none';
  });
  document.querySelectorAll<HTMLElement>('.app-tabs-bottom-menu-item').forEach((item) => {
    const tabId = item.getAttribute('data-tab');
    if (!tabId) return;
    item.style.display = isUnlockedFor(tabId) ? '' : 'none';
  });
  updateTabMoreWrapVisibility();
  updateTabBottomMoreWrapVisibility();
}

function updateTabMoreWrapVisibility(): void {
  const wrap = document.querySelector<HTMLElement>('.app-tabs-more-wrap');
  if (!wrap) return;
  const hasVisibleItem = Array.from(document.querySelectorAll<HTMLElement>('.app-tabs-menu-item')).some(
    (el) => getComputedStyle(el).display !== 'none'
  );
  wrap.classList.toggle('app-tabs-more-wrap--empty', !hasVisibleItem);
}

function updateTabBottomMoreWrapVisibility(): void {
  const wrap = document.querySelector<HTMLElement>('.app-tabs-bottom-more-wrap');
  if (!wrap) return;
  const hasVisibleItem = Array.from(document.querySelectorAll<HTMLElement>('.app-tabs-bottom-menu-item')).some(
    (el) => getComputedStyle(el).display !== 'none'
  );
  wrap.classList.toggle('app-tabs-bottom-more-wrap--empty', !hasVisibleItem);
}

export function updateTabBadges(): void {
  const session = getSession();
  const unlocked = session ? getUnlockedBlocks(session) : new Set<string>();
  const questProgress = getQuestProgress();
  const questClaimable = questProgress?.done ?? false;
  const canPrestige = session?.player.coins.gte(PRESTIGE_COIN_THRESHOLD) ?? false;
  const prestigeUnlocked = unlocked.has('prestige');
  const researchUnlocked = unlocked.has('research');
  const hasAttemptableResearch =
    researchUnlocked &&
    session &&
    RESEARCH_CATALOG.some((n) => canAttemptResearch(n.id) && session.player.coins.gte(n.cost));

  const upgradesUnlocked = unlocked.has('upgrades');
  const hasAffordableUpgrade = upgradesUnlocked && getNextAffordableUpgrade() !== null;

  const empireUnlocked = unlocked.has('crew') || unlocked.has('planets') || unlocked.has('prestige');
  let hasEmpireAction = prestigeUnlocked && canPrestige;
  if (session && !hasEmpireAction) {
    const player = session.player;
    if (unlocked.has('crew')) {
      const totalHousing = player.planets.reduce((s, p) => s + p.housingCount, 0);
      const maxCrew = getMaxAstronauts(player.planets.length, totalHousing);
      const atCap = player.astronautCount >= maxCrew;
      if (!atCap && player.coins.gte(getAstronautCost(player.freeCrewCount))) hasEmpireAction = true;
    }
    if (!hasEmpireAction && unlocked.has('planets') && getExpeditionEndsAt() === null && planetService.canLaunchExpedition(player))
      hasEmpireAction = true;
    if (!hasEmpireAction && player.planets.some((p) => planetService.canAddSlot(player, p))) hasEmpireAction = true;
    if (!hasEmpireAction && player.planets.some((p) => planetService.canBuildHousing(player, p, hasEffectiveFreeSlot)))
      hasEmpireAction = true;
  }

  const questUnlocked = unlocked.has('quest');
  setTabBadge('mine', questUnlocked && questClaimable);
  setTabBadge('empire', empireUnlocked && hasEmpireAction);
  setTabBadge('research', hasAttemptableResearch);
  setTabBadge('dashboard', false);
  setTabBadge('upgrades', hasAffordableUpgrade);
  setTabBadge('stats', false);
  updateTabMoreHasAction();
}

function updateTabMoreHasAction(): void {
  const tabMore = document.getElementById('tab-more');
  if (tabMore) {
    const hasActionInOverflow = Array.from(document.querySelectorAll<HTMLElement>('.app-tab[data-tab]')).some(
      (tab) => {
        const isHidden = tab.offsetParent === null || getComputedStyle(tab).display === 'none';
        return isHidden && tab.classList.contains('app-tab--has-action');
      }
    );
    tabMore.classList.toggle('app-tab-more--has-action', hasActionInOverflow);
  }
  const tabBottomMore = document.getElementById('tab-bottom-more');
  if (tabBottomMore) {
    const hasActionInBottomMenu = Array.from(document.querySelectorAll<HTMLElement>('.app-tabs-bottom-menu-item')).some(
      (item) => item.classList.contains('app-tabs-bottom-menu-item--has-action')
    );
    tabBottomMore.classList.toggle('app-tab-bottom-more--has-action', hasActionInBottomMenu);
  }
}

function setTabBadge(tabId: string, visible: boolean): void {
  const tabEl = document.getElementById(`tab-${tabId}`);
  if (tabEl) tabEl.classList.toggle('app-tab--has-action', visible);
  document.querySelectorAll(`.app-tabs-menu-item[data-tab="${tabId}"]`).forEach((el) => {
    el.classList.toggle('app-tabs-menu-item--has-action', visible);
  });
  document.querySelectorAll(`.app-tabs-bottom-menu-item[data-tab="${tabId}"]`).forEach((el) => {
    el.classList.toggle('app-tabs-bottom-menu-item--has-action', visible);
  });
  document.querySelectorAll(`.app-tab-bottom[data-tab="${tabId}"]`).forEach((el) => {
    el.classList.toggle('app-tab-bottom--has-action', visible);
  });
}

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
    const validId = VALID_TAB_IDS.includes(activeId as TabId) ? activeId : DEFAULT_TAB;
    switchTab(validId);
  }
}

export { TAB_STORAGE_KEY, DEFAULT_TAB, VALID_TAB_IDS, HISTORY_STATE_KEY };
