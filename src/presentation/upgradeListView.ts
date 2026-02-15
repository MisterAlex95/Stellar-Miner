import { getSession, getSettings } from '../application/gameState.js';
import {
  UPGRADE_CATALOG,
  getUnlockedUpgradeTiers,
  getUpgradeCost,
  UPGRADE_DISPLAY_COUNT,
} from '../application/catalogs.js';
import { getEffectiveUpgradeUsesSlot, getEffectiveRequiredAstronauts } from '../application/research.js';
import { getPlanetDisplayName } from '../application/solarSystems.js';
import { t, tParam } from '../application/strings.js';
import { formatNumber } from '../application/format.js';
import { getCatalogUpgradeName } from '../application/i18nCatalogs.js';
import { updateStats } from './statsView.js';
import { updateTooltipForButton } from './components/buttonTooltip.js';
import { getUpgradeCardState, buildUpgradeCardHtml } from './components/upgradeCard.js';

const UPGRADE_LIST_ID = 'upgrade-list';

export function getMaxBuyCount(upgradeId: string): number {
  const session = getSession();
  if (!session) return 0;
  const def = UPGRADE_CATALOG.find((d) => d.id === upgradeId);
  if (!def) return 0;
  const player = session.player;
  const usesSlot = getEffectiveUpgradeUsesSlot(def.id);
  // Use raw free slots so the count matches handleUpgradeBuyMax (which uses getPlanetsWithFreeSlot).
  const freeSlots = usesSlot
    ? player.planets.reduce((s, p) => s + p.freeSlots, 0)
    : Number.MAX_SAFE_INTEGER;
  const effectiveCrew = getEffectiveRequiredAstronauts(def.id);
  const maxByCrew = effectiveCrew === 0 ? Number.MAX_SAFE_INTEGER : Math.floor(player.astronautCount / effectiveCrew);
  if (freeSlots <= 0 || maxByCrew <= 0) return 0;
  const ownedCount = player.upgrades.filter((u) => u.id === upgradeId).length;
  let count = 0;
  let remaining = player.coins.value;
  while (count < freeSlots && count < maxByCrew) {
    const nextCost = getUpgradeCost(def, ownedCount + count);
    if (remaining.lt(nextCost)) break;
    remaining = remaining.sub(nextCost);
    count++;
  }
  return count;
}

export function renderUpgradeList(): void {
  const session = getSession();
  if (!session) return;
  const player = session.player;
  const settings = getSettings();
  const listEl = document.getElementById(UPGRADE_LIST_ID);
  if (!listEl) return;
  listEl.innerHTML = '';

  // Use raw free slots so UI matches handler (handler uses getPlanetWithFreeSlot).
  const planetsWithSlot = player.getPlanetsWithFreeSlot();
  const hasFreeSlot = planetsWithSlot.length > 0;
  const choosePlanet = player.planets.length > 1;
  const hasAnyPlanet = player.planets.length > 0;

  const ownedIds = player.upgrades.map((u) => u.id);
  const unlockedTiers = getUnlockedUpgradeTiers(ownedIds);
  const allUnlockedDefs = UPGRADE_CATALOG.filter((d) => unlockedTiers.has(d.tier)).sort((a, b) => a.tier - b.tier);
  const defsToShow = allUnlockedDefs.slice(0, UPGRADE_DISPLAY_COUNT);

  for (const def of defsToShow) {
    const maxCount = getMaxBuyCount(def.id);
    const state = getUpgradeCardState(def, player, settings, hasFreeSlot, maxCount);
    const planetList = state.needsSlot ? planetsWithSlot : player.planets;
    const planetsForSelect = planetList.map((p) => {
      const idx = player.planets.findIndex((pl) => pl.id === p.id);
      return { id: p.id, name: getPlanetDisplayName(p.name, idx >= 0 ? idx : 0) };
    });
    const card = document.createElement('div');
    card.className =
      'upgrade-card' +
      (state.canBuy ? ' upgrade-card--affordable' : '') +
      (state.isRecommended ? ' upgrade-card--recommended' : '') +
      (!state.hasCrew && state.crewReq > 0 ? ' upgrade-card--needs-crew' : '');
    card.setAttribute('data-tier', String(def.tier));
    card.setAttribute('data-upgrade-id', def.id);
    card.innerHTML = buildUpgradeCardHtml(state, {
      choosePlanet,
      planetsForSelect,
    });
    listEl.appendChild(card);
  }
}

