/**
 * Dashboard helper functions: upgrade goals, research, time estimates.
 */
import Decimal from 'break_infinity.js';
import { getSession, getSettings, planetService } from '../application/gameState.js';
import { UPGRADE_CATALOG, getUnlockedUpgradeTiers, getUpgradeCost } from '../application/catalogs.js';
import { getUpgradeCardState } from '../application/upgradeCardState.js';
import { getCatalogUpgradeName } from '../application/i18nCatalogs.js';
import { getPlanetType, getPlanetTypeMultiplier } from '../application/planetAffinity.js';
import { RESEARCH_CATALOG, canAttemptResearch } from '../application/research.js';
import type { ResearchNode } from '../application/research.js';
import { getMaxBuyCount } from '../application/upgradeHelpers.js';

/** Ordered upgrade defs (by tier) the player can see. Next tier unlocks only when install is finished. */
export function getOrderedUpgradeDefs(player: { upgrades: { id: string }[] }) {
  const ownedIds = player.upgrades.map((u) => u.id);
  const unlockedTiers = getUnlockedUpgradeTiers(ownedIds);
  return UPGRADE_CATALOG.filter((d) => unlockedTiers.has(d.tier)).sort((a, b) => a.tier - b.tier);
}

/** True if there is at least one upgrade the player has never installed and can install now. */
export function hasNewInstallableUpgrade(): boolean {
  const session = getSession();
  if (!session) return false;
  const player = session.player;
  const settings = getSettings();
  const planetWithSlot = player.getPlanetWithFreeSlot();
  const hasFreeSlot = planetWithSlot !== null;
  const defs = getOrderedUpgradeDefs(player);
  for (const def of defs) {
    const owned = player.upgrades.filter((u) => u.id === def.id).length;
    const installingCount = player.planets.reduce(
      (s, p) => s + p.installingUpgrades.filter((i) => i.upgrade.id === def.id).length,
      0
    );
    if (owned + installingCount > 0) continue;
    const maxCount = getMaxBuyCount(def.id);
    const state = getUpgradeCardState(def, player, settings, hasFreeSlot, maxCount);
    if (state.canBuy) return true;
  }
  return false;
}

/** Best effective production (coinsPerSecond * planet multiplier) for this upgrade on a planet the player can place on. */
function getBestEffectiveRateForPlacement(
  upgradeId: string,
  coinsPerSecond: number,
  player: { planets: { id: string; name: string; hasFreeSlot: () => boolean }[] },
  needsSlot: boolean
): { effectiveRate: number; planetId: string | undefined } {
  const candidates = needsSlot ? player.planets.filter((p) => p.hasFreeSlot()) : player.planets;
  if (candidates.length === 0) return { effectiveRate: coinsPerSecond, planetId: undefined };
  let best = 0;
  let bestPlanetId: string | undefined;
  for (const p of candidates) {
    const mult = getPlanetTypeMultiplier(upgradeId, getPlanetType(p.name));
    const rate = coinsPerSecond * mult;
    if (rate > best) {
      best = rate;
      bestPlanetId = p.id;
    }
  }
  return { effectiveRate: best, planetId: bestPlanetId };
}

/** Best affordable upgrade given current coins and available planets (affinity). Returns same shape as getNextAffordableUpgrade. */
export function getBestNextAffordableUpgrade(): { def: { id: string }; cost: string; planetId?: string } | null {
  const session = getSession();
  if (!session) return null;
  const player = session.player;
  const settings = getSettings();
  const hasFreeSlot = player.getPlanetWithFreeSlot() !== null;
  const defs = getOrderedUpgradeDefs(player);
  let best: { def: { id: string }; cost: string; planetId?: string; effectiveRate: number; tier: number } | null = null;
  for (const def of defs) {
    const maxCount = getMaxBuyCount(def.id);
    const state = getUpgradeCardState(def, player, settings, hasFreeSlot, maxCount);
    if (!state.canBuy) continue;
    const { effectiveRate, planetId } = getBestEffectiveRateForPlacement(
      def.id,
      def.coinsPerSecond,
      player,
      state.needsSlot
    );
    if (best === null || effectiveRate > best.effectiveRate || (effectiveRate === best.effectiveRate && def.tier < best.tier)) {
      best = {
        def: { id: def.id },
        cost: state.costCoins,
        planetId,
        effectiveRate,
        tier: def.tier,
      };
    }
  }
  if (!best) return null;
  return { def: best.def, cost: best.cost, planetId: best.planetId };
}

