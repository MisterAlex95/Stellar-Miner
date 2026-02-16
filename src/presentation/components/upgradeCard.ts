/**
 * Shared upgrade card state and HTML builder. Used by upgradeListView for render and update.
 */
import type { Player } from '../../domain/entities/Player.js';
import { getSettings } from '../../application/gameState.js';
import { formatNumber } from '../../application/format.js';
import {
  type UpgradeDef,
  createUpgrade,
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
  const hasCrew = player.freeCrewCount >= crewReq;
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
  };
}

export interface BuildUpgradeCardHtmlOptions {
  choosePlanet: boolean;
  planetsForSelect: { id: string; name: string }[];
}

export function buildUpgradeCardHtml(state: UpgradeCardState, options: BuildUpgradeCardHtmlOptions): string {
  const settings = getSettings();
  const { def, owned, canBuy, hasCrew, maxCount, costCoins, costCrewLine, buyLabel, maxLabel, buyTitle, maxTitle, isRecommended } = state;
  const { choosePlanet, planetsForSelect } = options;

  const planetOptions =
    planetsForSelect.length > 0
      ? planetsForSelect
          .map((p, i) => `<option value="${escapeAttr(p.id)}"${i === 0 ? ' selected' : ''}>${escapeAttr(p.name)}</option>`)
          .join('')
      : '';
  const planetSelectHtml = choosePlanet
    ? `<label class="upgrade-planet-label" for="planet-${escapeAttr(def.id)}">${t('toPlanet')}</label><select class="upgrade-planet-select" id="planet-${escapeAttr(def.id)}" data-upgrade-id="${escapeAttr(def.id)}" aria-label="${escapeAttr(t('assignToPlanet'))}">${planetOptions}</select>`
    : '';

  const eachSec = tParam('eachPerSecond', { n: formatNumber(def.coinsPerSecond, settings.compactNumbers) });
  const totalSec = owned > 0 ? ' · ' + tParam('totalPerSecond', { n: formatNumber(owned * def.coinsPerSecond, settings.compactNumbers) }) : '';
  const slotCostText = getEffectiveUpgradeUsesSlot(def.id) ? t('upgradeUsesSlot') : t('upgradeNoSlot');

  return `
    <div class="upgrade-info">
      <div class="upgrade-header">
        <span class="upgrade-tier" aria-label="${escapeAttr(tParam('tierLabel', { n: def.tier }))}" data-tier="${def.tier}">T${def.tier}</span>
        <div class="upgrade-title-row">
          <span class="upgrade-name">${getCatalogUpgradeName(def.id)}</span>
          ${owned > 0 ? `<span class="upgrade-count-badge">×${owned}</span>` : ''}
          ${isRecommended ? '<span class="upgrade-recommended">' + t('recommended') + '</span>' : ''}
        </div>
      </div>
      <p class="upgrade-description">${getCatalogUpgradeDesc(def.id)}</p>
      <div class="upgrade-effect" aria-live="polite">
        <span class="upgrade-effect-each">${eachSec}</span>
        ${owned > 0 ? `<span class="upgrade-effect-total">${totalSec}</span>` : ''}
      </div>
    </div>
    <div class="upgrade-right">
      <div class="upgrade-cost">
        <span class="upgrade-cost-coins">${costCoins}</span>
        ${costCrewLine ? `<span class="upgrade-cost-crew">${costCrewLine}</span>` : ''}
        <span class="upgrade-cost-slot">· ${slotCostText}</span>
      </div>
      <div class="upgrade-actions">
        ${planetSelectHtml}
        <div class="upgrade-buttons">
          ${buttonWithTooltipHtml(buyTitle, `<button class="upgrade-btn upgrade-btn--buy" type="button" data-upgrade-id="${def.id}" data-action="buy" ${canBuy ? '' : 'disabled'}>${buyLabel}</button>`)}
          ${buttonWithTooltipHtml(maxTitle, `<button class="upgrade-btn upgrade-btn--max" type="button" data-upgrade-id="${def.id}" data-action="max" data-max-count="${maxCount}" ${maxCount > 0 && hasCrew ? '' : 'disabled'}>${maxLabel}</button>`)}
        </div>
      </div>
    </div>`;
}
