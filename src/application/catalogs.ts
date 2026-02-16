import { toDecimal, Decimal } from '../domain/bigNumber.js';
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
/** Shorter delay for the first event after events unlock (so player sees one quickly). */
export const FIRST_EVENT_DELAY_MS = (T as { firstEventDelayMs?: number }).firstEventDelayMs ?? 18000;
/** After this many events triggered in the run, negative events can appear. Before that, only positive. */
export const EVENT_NEGATIVE_UNLOCK_AFTER = (gameConfig as { events?: { negativeUnlockAfterTriggers?: number } }).events?.negativeUnlockAfterTriggers ?? 3;
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
  /** If false, this upgrade does not use a planet slot (default true). */
  usesSlot?: boolean;
};

export const UPGRADE_CATALOG: UpgradeDef[] = upgradesData as UpgradeDef[];

const UPGRADES_CONFIG = (gameConfig as {
  upgrades?: {
    costMultiplierPerOwned?: number;
    displayCount?: number;
    installDurationMs?: number;
    installDurationBaseMs?: number;
    installDurationCostFactor?: number;
    installDurationTierExponent?: number;
    installDurationLog10Cap?: number;
  };
}).upgrades ?? {};
const UPGRADE_COST_MULT = UPGRADES_CONFIG.costMultiplierPerOwned ?? 1.15;
/** Max number of upgrade cards shown in the list at once. */
export const UPGRADE_DISPLAY_COUNT = UPGRADES_CONFIG.displayCount ?? 5;
const INSTALL_BASE_MS = UPGRADES_CONFIG.installDurationBaseMs ?? UPGRADES_CONFIG.installDurationMs ?? 800;
const INSTALL_COST_FACTOR = UPGRADES_CONFIG.installDurationCostFactor ?? 0.12;
const INSTALL_TIER_EXPONENT = UPGRADES_CONFIG.installDurationTierExponent ?? 1;
const INSTALL_LOG10_CAP = UPGRADES_CONFIG.installDurationLog10Cap ?? 3;
/** Time (ms) an upgrade spends "installing". Fallback when formula not used (e.g. legacy). */
export const UPGRADE_INSTALL_DURATION_MS = UPGRADES_CONFIG.installDurationMs ?? INSTALL_BASE_MS;

/** Installation duration (ms): base × tier^exponent × (1 + costFactor × min(log10Cap, log10(cost))). */
export function getUpgradeInstallDurationMs(tier: number, costNumber: number): number {
  const cost = Math.max(1, costNumber);
  const logCost = Math.log10(cost);
  const costMult = 1 + INSTALL_COST_FACTOR * Math.min(INSTALL_LOG10_CAP, logCost);
  const tierFactor = Math.pow(tier, INSTALL_TIER_EXPONENT);
  return Math.round(INSTALL_BASE_MS * tierFactor * costMult);
}

/** Cost for the next copy of this upgrade (baseCost * multiplier^ownedCount). */
export function getUpgradeCost(def: UpgradeDef, ownedCount: number): Decimal {
  return toDecimal(def.cost).mul(Decimal.pow(UPGRADE_COST_MULT, ownedCount));
}

/** @param options.usesSlot - When set, overrides catalog (e.g. for research slot-free). Omit for catalog default / deserialization. */
export function createUpgrade(def: UpgradeDef, ownedCount: number = 0, options?: { usesSlot?: boolean }): Upgrade {
  const usesSlot = options?.usesSlot !== undefined ? options.usesSlot : def.usesSlot !== false;
  return new Upgrade(
    def.id,
    def.name,
    getUpgradeCost(def, ownedCount),
    new UpgradeEffect(toDecimal(def.coinsPerSecond)),
    usesSlot
  );
}

/** Whether this upgrade type uses a planet slot. Used when deserializing saves. */
export function getUpgradeUsesSlot(upgradeId: string): boolean {
  const def = UPGRADE_CATALOG.find((d) => d.id === upgradeId);
  return def?.usesSlot !== false;
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

/** Events available for this run: only positive until EVENT_NEGATIVE_UNLOCK_AFTER triggers. */
export function getEventPoolForRun(runEventsTriggered: number): GameEvent[] {
  if (runEventsTriggered >= EVENT_NEGATIVE_UNLOCK_AFTER) return EVENT_CATALOG;
  return EVENT_CATALOG.filter((e) => e.effect.multiplier >= 1);
}

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

/** Current combo multiplier from recent timestamps (same formula as handleMineClick). Used for production display so click rate reflects combo. */
export function getCurrentComboMultiplier(timestamps: number[], nowMs: number): number {
  const recent = timestamps.filter((t) => t > nowMs - COMBO_WINDOW_MS);
  if (recent.length < COMBO_MIN_CLICKS) return 1;
  return Math.min(COMBO_MAX_MULT, 1 + (recent.length - COMBO_MIN_CLICKS + 1) * COMBO_MULT_PER_LEVEL);
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
export const PRESTIGES_TODAY_KEY = (S as { prestigesTodayKey?: string }).prestigesTodayKey ?? 'stellar-miner-prestiges-today';

export const STATS_STORAGE_KEY = S.statsStorageKey;
export const STATS_HISTORY_STORAGE_KEY = S.statsHistoryStorageKey;
