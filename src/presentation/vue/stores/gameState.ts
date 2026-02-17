/**
 * Pinia store: read-only view state for Vue. Updated from the game loop via setSnapshot.
 */
import { defineStore } from 'pinia';
import type { HistoryPoint } from '../../../application/statsHistory.js';
import type { RunStats } from '../../../application/gameState.js';

export type PlanetViewItem = {
  id: string;
  name: string;
  displayName: string;
  usedSlots: number;
  maxUpgrades: number;
  upgradeCounts: Record<string, number>;
  visualSeed: number;
};

export type GameStateSnapshot = {
  activeTab: string;
  layout: 'tabs' | 'one-page';
  coins: number;
  production: number;
  planets: PlanetViewItem[];
  statsHistoryRecent: HistoryPoint[];
  statsHistoryLongTerm: HistoryPoint[];
  runStats: RunStats;
};

const defaultRunStats: RunStats = {
  runStartTime: 0,
  runCoinsEarned: 0,
  runQuestsClaimed: 0,
  runEventsTriggered: 0,
  runMaxComboMult: 0,
};

export const useGameStateStore = defineStore('gameState', {
  state: (): GameStateSnapshot => ({
    activeTab: 'mine',
    layout: 'tabs',
    coins: 0,
    production: 0,
    planets: [],
    statsHistoryRecent: [],
    statsHistoryLongTerm: [],
    runStats: { ...defaultRunStats },
  }),
  actions: {
    setSnapshot(payload: GameStateSnapshot): void {
      this.activeTab = payload.activeTab;
      this.layout = payload.layout;
      this.coins = payload.coins;
      this.production = payload.production;
      this.planets = payload.planets;
      this.statsHistoryRecent = payload.statsHistoryRecent;
      this.statsHistoryLongTerm = payload.statsHistoryLongTerm;
      this.runStats = { ...payload.runStats };
    },
    setActiveTab(tabId: string): void {
      this.activeTab = tabId;
    },
  },
});