export function updateUpgradeListInPlace(): void {
  const session = getSession();
  if (!session) return;
  const player = session.player;
  const settings = getSettings();
  const listEl = document.getElementById(UPGRADE_LIST_ID);
  if (!listEl) return;

  const hasFreeSlot = player.getPlanetWithFreeSlot() !== null;
  const cards = listEl.querySelectorAll('.upgrade-card');
  for (const card of cards) {
    const buyBtn = card.querySelector('.upgrade-btn--buy');
    const id = (buyBtn?.getAttribute('data-upgrade-id') ?? card.getAttribute('data-upgrade-id')) ?? null;
    if (!id) continue;
    const def = UPGRADE_CATALOG.find((d) => d.id === id);
    if (!def) continue;
    const maxCount = getMaxBuyCount(id);
    const state = getUpgradeCardState(def, player, settings, hasFreeSlot, maxCount);

    const titleRow = card.querySelector('.upgrade-title-row');
    if (titleRow) {
      titleRow.innerHTML =
        `<span class="upgrade-name">${getCatalogUpgradeName(id)}</span>` +
        (state.owned > 0 ? `<span class="upgrade-count-badge">×${state.owned}</span>` : '') +
        (state.isRecommended ? '<span class="upgrade-recommended">' + t('recommended') + '</span>' : '');
    }
    const effectEl = card.querySelector('.upgrade-effect');
    if (effectEl) {
      const eachSec = tParam('eachPerSecond', { n: formatNumber(def.coinsPerSecond, settings.compactNumbers) });
      const totalSec = state.owned > 0 ? ' · ' + tParam('totalPerSecond', { n: formatNumber(state.owned * def.coinsPerSecond, settings.compactNumbers) }) : '';
      effectEl.innerHTML =
        `<span class="upgrade-effect-each">${eachSec}</span>` +
        (state.owned > 0 ? `<span class="upgrade-effect-total">${totalSec}</span>` : '');
    }
    const select = card.querySelector('.upgrade-planet-select') as HTMLSelectElement | null;
    if (select) {
      const planetsForSelect = state.needsSlot ? player.getPlanetsWithFreeSlot() : player.planets;
      if (planetsForSelect.length !== select.options.length) {
        updateStats();
        renderUpgradeList();
        return;
      }
      const selectedId = select.options[select.selectedIndex]?.value;
      if (selectedId && !planetsForSelect.some((p) => p.id === selectedId)) {
        select.value = planetsForSelect[0]?.id ?? '';
      }
    }
    if (buyBtn instanceof HTMLElement) {
      buyBtn.textContent = state.buyLabel;
      buyBtn.toggleAttribute('disabled', !state.canBuy);
      updateTooltipForButton(buyBtn, state.buyTitle);
    }
    const maxBtn = card.querySelector('.upgrade-btn--max');
    if (maxBtn instanceof HTMLElement) {
      maxBtn.textContent = state.maxLabel;
      maxBtn.toggleAttribute('disabled', state.maxCount <= 0 || !state.hasCrew);
      updateTooltipForButton(maxBtn, state.maxTitle);
    }
    const wasAffordable = card.classList.contains('upgrade-card--affordable');
    card.classList.toggle('upgrade-card--affordable', state.canBuy);
    if (state.canBuy && !wasAffordable) {
      card.classList.add('upgrade-card--just-affordable');
      setTimeout(() => card.classList.remove('upgrade-card--just-affordable'), 800);
    }
    card.classList.toggle('upgrade-card--recommended', state.isRecommended);
    card.classList.toggle('upgrade-card--needs-crew', !state.hasCrew && state.crewReq > 0);
  }
}

export function flashUpgradeCard(upgradeId: string): void {
  const listEl = document.getElementById(UPGRADE_LIST_ID);
  if (!listEl) return;
  const card = listEl.querySelector(`.upgrade-card .upgrade-btn--buy[data-upgrade-id="${upgradeId}"]`)?.closest('.upgrade-card');
  if (card instanceof HTMLElement) {
    card.classList.add('upgrade-card--just-bought');
    setTimeout(() => card.classList.remove('upgrade-card--just-bought'), 700);
  }
}
