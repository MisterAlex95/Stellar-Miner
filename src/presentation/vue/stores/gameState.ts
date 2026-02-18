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

/** Read-only stats block display data. Filled by getStatsSnapshot() from game loop. */
import type { StatsSnapshot } from '../../../application/statsSnapshot.js';
export type { StatsSnapshot };

/** Read-only quest section display data. */
import type { QuestSnapshot } from '../../../application/questSnapshot.js';
export type { QuestSnapshot };

/** Combo indicator display (mine zone). */
import type { ComboSnapshot } from '../../../application/comboSnapshot.js';
export type { ComboSnapshot };

/** Tab visibility and badges (from progression/unlocks). */
export type TabsSnapshot = {
  visible: Record<string, boolean>;
  badges: Record<string, boolean>;
};

/** Section locked/unlocked by progression (sectionId -> unlocked). */
import type { ProgressionSnapshot } from '../../../application/progressionSnapshot.js';
export type { ProgressionSnapshot };

export type GameStateSnapshot = {
  activeTab: string;
  layout: 'tabs' | 'one-page';
  coins: number;
  production: number;
  planets: PlanetViewItem[];
  statsHistoryRecent: HistoryPoint[];
  statsHistoryLongTerm: HistoryPoint[];
  runStats: RunStats;
  stats: StatsSnapshot;
  quest: QuestSnapshot;
  combo: ComboSnapshot;
  tabs: TabsSnapshot;
  progression: ProgressionSnapshot;
};

const defaultRunStats: RunStats = {
  runStartTime: 0,
  runCoinsEarned: 0,
  runQuestsClaimed: 0,
  runEventsTriggered: 0,
  runMaxComboMult: 0,
};

const defaultStats: StatsSnapshot = {
  formattedCoins: '0',
  formattedProduction: '0/s',
  crewLine: '',
  crewDetail: '',
  crewByJob: [],
  showCrew: false,
  crewCompact: '0',
  crewUnlocked: false,
  productionBreakdown: '',
  productionBreakdownVisible: false,
  productionLive: false,
  nextMilestoneText: '',
  nextMilestoneVisible: false,
  activeEventsHtml: '',
  activeEventsVisible: false,
  nextEventPct: 0,
  nextEventRowVisible: false,
  nextEventLabelVisible: false,
  eventsUnlocked: false,
  coinsBump: false,
  eventsHintBodyHtml: '',
};

const defaultQuest: QuestSnapshot = {
  progressPct: 0,
  progressText: '',
  claimLabel: '',
  claimDisabled: true,
  claimTitle: '',
  summary: '',
  streakHint: '',
  streakHintVisible: false,
  sectionComplete: false,
};

const defaultCombo: ComboSnapshot = {
  active: false,
  multLabel: '',
  timeSec: '',
  dataTier: '',
  fading: false,
};

const defaultTabs: TabsSnapshot = {
  visible: { mine: true, dashboard: true, empire: true, research: true, upgrades: true, stats: true },
  badges: { mine: false, dashboard: false, empire: false, research: false, upgrades: false, stats: false },
};

const defaultProgression: ProgressionSnapshot = {
  sectionUnlocked: {},
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
    stats: { ...defaultStats },
    quest: { ...defaultQuest },
    combo: { ...defaultCombo },
    tabs: { ...defaultTabs },
    progression: { ...defaultProgression },
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
      this.stats = payload.stats ?? { ...defaultStats };
      this.quest = payload.quest ?? { ...defaultQuest };
      this.combo = payload.combo ?? { ...defaultCombo };
      this.tabs = payload.tabs ?? { ...defaultTabs };
      this.progression = payload.progression ?? { ...defaultProgression };
    },
    setActiveTab(tabId: string): void {
      this.activeTab = tabId;
    },
    setLayout(layout: 'tabs' | 'one-page'): void {
      this.layout = layout;
    },
  },
});
