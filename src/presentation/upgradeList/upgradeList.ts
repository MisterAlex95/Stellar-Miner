import { getSession, getSettings } from '../../application/gameState.js';
import {
  UPGRADE_CATALOG,
  getDisplayUnlockedUpgradeTiers,
  getUpgradeCost,
  UPGRADE_DISPLAY_COUNT,
} from '../../application/catalogs.js';
import { getEffectiveUpgradeUsesSlot, getEffectiveRequiredAstronauts } from '../../application/research.js';
import { getPlanetDisplayName } from '../../application/solarSystems.js';
import { t, tParam } from '../../application/strings.js';
import { formatNumber } from '../../application/format.js';
import { getCatalogUpgradeName } from '../../application/i18nCatalogs.js';
import { notifyRefresh } from '../../application/refreshSignal.js';
import { cancelUpgradeInstall, cancelUpgradeUninstall } from '../../application/handlers.js';
import { updateTooltipForButton } from '../components/buttonTooltip.js';
import { getUpgradeCardState, buildUpgradeCardHtml } from '../components/upgradeCard.js';

const UPGRADE_LIST_ID = 'upgrade-list';

/** (startAt, endsAt) of all installations in progress for this upgrade across all planets. */
function getInstallingRanges(upgradeId: string): { startAt: number; endsAt: number }[] {
  const session = getSession();
  if (!session) return [];
  return session.player.planets.flatMap((p) =>
    p.installingUpgrades
      .filter((i) => i.upgrade.id === upgradeId)
      .map((i) => ({ startAt: i.startAt, endsAt: i.endsAt }))
  );
}

/** Per-planet count of installing upgrades (for cancel-all). */
function getInstallingCountByPlanet(upgradeId: string): { planetId: string; count: number }[] {
  const session = getSession();
  if (!session) return [];
  return session.player.planets
    .map((p) => ({
      planetId: p.id,
      count: p.installingUpgrades.filter((i) => i.upgrade.id === upgradeId).length,
    }))
    .filter((x) => x.count > 0);
}

/** (startAt, endsAt) of all uninstallations in progress for this upgrade across all planets. */
function getUninstallingRanges(upgradeId: string): { startAt: number; endsAt: number }[] {
  const session = getSession();
  if (!session) return [];
  return session.player.planets.flatMap((p) =>
    p.uninstallingUpgrades
      .filter((u) => u.upgradeId === upgradeId)
      .map((u) => ({ startAt: u.startAt, endsAt: u.endsAt }))
  );
}

/** Per-planet uninstalling (for cancel; one entry per planet when present). */
function getUninstallingByPlanet(upgradeId: string): { planetId: string }[] {
  const session = getSession();
  if (!session) return [];
  return session.player.planets
    .filter((p) => p.uninstallingUpgrades.some((u) => u.upgradeId === upgradeId))
    .map((p) => ({ planetId: p.id }));
}

