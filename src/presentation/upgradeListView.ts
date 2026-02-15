import { getSession, getSettings } from '../application/gameState.js';
import {
  UPGRADE_CATALOG,
  getUnlockedUpgradeTiers,
  getUpgradeCost,
  UPGRADE_DISPLAY_COUNT,
} from '../application/catalogs.js';
import {
  getEffectiveUpgradeUsesSlot,
  getEffectiveRequiredAstronauts,
  getPlanetWithEffectiveFreeSlot,
  getPlanetsWithEffectiveFreeSlot,
  getEffectiveUsedSlots,
} from '../application/research.js';
import { t } from '../application/strings.js';
import { getCatalogUpgradeName } from '../application/i18nCatalogs.js';
import { updateStats } from './statsView.js';
import { updateTooltipForButton } from './components/buttonTooltip.js';
import { getUpgradeCardState, buildUpgradeCardHtml } from './components/upgradeCard.js';

export function getMaxBuyCount(upgradeId: string): number {
  const session = getSession();
  if (!session) return 0;
  const def = UPGRADE_CATALOG.find((d) => d.id === upgradeId);
  if (!def) return 0;
  const player = session.player;
  const usesSlot = getEffectiveUpgradeUsesSlot(def.id);
  const freeSlots = usesSlot
    ? player.planets.reduce((s, p) => s + Math.max(0, p.maxUpgrades - getEffectiveUsedSlots(p)), 0)
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
  const listEl = document.getElementById('upgrade-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  const planetsWithSlot = getPlanetsWithEffectiveFreeSlot(player);
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
    const planetsForSelect = state.needsSlot ? planetsWithSlot : player.planets;
    const card = document.createElement('div');
    card.className =
      'upgrade-card' +
      (state.canBuy ? ' upgrade-card--affordable' : '') +
      (state.isRecommended ? ' upgrade-card--recommended' : '') +
      (!state.hasCrew && state.crewReq > 0 ? ' upgrade-card--needs-crew' : '');
    card.setAttribute('data-tier', String(def.tier));
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
  const listEl = document.getElementById('upgrade-list');
  if (!listEl) return;

  const hasFreeSlot = getPlanetWithEffectiveFreeSlot(player) !== null;
  listEl.querySelectorAll('.upgrade-card').forEach((card) => {
    const buyBtn = card.querySelector('.upgrade-btn--buy');
    const id = buyBtn?.getAttribute('data-upgrade-id');
    if (!id) return;
    const def = UPGRADE_CATALOG.find((d) => d.id === id);
    if (!def) return;
    const maxCount = getMaxBuyCount(id);
    const state = getUpgradeCardState(def, player, settings, hasFreeSlot, maxCount);

    const nameEl = card.querySelector('.upgrade-name');
    if (nameEl) {
      nameEl.innerHTML =
        getCatalogUpgradeName(id) +
        (state.owned > 0 ? `<span class="count-badge">×${state.owned}</span>` : '') +
        state.crewBadge +
        (state.isRecommended ? '<span class="upgrade-recommended">' + t('recommended') + '</span>' : '');
    }
    const select = card.querySelector('.upgrade-planet-select') as HTMLSelectElement | null;
    if (select) {
      const planetsForSelect = state.needsSlot ? getPlanetsWithEffectiveFreeSlot(player) : player.planets;
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
  });
}

export function flashUpgradeCard(upgradeId: string): void {
  const listEl = document.getElementById('upgrade-list');
  if (!listEl) return;
  const card = listEl.querySelector(`.upgrade-card .upgrade-btn--buy[data-upgrade-id="${upgradeId}"]`)?.closest('.upgrade-card');
  if (card instanceof HTMLElement) {
    card.classList.add('upgrade-card--just-bought');
    setTimeout(() => card.classList.remove('upgrade-card--just-bought'), 700);
  }
}
