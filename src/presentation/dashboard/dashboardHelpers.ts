/**
 * Dashboard helper functions: upgrade goals, research, time estimates.
 */
import Decimal from 'break_infinity.js';
import { getSession, getSettings, planetService } from '../../application/gameState.js';
import { UPGRADE_CATALOG, getUnlockedUpgradeTiers, getUpgradeCost } from '../../application/catalogs.js';
import { getUpgradeCardState } from '../components/upgradeCard.js';
import { getCatalogUpgradeName } from '../../application/i18nCatalogs.js';
import { RESEARCH_CATALOG, canAttemptResearch } from '../../application/research.js';
import type { ResearchNode } from '../../application/research.js';
import { getMaxBuyCount } from '../upgradeListView.js';

/** Ordered upgrade defs (by tier) the player can see. */
export function getOrderedUpgradeDefs(player: { upgrades: { id: string }[] }) {
  const ownedIds = player.upgrades.map((u) => u.id);
  const unlockedTiers = getUnlockedUpgradeTiers(ownedIds);
  return UPGRADE_CATALOG.filter((d) => unlockedTiers.has(d.tier)).sort((a, b) => a.tier - b.tier);
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