/** First affordable upgrade (by tier order), or null. */
export function getNextAffordableUpgrade(): { def: { id: string }; cost: string; planetId?: string } | null {
  const session = getSession();
  if (!session) return null;
  const player = session.player;
  const settings = getSettings();
  const planetWithSlot = player.getPlanetWithFreeSlot();
  const hasFreeSlot = planetWithSlot !== null;
  const defs = getOrderedUpgradeDefs(player);
  for (const def of defs) {
    const maxCount = getMaxBuyCount(def.id);
    const state = getUpgradeCardState(def, player, settings, hasFreeSlot, maxCount);
    if (state.canBuy) {
      return {
        def: { id: def.id },
        cost: state.costCoins,
        planetId: planetWithSlot?.id,
      };
    }
  }
  return null;
}

/** First upgrade (by tier) we cannot afford yet — for "~X min to [name]" only when slot+crew are OK. */
export function getNextUpgradeGoalCoinOnly(): { def: { id: string }; cost: Decimal; name: string } | null {
  const session = getSession();
  if (!session) return null;
  const player = session.player;
  const settings = getSettings();
  const planetWithSlot = player.getPlanetWithFreeSlot();
  const hasFreeSlot = planetWithSlot !== null;
  const defs = getOrderedUpgradeDefs(player);
  for (const def of defs) {
    const maxCount = getMaxBuyCount(def.id);
    const state = getUpgradeCardState(def, player, settings, hasFreeSlot, maxCount);
    if (!state.canBuy && state.canPlace && state.hasCrew) {
      const owned = player.upgrades.filter((u) => u.id === def.id).length;
      const cost = getUpgradeCost(def, owned);
      return { def: { id: def.id }, cost, name: getCatalogUpgradeName(def.id) };
    }
  }
  return null;
}

/** Next upgrade we cannot afford yet that would be best on current planets (for "X min to [name]" with current coins). */
export function getBestNextUpgradeGoalCoinOnly(): { def: { id: string }; cost: Decimal; name: string } | null {
  const session = getSession();
  if (!session) return null;
  const player = session.player;
  const settings = getSettings();
  const hasFreeSlot = player.getPlanetWithFreeSlot() !== null;
  const defs = getOrderedUpgradeDefs(player);
  let best: { def: { id: string }; cost: Decimal; name: string; effectiveRate: number } | null = null;
  for (const def of defs) {
    const maxCount = getMaxBuyCount(def.id);
    const state = getUpgradeCardState(def, player, settings, hasFreeSlot, maxCount);
    if (!state.canBuy && state.canPlace && state.hasCrew) {
      const owned = player.upgrades.filter((u) => u.id === def.id).length;
      const cost = getUpgradeCost(def, owned);
      const { effectiveRate } = getBestEffectiveRateForPlacement(def.id, def.coinsPerSecond, player, state.needsSlot);
      if (best === null || effectiveRate > best.effectiveRate) {
        best = { def: { id: def.id }, cost, name: getCatalogUpgradeName(def.id), effectiveRate };
      }
    }
  }
  if (!best) return null;
  return { def: best.def, cost: best.cost, name: best.name };
}