/** Sync install progress overlay from state: one bar with "Installing 1/N" (soonest of N in progress). */
function attachInstallProgressOverlays(cardEl: HTMLElement, upgradeId: string): void {
  const now = Date.now();
  const ranges = getInstallingRanges(upgradeId).filter((r) => r.endsAt > now);
  if (ranges.length > 0) cardEl.querySelector('.upgrade-uninstall-progress-overlay')?.remove();
  let container = cardEl.querySelector('.upgrade-install-progress-overlay:not(.upgrade-uninstall-progress-overlay)') as HTMLElement | null;

  if (ranges.length === 0) {
    container?.remove();
    if (!cardEl.querySelector('.upgrade-uninstall-progress-overlay')) cardEl.classList.remove('upgrade-card--installing');
    return;
  }

  // One bar for all: show progress of the soonest-to-complete, label "Installing 1/N"
  const sorted = [...ranges].sort((a, b) => a.endsAt - b.endsAt);
  const first = sorted[0];
  if (!first) return;

  if (!container) {
    container = document.createElement('div');
    container.className = 'upgrade-install-progress-overlay';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-busy', 'true');
    container.innerHTML =
      '<div class="upgrade-install-progress-item"><div class="upgrade-install-progress-track"><div class="upgrade-install-progress-fill"></div></div><span class="upgrade-install-progress-label"></span></div>' +
      '<button type="button" class="upgrade-progress-cancel" data-i18n="cancel">Cancel</button>';
    cardEl.appendChild(container);
    cardEl.classList.add('upgrade-card--installing');
    const cancelBtn = container.querySelector('.upgrade-progress-cancel');
    if (cancelBtn) {
      cancelBtn.textContent = t('cancel');
      cancelBtn.addEventListener('click', () => {
        const byPlanet = getInstallingCountByPlanet(upgradeId);
        for (const { planetId, count } of byPlanet) cancelUpgradeInstall(upgradeId, planetId, count);
      });
    }
  } else {
    const cancelBtn = container.querySelector('.upgrade-progress-cancel');
    if (!cancelBtn) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'upgrade-progress-cancel';
      btn.textContent = t('cancel');
      btn.addEventListener('click', () => {
        const byPlanet = getInstallingCountByPlanet(upgradeId);
        for (const { planetId, count } of byPlanet) cancelUpgradeInstall(upgradeId, planetId, count);
      });
      container.appendChild(btn);
    }
  }

  const storedTotal = container.getAttribute('data-install-total');
  const total = Math.max(ranges.length, storedTotal ? Number(storedTotal) : 0);
  if (total > 0) container.setAttribute('data-install-total', String(total));
  const current = total - ranges.length + 1;

  const item = container.querySelector('.upgrade-install-progress-item') as HTMLElement;
  const fill = container.querySelector('.upgrade-install-progress-fill') as HTMLElement | null;
  const labelEl = container.querySelector('.upgrade-install-progress-label') as HTMLElement | null;
  if (item) {
    item.setAttribute('data-start-at', String(first.startAt));
    item.setAttribute('data-ends-at', String(first.endsAt));
  }
  if (labelEl) {
    labelEl.textContent = tParam('upgradingCount', { current: String(current), total: String(total) });
  }
  if (fill && Number.isFinite(first.startAt) && Number.isFinite(first.endsAt)) {
    const totalMs = Math.max(1, first.endsAt - first.startAt);
    const progress = Math.min(1, Math.max(0, (now - first.startAt) / totalMs));
    const pct = Math.round(progress * 100);
    fill.style.transition = 'none';
    fill.style.width = `${pct}%`;
    fill.setAttribute('aria-valuenow', String(pct));
  }
}

/** Sync uninstall progress overlay from state (same look as install: bar + "Uninstalling 1/N" + Cancel). */
function attachUninstallProgressOverlays(cardEl: HTMLElement, upgradeId: string): void {
  const now = Date.now();
  const ranges = getUninstallingRanges(upgradeId).filter((r) => r.endsAt > now);
  if (ranges.length > 0) {
    const installOnly = cardEl.querySelector('.upgrade-install-progress-overlay:not(.upgrade-uninstall-progress-overlay)');
    installOnly?.remove();
  }
  let container = cardEl.querySelector('.upgrade-uninstall-progress-overlay') as HTMLElement | null;

  if (ranges.length === 0) {
    container?.remove();
    if (!cardEl.querySelector('.upgrade-install-progress-overlay')) cardEl.classList.remove('upgrade-card--installing');
    return;
  }

  const sorted = [...ranges].sort((a, b) => a.endsAt - b.endsAt);
  const first = sorted[0];
  if (!first) return;

  if (!container) {
    container = document.createElement('div');
    container.className = 'upgrade-install-progress-overlay upgrade-uninstall-progress-overlay';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-busy', 'true');
    container.innerHTML =
      '<div class="upgrade-install-progress-item"><div class="upgrade-install-progress-track"><div class="upgrade-install-progress-fill"></div></div><span class="upgrade-install-progress-label"></span></div>' +
      '<button type="button" class="upgrade-progress-cancel" data-i18n="cancel">Cancel</button>';
    cardEl.appendChild(container);
    cardEl.classList.add('upgrade-card--installing');
    const cancelBtn = container.querySelector('.upgrade-progress-cancel');
    if (cancelBtn) {
      cancelBtn.textContent = t('cancel');
      cancelBtn.addEventListener('click', () => {
        for (const { planetId } of getUninstallingByPlanet(upgradeId)) cancelUpgradeUninstall(upgradeId, planetId);
      });
    }
  } else {
    const cancelBtn = container.querySelector('.upgrade-progress-cancel');
    if (!cancelBtn) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'upgrade-progress-cancel';
      btn.textContent = t('cancel');
      btn.addEventListener('click', () => {
        for (const { planetId } of getUninstallingByPlanet(upgradeId)) cancelUpgradeUninstall(upgradeId, planetId);
      });
      container.appendChild(btn);
    }
  }

  const total = ranges.length;
  const current = total - ranges.length + 1;
  const labelEl = container.querySelector('.upgrade-install-progress-label') as HTMLElement | null;
  if (labelEl) labelEl.textContent = tParam('uninstallingCount', { current: String(current), total: String(total) });
  const fill = container.querySelector('.upgrade-install-progress-fill') as HTMLElement | null;
  const item = container.querySelector('.upgrade-install-progress-item') as HTMLElement | null;
  if (item) {
    item.setAttribute('data-start-at', String(first.startAt));
    item.setAttribute('data-ends-at', String(first.endsAt));
  }
  if (fill && Number.isFinite(first.startAt) && Number.isFinite(first.endsAt)) {
    const totalMs = Math.max(1, first.endsAt - first.startAt);
    const progress = Math.min(1, Math.max(0, (now - first.startAt) / totalMs));
    fill.style.transition = 'none';
    fill.style.width = `${Math.round(progress * 100)}%`;
  }
}

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
  const installed = player.upgrades.filter((u) => u.id === upgradeId).length;
  const installing = player.planets.reduce(
    (s, p) => s + p.installingUpgrades.filter((i) => i.upgrade.id === upgradeId).length,
    0
  );
  const ownedCount = installed + installing;
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

