/**
 * Tab switching: URL/storage helpers and store + hydration. Panels are rendered by Vue in PanelsShell.
 */
import { markPanelHydrated } from '../application/lazyPanels.js';
import { getPinia } from './piniaInstance.js';
import { useGameStateStore } from './stores/gameState.js';

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
  const pinia = getPinia();
  if (pinia) {
    const gameState = useGameStateStore(pinia);
    gameState.setActiveTab(tabId);
    if (['research', 'dashboard', 'upgrades', 'empire', 'stats'].includes(tabId)) {
      gameState.markPanelHydrated(tabId);
      markPanelHydrated(tabId);
    }
  }
  try {
    localStorage.setItem(TAB_STORAGE_KEY, tabId);
  } catch {
    // ignore
  }
}

export { TAB_STORAGE_KEY, DEFAULT_TAB, VALID_TAB_IDS, HISTORY_STATE_KEY };