/** First upgrade we cannot buy yet, with its card state — to recommend "add slot" or "hire crew". */
export function getNextUpgradeGoalWithState(): {
  def: { id: string };
  cost: Decimal;
  name: string;
  canPlace: boolean;
  hasCrew: boolean;
  needsSlot: boolean;
  crewReq: number;
} | null {
  const session = getSession();
  if (!session) return null;
  const player = session.player;
  const settings = getSettings();
  const planetWithSlot = player.getPlanetWithFreeSlot();
  const hasFreeSlot = planetWithSlot !== null;
  const defs = getOrderedUpgradeDefs(player);
  for (const def of defs) {
    const maxCount = getMaxBuyCount(def.id);
    const state = getUpgradeCardState(def, player, settings, hasFreeSlot, maxCount);
    if (!state.canBuy) {
      const owned = player.upgrades.filter((u) => u.id === def.id).length;
      const cost = getUpgradeCost(def, owned);
      return {
        def: { id: def.id },
        cost,
        name: getCatalogUpgradeName(def.id),
        canPlace: state.canPlace,
        hasCrew: state.hasCrew,
        needsSlot: state.needsSlot,
        crewReq: state.crewReq,
      };
    }
  }
  return null;
}

/** Best upgrade we cannot buy yet (by impact on current planets), with state — for "add slot" / "hire crew" / time. */
export function getBestNextUpgradeGoalWithState(): {
  def: { id: string };
  cost: Decimal;
  name: string;
  canPlace: boolean;
  hasCrew: boolean;
  needsSlot: boolean;
  crewReq: number;
} | null {
  const session = getSession();
  if (!session) return null;
  const player = session.player;
  const settings = getSettings();
  const hasFreeSlot = player.getPlanetWithFreeSlot() !== null;
  const defs = getOrderedUpgradeDefs(player);
  let best: {
    def: { id: string };
    cost: Decimal;
    name: string;
    canPlace: boolean;
    hasCrew: boolean;
    needsSlot: boolean;
    crewReq: number;
    effectiveRate: number;
  } | null = null;
  for (const def of defs) {
    const maxCount = getMaxBuyCount(def.id);
    const state = getUpgradeCardState(def, player, settings, hasFreeSlot, maxCount);
    if (!state.canBuy) {
      const owned = player.upgrades.filter((u) => u.id === def.id).length;
      const cost = getUpgradeCost(def, owned);
      const { effectiveRate } = getBestEffectiveRateForPlacement(def.id, def.coinsPerSecond, player, state.needsSlot);
      if (best === null || effectiveRate > best.effectiveRate) {
        best = {
          def: { id: def.id },
          cost,
          name: getCatalogUpgradeName(def.id),
          canPlace: state.canPlace,
          hasCrew: state.hasCrew,
          needsSlot: state.needsSlot,
          crewReq: state.crewReq,
          effectiveRate,
        };
      }
    }
  }
  if (!best) return null;
  return {
    def: best.def,
    cost: best.cost,
    name: best.name,
    canPlace: best.canPlace,
    hasCrew: best.hasCrew,
    needsSlot: best.needsSlot,
    crewReq: best.crewReq,
  };
}

/** First attemptable research node the player can afford (by row/col order), or null. */
export function getNextAttemptableResearchAffordable(): ResearchNode | null {
  const session = getSession();
  if (!session) return null;
  const player = session.player;
  const attemptable = RESEARCH_CATALOG.filter((n) => canAttemptResearch(n.id)).sort(
    (a, b) => (a.row !== b.row ? a.row - b.row : a.col - b.col)
  );
  for (const node of attemptable) {
    if (player.coins.gte(node.cost)) return node;
  }
  return null;
}

/** Minutes until we reach a coin target at current rate (effective production). */
export function minutesUntil(coinsNeeded: Decimal, ratePerSec: Decimal): number {
  if (ratePerSec.lte(0)) return Infinity;
  const secs = coinsNeeded.div(ratePerSec);
  const num = secs.toNumber();
  return Number.isFinite(num) && num >= 0 ? Math.ceil(num / 60) : Infinity;
}