/** @param container - When provided (e.g. from Vue panel), render into this element; otherwise use #upgrade-list. */
export function renderUpgradeList(container?: HTMLElement): void {
  const session = getSession();
  if (!session) return;
  const player = session.player;
  const settings = getSettings();
  const listEl = container ?? document.getElementById(UPGRADE_LIST_ID);
  if (!listEl) return;
  listEl.innerHTML = '';

  // Use raw free slots so UI matches handler (handler uses getPlanetWithFreeSlot).
  const planetsWithSlot = player.getPlanetsWithFreeSlot();
  const hasFreeSlot = planetsWithSlot.length > 0;
  const choosePlanet = player.planets.length > 1;
  const hasAnyPlanet = player.planets.length > 0;

  const ownedIds = player.upgrades.map((u) => u.id);
  const unlockedTiers = getDisplayUnlockedUpgradeTiers(ownedIds);
  const allUnlockedDefs = UPGRADE_CATALOG.filter((d) => unlockedTiers.has(d.tier)).sort((a, b) => a.tier - b.tier);
  const defsToShow = allUnlockedDefs.slice(0, UPGRADE_DISPLAY_COUNT);

  if (defsToShow.length === 0) {
    listEl.innerHTML = `<div class="empty-state" id="upgrades-empty-state"><span class="empty-state-icon" aria-hidden="true"></span><p class="empty-state-text">${t('emptyUpgradesText')}</p></div>`;
    return;
  }

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
    card.setAttribute('data-owned', String(state.owned));
    card.innerHTML = buildUpgradeCardHtml(state, {
      choosePlanet,
      planetsForSelect,
    });
    listEl.appendChild(card);
    attachUninstallProgressOverlays(card, def.id);
    attachInstallProgressOverlays(card, def.id);
  }
}

/** Ids of upgrades that should currently be shown (same logic as renderUpgradeList). */
function getCurrentUpgradeIdsToShow(): string[] {
  const session = getSession();
  if (!session) return [];
  const player = session.player;
  const ownedIds = player.upgrades.map((u) => u.id);
  const unlockedTiers = getDisplayUnlockedUpgradeTiers(ownedIds);
  const allUnlockedDefs = UPGRADE_CATALOG.filter((d) => unlockedTiers.has(d.tier)).sort((a, b) => a.tier - b.tier);
  return allUnlockedDefs.slice(0, UPGRADE_DISPLAY_COUNT).map((d) => d.id);
}

