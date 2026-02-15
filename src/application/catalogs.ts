import { Upgrade } from '../domain/entities/Upgrade.js';
import { GameEvent } from '../domain/entities/GameEvent.js';
import { UpgradeEffect } from '../domain/value-objects/UpgradeEffect.js';
import { EventEffect } from '../domain/value-objects/EventEffect.js';

export const SAVE_INTERVAL_MS = 3000;
export const EVENT_INTERVAL_MS = 90_000;
export const MIN_EVENT_DELAY_MS = 45_000;
export const STATS_HISTORY_INTERVAL_MS = 5000;
export const STATS_HISTORY_MAX_POINTS = 80;
export const STATS_LONG_TERM_INTERVAL_MS = 60_000;
export const STATS_LONG_TERM_MAX_POINTS = 120;

export type UpgradeDef = {
  id: string;
  name: string;
  description: string;
  cost: number;
  coinsPerSecond: number;
  tier: number;
  requiredAstronauts: number;
};

export const UPGRADE_CATALOG: UpgradeDef[] = [
  { id: 'mining-robot', name: 'Mining Robot', description: 'Basic autonomous miner. Your first step into the belt.', cost: 100, coinsPerSecond: 2, tier: 1, requiredAstronauts: 0 },
  { id: 'drill-mk1', name: 'Drill Mk.I', description: 'Improved extraction head. Needs an operator. Cuts through surface rock in seconds.', cost: 500, coinsPerSecond: 10, tier: 2, requiredAstronauts: 1 },
  { id: 'drill-mk2', name: 'Drill Mk.II', description: 'Heavy-duty surface drill. Built for long shifts in the void. Requires trained crew.', cost: 2500, coinsPerSecond: 50, tier: 3, requiredAstronauts: 2 },
  { id: 'asteroid-rig', name: 'Asteroid Rig', description: 'Full mining platform. Drills, crushes, and sorts in one unit. Needs a team.', cost: 12500, coinsPerSecond: 250, tier: 4, requiredAstronauts: 2 },
  { id: 'orbital-station', name: 'Orbital Station', description: 'Refinery and logistics hub. The heart of your operation. Crew-intensive.', cost: 62500, coinsPerSecond: 1250, tier: 5, requiredAstronauts: 3 },
  { id: 'deep-core-drill', name: 'Deep Core Drill', description: 'Penetrates dense ore layers. Reaches what others can\'t. Requires specialist crew.', cost: 312500, coinsPerSecond: 6250, tier: 6, requiredAstronauts: 3 },
  { id: 'stellar-harvester', name: 'Stellar Harvester', description: 'Harvests rare minerals at scale. Feeds the entire sector.', cost: 1562500, coinsPerSecond: 31250, tier: 7, requiredAstronauts: 4 },
  { id: 'quantum-extractor', name: 'Quantum Extractor', description: 'Maximum efficiency extraction. Near-instant ore processing. Needs expert crew.', cost: 7812500, coinsPerSecond: 156250, tier: 8, requiredAstronauts: 4 },
  { id: 'void-crusher', name: 'Void Crusher', description: 'Pulverizes asteroid cores. Built for the endgame.', cost: 39062500, coinsPerSecond: 781250, tier: 9, requiredAstronauts: 5 },
  { id: 'nexus-collector', name: 'Nexus Collector', description: 'Harvests from multiple dimensions. The ultimate upgrade. Full crew required.', cost: 195312500, coinsPerSecond: 3906250, tier: 10, requiredAstronauts: 5 },
];

export function createUpgrade(def: UpgradeDef): Upgrade {
  return new Upgrade(def.id, def.name, def.cost, new UpgradeEffect(def.coinsPerSecond));
}

/** Tiers the player has unlocked for display. Tier 1 is always visible; tier n+1 unlocks when player owns at least one upgrade of tier n. */
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

export const EVENT_CATALOG: GameEvent[] = [
  new GameEvent('meteor-storm', 'Meteor Storm', new EventEffect(2, 30_000)),
  new GameEvent('solar-flare', 'Solar Flare', new EventEffect(1.5, 45_000)),
  new GameEvent('rich-vein', 'Rich Vein', new EventEffect(2.5, 20_000)),
  new GameEvent('void-bonus', 'Void Bonus', new EventEffect(1.25, 60_000)),
  new GameEvent('lucky-strike', 'Lucky Strike', new EventEffect(3, 15_000)),
  new GameEvent('asteroid-rush', 'Asteroid Rush', new EventEffect(1.8, 25_000)),
  new GameEvent('solar-wind', 'Solar Wind', new EventEffect(1.15, 90_000)),
  new GameEvent('comet-tail', 'Comet Tail', new EventEffect(1.4, 40_000)),
  new GameEvent('nebula-bloom', 'Nebula Bloom', new EventEffect(1.2, 75_000)),
];

export const UPGRADE_GROUPS: { label: string; minTier: number; maxTier: number }[] = [
  { label: 'Early', minTier: 1, maxTier: 3 },
  { label: 'Mid', minTier: 4, maxTier: 6 },
  { label: 'Late', minTier: 7, maxTier: 10 },
];

export const COMBO_WINDOW_MS = 2500;
export const COMBO_MIN_CLICKS = 5;
export const COMBO_MULT_PER_LEVEL = 0.1;
export const COMBO_MAX_MULT = 1.6;

export const COMBO_NAMES: { minMult: number; name: string }[] = [
  { minMult: 1.6, name: 'Mega' },
  { minMult: 1.5, name: 'Legendary' },
  { minMult: 1.4, name: 'Unstoppable' },
  { minMult: 1.3, name: 'On fire' },
  { minMult: 1.2, name: 'Hot' },
  { minMult: 1.1, name: 'Combo' },
];

export function getComboName(mult: number): string {
  for (const t of COMBO_NAMES) {
    if (mult >= t.minMult) return t.name;
  }
  return 'Combo';
}

export const LUCKY_CLICK_CHANCE = 0.04;
export const LUCKY_MIN = 5;
export const LUCKY_MAX = 22;
export const SUPER_LUCKY_CHANCE = 0.006;
export const SUPER_LUCKY_MIN = 40;
export const SUPER_LUCKY_MAX = 85;
export const CRITICAL_CLICK_CHANCE = 0.0015;

export const DAILY_BONUS_COINS = 5;
export const TOTAL_CLICKS_KEY = 'stellar-miner-total-clicks';
export const LAST_DAILY_BONUS_KEY = 'stellar-miner-daily-bonus-date';
export const ACHIEVEMENTS_KEY = 'stellar-miner-achievements';
export const QUEST_STORAGE_KEY = 'stellar-miner-quest';
export const MILESTONES_STORAGE_KEY = 'stellar-miner-milestones';
export const QUEST_STREAK_KEY = 'stellar-miner-quest-streak';
export const QUEST_STREAK_WINDOW_MS = 5 * 60 * 1000;
export const QUEST_STREAK_BONUS_PER_LEVEL = 0.15;
export const QUEST_STREAK_MAX = 3;
export const QUEST_LAST_CLAIM_KEY = 'stellar-miner-quest-last-claim';

export const MILESTONES = [100, 500, 1000, 5000, 10000, 25000, 50000, 100000, 500000, 1000000, 2500000, 5000000];
export const COMBO_MASTER_KEY = 'stellar-miner-combo-master';

export const STATS_STORAGE_KEY = 'stellar-miner-stats';
export const STATS_HISTORY_STORAGE_KEY = 'stellar-miner-stats-history';
