import { Upgrade } from '../domain/entities/Upgrade.js';
import { GameEvent } from '../domain/entities/GameEvent.js';
import { UpgradeEffect } from '../domain/value-objects/UpgradeEffect.js';
import { EventEffect } from '../domain/value-objects/EventEffect.js';
import gameConfig from '../data/gameConfig.json';
import upgradesData from '../data/upgrades.json';
import eventsData from '../data/events.json';

const T = gameConfig.timing;
const S = gameConfig.storageKeys;
const C = gameConfig.combo;
const L = gameConfig.lucky;
const Q = gameConfig.quest;

export const SAVE_INTERVAL_MS = T.saveIntervalMs;
export const EVENT_INTERVAL_MS = T.eventIntervalMs;
export const MIN_EVENT_DELAY_MS = T.minEventDelayMs;
export const STATS_HISTORY_INTERVAL_MS = T.statsHistoryIntervalMs;
export const STATS_HISTORY_MAX_POINTS = T.statsHistoryMaxPoints;
export const STATS_LONG_TERM_INTERVAL_MS = T.statsLongTermIntervalMs;
export const STATS_LONG_TERM_MAX_POINTS = T.statsLongTermMaxPoints;

export type UpgradeDef = {
  id: string;
  name: string;
  description: string;
  cost: number;
  coinsPerSecond: number;
  tier: number;
  requiredAstronauts: number;
};

export const UPGRADE_CATALOG: UpgradeDef[] = upgradesData as UpgradeDef[];

export function createUpgrade(def: UpgradeDef): Upgrade {
  return new Upgrade(def.id, def.name, def.cost, new UpgradeEffect(def.coinsPerSecond));
}

/** Tiers the player has unlocked for display. Tier 1 always; tier n+1 from owning tier n. */
export function getUnlockedUpgradeTiers(ownedUpgradeIds: string[]): Set<number> {
  const ownedTiers = new Set<number>();
  for (const id of ownedUpgradeIds) {
    const def = UPGRADE_CATALOG.find((d) => d.id === id);
    if (def) ownedTiers.add(def.tier);
  }
  const unlocked = new Set<number>([1]);
  for (const t of ownedTiers) unlocked.add(t + 1);
  return unlocked;
}

export const EVENT_CATALOG: GameEvent[] = (eventsData as { id: string; name: string; effect: { multiplier: number; durationMs: number } }[]).map(
  (e) => new GameEvent(e.id, e.name, new EventEffect(e.effect.multiplier, e.effect.durationMs))
);

export const UPGRADE_GROUPS: { label: string; minTier: number; maxTier: number }[] = gameConfig.upgradeGroups;

export const COMBO_WINDOW_MS = C.windowMs;
export const COMBO_MIN_CLICKS = C.minClicks;
export const COMBO_MULT_PER_LEVEL = C.multPerLevel;
export const COMBO_MAX_MULT = C.maxMult;

export const COMBO_NAMES: { minMult: number; name: string }[] = C.names;

export function getComboName(mult: number): string {
  for (const t of COMBO_NAMES) {
    if (mult >= t.minMult) return t.name;
  }
  return 'Combo';
}

export const LUCKY_CLICK_CHANCE = L.luckyClickChance;
export const LUCKY_MIN = L.luckyMin;
export const LUCKY_MAX = L.luckyMax;
export const SUPER_LUCKY_CHANCE = L.superLuckyChance;
export const SUPER_LUCKY_MIN = L.superLuckyMin;
export const SUPER_LUCKY_MAX = L.superLuckyMax;
export const CRITICAL_CLICK_CHANCE = L.criticalClickChance;

export const DAILY_BONUS_COINS = gameConfig.dailyBonusCoins;
export const TOTAL_CLICKS_KEY = S.totalClicksKey;
export const LAST_DAILY_BONUS_KEY = S.lastDailyBonusKey;
export const ACHIEVEMENTS_KEY = S.achievementsKey;
export const QUEST_STORAGE_KEY = S.questStorageKey;
export const MILESTONES_STORAGE_KEY = S.milestonesStorageKey;
export const QUEST_STREAK_KEY = S.questStreakKey;
export const QUEST_STREAK_WINDOW_MS = Q.streakWindowMs;
export const QUEST_STREAK_BONUS_PER_LEVEL = Q.streakBonusPerLevel;
export const QUEST_STREAK_MAX = Q.streakMax;
export const QUEST_LAST_CLAIM_KEY = S.questLastClaimKey;

export const MILESTONES = gameConfig.milestones;
export const COMBO_MASTER_KEY = S.comboMasterKey;

export const STATS_STORAGE_KEY = S.statsStorageKey;
export const STATS_HISTORY_STORAGE_KEY = S.statsHistoryStorageKey;