/** Uses #upgrade-list to find cards (works when Vue panel provides inner container for cards). */
export function updateUpgradeListInPlace(): void {
  const session = getSession();
  if (!session) return;
  const player = session.player;
  const settings = getSettings();
  const hostEl = document.getElementById(UPGRADE_LIST_ID);
  if (!hostEl) return;
  // When Vue panel is mounted, cards live in .upgrade-list-cards; use it so full re-render does not wipe the Vue root.
  const listEl = hostEl.querySelector<HTMLElement>('.upgrade-list-cards') ?? hostEl;

  const idsToShow = getCurrentUpgradeIdsToShow();
  const currentCardIds = [...listEl.querySelectorAll('.upgrade-card')].map(
    (card) => card.getAttribute('data-upgrade-id') ?? ''
  );
  const sameSet =
    idsToShow.length === currentCardIds.length &&
    idsToShow.every((id, i) => id === currentCardIds[i]);
  if (!sameSet) {
    renderUpgradeList(listEl);
    return;
  }

  const hasFreeSlot = player.getPlanetWithFreeSlot() !== null;
  const cards = listEl.querySelectorAll('.upgrade-card');
  let needsFullRender = false;
  for (const card of cards) {
    const id = (card.querySelector('.upgrade-btn--buy')?.getAttribute('data-upgrade-id') ?? card.getAttribute('data-upgrade-id')) ?? null;
    if (!id) continue;
    const def = UPGRADE_CATALOG.find((d) => d.id === id);
    if (!def) continue;
    const prevOwned = card.getAttribute('data-owned');
    const state = getUpgradeCardState(def, player, settings, hasFreeSlot, getMaxBuyCount(id));
    if (prevOwned !== null && String(state.owned) !== prevOwned) {
      needsFullRender = true;
      break;
    }
  }
  if (needsFullRender) {
    renderUpgradeList(listEl);
    return;
  }
  for (const card of cards) {
    const buyBtn = card.querySelector('.upgrade-btn--buy');
    const id = (buyBtn?.getAttribute('data-upgrade-id') ?? card.getAttribute('data-upgrade-id')) ?? null;
    if (!id) continue;
    const def = UPGRADE_CATALOG.find((d) => d.id === id);
    if (!def) continue;
    const maxCount = getMaxBuyCount(id);
    const state = getUpgradeCardState(def, player, settings, hasFreeSlot, maxCount);

    const nameStatsRow = card.querySelector('.upgrade-card-row--name-stats');
    if (nameStatsRow) {
      const rateStr = tParam('eachPerSecond', { n: formatNumber(def.coinsPerSecond, settings.compactNumbers) });
      const totalSec = state.owned > 0 ? ' · ' + tParam('totalPerSecond', { n: formatNumber(state.owned * def.coinsPerSecond, settings.compactNumbers) }) : '';
      const slotCostSuffix = state.needsSlot ? ` · ${t('upgradeUsesSlot')}` : '';
      const leftPart = nameStatsRow.querySelector('.upgrade-card-row-left');
      const rightPart = nameStatsRow.querySelector('.upgrade-card-row-right');
      if (leftPart) {
        leftPart.innerHTML =
          `<span class="upgrade-name">${getCatalogUpgradeName(id)}</span>` +
          (state.owned > 0 ? `<span class="upgrade-count-badge">×${state.owned}</span>` : '') +
          (state.isRecommended ? '<span class="upgrade-recommended">' + t('recommended') + '</span>' : '');
      }
      if (rightPart) {
        rightPart.innerHTML =
          `<span class="upgrade-title-row-output" aria-live="polite"><span class="upgrade-effect-chip">${rateStr}</span>${totalSec}</span><span class="upgrade-title-row-cost">${state.costCoins}${state.costCrewLine ? ` ${state.costCrewLine}` : ''}${slotCostSuffix}</span>`;
      }
    }
    const select = card.querySelector('.upgrade-planet-select') as HTMLSelectElement | null;
    if (select) {
      const planetsForSelect = state.needsSlot ? player.getPlanetsWithFreeSlot() : player.planets;
      if (planetsForSelect.length !== select.options.length) {
        notifyRefresh();
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
      maxBtn.setAttribute('data-max-count', String(state.maxCount));
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
    card.setAttribute('data-owned', String(state.owned));
    if (card instanceof HTMLElement) {
      attachUninstallProgressOverlays(card, id);
      attachInstallProgressOverlays(card, id);
    }
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
