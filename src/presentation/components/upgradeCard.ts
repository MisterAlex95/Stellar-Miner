/**
 * Shared upgrade card state and HTML builder. Used by upgradeListView for render and update.
 */
import type { Player } from '../../domain/entities/Player.js';
import { getSettings } from '../../application/gameState.js';
import { formatNumber } from '../../application/format.js';
import {
  type UpgradeDef,
  createUpgrade,
  getUpgradeCost,
} from '../../application/catalogs.js';
import {
  getEffectiveUpgradeUsesSlot,
  getEffectiveRequiredAstronauts,
} from '../../application/research.js';
import { t, tParam } from '../../application/strings.js';
import {
  getCatalogUpgradeName,
  getCatalogUpgradeDesc,
} from '../../application/i18nCatalogs.js';
import { getPlanetDisplayName } from '../../application/solarSystems.js';
import { buttonWithTooltipHtml } from './buttonTooltip.js';
import { escapeAttr } from './domUtils.js';

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

export interface BuildUpgradeCardHtmlOptions {
  choosePlanet: boolean;
  planetsForSelect: { id: string; name: string }[];
}

export function buildUpgradeCardHtml(state: UpgradeCardState, options: BuildUpgradeCardHtmlOptions): string {
  const settings = getSettings();
  const {
    def,
    owned,
    canBuy,
    hasCrew,
    maxCount,
    costCoins,
    costCrewLine,
    buyLabel,
    maxLabel,
    buyTitle,
    maxTitle,
    isRecommended,
    canUninstall,
    uninstallTitle,
    uninstallRefundCoins,
    planetsWithUpgrade,
  } = state;
  const { choosePlanet, planetsForSelect } = options;

  // When multiple planets, we use a modal to choose; no dropdown in the card.
  const planetSelectHtml = '';

  const rateStr = tParam('eachPerSecond', { n: formatNumber(def.coinsPerSecond, settings.compactNumbers) });
  const totalSec = owned > 0 ? ' · ' + tParam('totalPerSecond', { n: formatNumber(owned * def.coinsPerSecond, settings.compactNumbers) }) : '';
  const needsSlot = getEffectiveUpgradeUsesSlot(def.id);
  const slotCostSuffix = needsSlot ? ` · ${t('upgradeUsesSlot')}` : '';

  const desc = getCatalogUpgradeDesc(def.id);
  return `
    <div class="upgrade-strip">
      <div class="upgrade-strip-seg upgrade-strip-seg--identity">
        <span class="upgrade-tier" aria-label="${escapeAttr(tParam('tierLabel', { n: def.tier }))}" data-tier="${def.tier}">T${def.tier}</span>
        <div class="upgrade-title-row">
          <span class="upgrade-name">${getCatalogUpgradeName(def.id)}</span>
          ${owned > 0 ? `<span class="upgrade-count-badge">×${owned}</span>` : ''}
          ${isRecommended ? '<span class="upgrade-recommended">' + t('recommended') + '</span>' : ''}
          <span class="upgrade-title-row-right"><span class="upgrade-title-row-output" aria-live="polite"><span class="upgrade-effect-chip">${rateStr}</span>${owned > 0 ? totalSec : ''}</span><span class="upgrade-title-row-cost">${costCoins}${costCrewLine ? ` ${costCrewLine}` : ''}${slotCostSuffix}</span></span>
        </div>
        <span class="upgrade-description" title="${escapeAttr(desc)}">${desc}</span>
      </div>
      <div class="upgrade-strip-seg upgrade-strip-seg--actions">
        ${planetSelectHtml}
        <div class="upgrade-buttons">
          ${buttonWithTooltipHtml(buyTitle, `<button class="upgrade-btn upgrade-btn--buy" type="button" data-upgrade-id="${def.id}" data-action="buy" ${canBuy ? '' : 'disabled'}>${buyLabel}</button>`)}
          ${buttonWithTooltipHtml(maxTitle, `<button class="upgrade-btn upgrade-btn--max" type="button" data-upgrade-id="${def.id}" data-action="max" data-max-count="${maxCount}" ${maxCount > 0 && hasCrew ? '' : 'disabled'}>${maxLabel}</button>`)}
        </div>
      </div>
      ${canUninstall ? `
      <div class="upgrade-strip-seg upgrade-strip-seg--uninstall">
        <div class="upgrade-uninstall-line">
          ${buttonWithTooltipHtml(uninstallTitle, `<button class="upgrade-btn upgrade-uninstall-btn" type="button" data-upgrade-id="${def.id}" data-action="uninstall"${planetsWithUpgrade.length === 1 ? ` data-uninstall-planet-id="${escapeAttr(planetsWithUpgrade[0].id)}"` : ` data-uninstall-planets="${escapeAttr(JSON.stringify(planetsWithUpgrade))}"`}>${t('uninstallLabel')}</button>`)}
        </div>
      </div>` : ''}
    </div>`;
}
