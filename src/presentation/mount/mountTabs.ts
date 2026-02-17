/**
 * Tab switching, badges, layout. Extracted from mount.ts.
 */
import { createApp } from 'vue';
import { getSession, getSettings, getExpeditionEndsAt, planetService } from '../../application/gameState.js';
import { getUnlockedBlocks } from '../../application/progression.js';
import { getQuestProgress } from '../../application/quests.js';
import { RESEARCH_CATALOG, canAttemptResearch, hasEffectiveFreeSlot, getResearchHousingCapacityBonus } from '../../application/research.js';
import { PRESTIGE_COIN_THRESHOLD, getAstronautCost, getMaxAstronauts } from '../../domain/constants.js';
import { markPanelHydrated } from '../../application/lazyPanels.js';
import StatisticsPanel from '../vue/panels/StatisticsPanel.vue';
import DashboardPanel from '../vue/panels/DashboardPanel.vue';
import ResearchPanel from '../vue/panels/ResearchPanel.vue';
import UpgradesPanel from '../vue/panels/UpgradesPanel.vue';
import EmpirePanel from '../vue/panels/EmpirePanel.vue';
import { hasNewInstallableUpgrade } from '../dashboardView.js';
import type { TabsSnapshot } from '../vue/stores/gameState.js';

function mountVuePanel(containerId: string, component: unknown, datasetKey: string): void {
  const container = document.getElementById(containerId);
  if (!container || (container as HTMLElement & { dataset: Record<string, string> }).dataset[datasetKey]) return;
  createApp(component as Parameters<typeof createApp>[0]).mount(container);
  (container as HTMLElement & { dataset: Record<string, string> }).dataset[datasetKey] = 'true';
}

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
    mountVuePanel('research-list', ResearchPanel, 'vueResearchMounted');
    markPanelHydrated('research');
  }
  if (tabId === 'dashboard') {
    mountVuePanel('dashboard-content', DashboardPanel, 'vueDashboardMounted');
    markPanelHydrated('dashboard');
  }
  if (tabId === 'upgrades') {
    mountVuePanel('upgrade-list', UpgradesPanel, 'vueUpgradesMounted');
    markPanelHydrated('upgrades');
  }
  if (tabId === 'empire') {
    mountVuePanel('empire-content', EmpirePanel, 'vueEmpireMounted');
    markPanelHydrated('empire');
  }
  if (tabId === 'stats') {
    mountVuePanel('statistics-container', StatisticsPanel, 'vueStatsMounted');
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
}

/** Build tabs visibility + badges snapshot for Vue (no DOM). */
export function getTabsSnapshot(): TabsSnapshot {
  const session = getSession();
  const unlocked = session ? getUnlockedBlocks(session) : new Set<string>();
  const visible: Record<string, boolean> = {
    mine: true,
    dashboard: true,
    upgrades: unlocked.has('upgrades'),
    empire: unlocked.has('crew') || unlocked.has('planets') || unlocked.has('prestige'),
    research: unlocked.has('research'),
    stats: unlocked.has('upgrades'),
  };
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
  const hasNewModuleToInstall = upgradesUnlocked && hasNewInstallableUpgrade();
  const empireUnlocked = unlocked.has('crew') || unlocked.has('planets') || unlocked.has('prestige');
  let hasEmpireAction = prestigeUnlocked && canPrestige;
  if (session && !hasEmpireAction) {
    const player = session.player;
    if (unlocked.has('crew')) {
      const totalHousing = player.planets.reduce((s, p) => s + p.housingCount, 0);
      const maxCrew = getMaxAstronauts(player.planets.length, totalHousing, getResearchHousingCapacityBonus());
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
  const badges: Record<string, boolean> = {
    mine: questUnlocked && questClaimable,
    empire: empireUnlocked && hasEmpireAction,
    research: hasAttemptableResearch,
    dashboard: false,
    upgrades: hasNewModuleToInstall,
    stats: false,
  };
  return { visible, badges };
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
