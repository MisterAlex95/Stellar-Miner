/**
 * Upgrade card state for dashboard and upgrade list. Presentation-agnostic.
 */
import type { Player } from '../domain/entities/Player.js';
import { getSettings } from './gameState.js';
import { formatNumber } from './format.js';
import {
  type UpgradeDef,
  createUpgrade,
  getUpgradeCost,
} from './catalogs.js';
import {
  getEffectiveUpgradeUsesSlot,
  getEffectiveRequiredAstronauts,
} from './research.js';
import { t, tParam } from './strings.js';
import {
  getCatalogUpgradeName,
} from './i18nCatalogs.js';
import { getPlanetDisplayName } from './solarSystems.js';

export interface UpgradeCardState {
  def: UpgradeDef;
  owned: number;
  canBuy: boolean;
  canPlace: boolean;
  hasCrew: boolean;
  crewReq: number;
  needsSlot: boolean;
  buyLabel: string;
  maxLabel: string;
  maxCount: number;
  costCoins: string;
  costCrewLine: string;
  buyTitle: string;
  maxTitle: string;
  isRecommended: boolean;
  canUninstall: boolean;
  uninstallTitle: string;
  uninstallRefundCoins: string;
  /** Planets that have at least one of this upgrade (for uninstall planet choice). */
  planetsWithUpgrade: { id: string; name: string }[];
}

export function getUpgradeCardState(
  def: UpgradeDef,
  player: Player,
  settings: { compactNumbers: boolean },
  hasFreeSlot: boolean,
  maxCount: number
): UpgradeCardState {
  const owned = player.upgrades.filter((u) => u.id === def.id).length;
  const installingCount = player.planets.reduce(
    (s, p) => s + p.installingUpgrades.filter((i) => i.upgrade.id === def.id).length,
    0
  );
  const ownedForCost = owned + installingCount;
  const upgrade = createUpgrade(def, ownedForCost);
  const crewReq = getEffectiveRequiredAstronauts(def.id);
  const hasCrew = player.freeAstronautCount >= crewReq;
  const canAfford = player.coins.gte(upgrade.cost);
  const needsSlot = getEffectiveUpgradeUsesSlot(def.id);
  const canPlace = needsSlot ? hasFreeSlot : player.planets.length > 0;
  const canBuy = canAfford && canPlace && hasCrew;
  const buyLabel = t('buyLabel');
  const maxLabel = maxCount > 1 ? tParam('maxLabelCount', { n: maxCount }) : t('maxLabel');
  const costCoins = `${formatNumber(upgrade.cost, settings.compactNumbers)} ⬡`;
  const costCrewLine = crewReq > 0 ? tParam('crewCostShort', { n: crewReq }) : '';

  let buyTitle = '';
  if (!canBuy) {
    if (!hasCrew && crewReq > 0) buyTitle = tParam('needAstronauts', { n: crewReq });
    else if (!canPlace && needsSlot) buyTitle = t('noFreeSlot');
    else if (!canAfford) buyTitle = tParam('needCoinsToBuy', { cost: costCoins, crew: costCrewLine ? ` + ${costCrewLine}` : '' });
    else buyTitle = tParam('needCoinsAndSlot', { cost: costCoins });
  } else {
    buyTitle = tParam('buyUpgradeTitle', { name: getCatalogUpgradeName(def.id), cost: costCoins + (costCrewLine ? ` + ${costCrewLine}` : '') });
  }

  let maxTitle = t('maxBuyTooltip');
  if (maxCount <= 0 || !hasCrew) {
    if (!hasCrew && crewReq > 0) maxTitle = t('needCrewToBuy');
    else if (!canPlace && needsSlot) maxTitle = t('noFreeSlot');
    else if (!canAfford) maxTitle = tParam('needCoinsForOne', { cost: costCoins });
    else maxTitle = t('noSlotsOrCoins');
  }

  const isRecommended = canBuy && !player.upgrades.some((u) => u.id === def.id);

  const canUninstall = owned > 0;
  const uninstallRefundCoins =
    owned > 0 ? formatNumber(getUpgradeCost(def, owned - 1), settings.compactNumbers) : '';
  const uninstallTitle = canUninstall ? tParam('uninstallTitle', { cost: uninstallRefundCoins }) : '';
  const planetsWithUpgrade = player.planets
    .filter((p) => p.upgrades.some((u) => u.id === def.id))
    .map((p) => {
      const idx = player.planets.findIndex((pl) => pl.id === p.id);
      return { id: p.id, name: getPlanetDisplayName(p.name, idx >= 0 ? idx : 0) };
    });

  return {
    def,
    owned,
    canBuy,
    canPlace,
    hasCrew,
    crewReq,
    needsSlot,
    buyLabel,
    maxLabel,
    maxCount,
    costCoins,
    costCrewLine,
    buyTitle,
    maxTitle,
    isRecommended,
    canUninstall,
    uninstallTitle,
    uninstallRefundCoins,
    planetsWithUpgrade,
  };
}
