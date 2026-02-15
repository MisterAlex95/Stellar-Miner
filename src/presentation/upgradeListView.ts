import { getSession, getSettings } from '../application/gameState.js';
import { formatNumber } from '../application/format.js';
import {
  UPGRADE_CATALOG,
  UPGRADE_GROUPS,
  createUpgrade,
  getUnlockedUpgradeTiers,
} from '../application/catalogs.js';
import { getPlanetAffinityDescription } from '../application/planetAffinity.js';
import {
  getEffectiveUpgradeUsesSlot,
  getEffectiveRequiredAstronauts,
  getPlanetsWithEffectiveFreeSlot,
  getPlanetWithEffectiveFreeSlot,
  hasEffectiveFreeSlot,
  getEffectiveUsedSlots,
} from '../application/research.js';
import { t, tParam } from '../application/strings.js';
import { getCatalogUpgradeName, getCatalogUpgradeDesc, getCatalogUpgradeGroupLabel, getCatalogPlanetNameById } from '../application/i18nCatalogs.js';
import { updateStats } from './statsView.js';

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
  if (freeSlots <= 0 || !player.coins.gte(def.cost)) return 0;
  const byCoins = Math.min(
    player.coins.value.div(def.cost).floor().toNumber(),
    freeSlots,
    Number.MAX_SAFE_INTEGER
  );
  const effectiveCrew = getEffectiveRequiredAstronauts(def.id);
  const byAstronauts = effectiveCrew === 0 ? Number.MAX_SAFE_INTEGER : Math.floor(player.astronautCount / effectiveCrew);
  return Math.min(byCoins, freeSlots, byAstronauts);
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

  for (const group of UPGRADE_GROUPS) {
    const groupDefs = UPGRADE_CATALOG.filter(
      (d) => d.tier >= group.minTier && d.tier <= group.maxTier && unlockedTiers.has(d.tier)
    );
    if (groupDefs.length === 0) continue;

    const header = document.createElement('div');
    header.className = 'upgrade-group-header';
    header.textContent = getCatalogUpgradeGroupLabel(group.label);
    listEl.appendChild(header);

    for (const def of groupDefs) {
      const owned = player.upgrades.filter((u) => u.id === def.id).length;
      const upgrade = createUpgrade(def);
      const crewReq = getEffectiveRequiredAstronauts(def.id);
      const hasCrew = player.astronautCount >= crewReq;
      const canAfford = player.coins.gte(upgrade.cost);
      const needsSlot = getEffectiveUpgradeUsesSlot(def.id);
      const canPlace = needsSlot ? hasFreeSlot : hasAnyPlanet;
      const canBuy = canAfford && canPlace && hasCrew;
      const buyLabel = owned > 0 ? t('buyLabelPlusOne') : t('buyLabel');
      const maxCount = getMaxBuyCount(def.id);
      const maxLabel = maxCount > 1 ? tParam('maxLabelCount', { n: maxCount }) : t('maxLabel');

      const costCoins = `${formatNumber(def.cost, settings.compactNumbers)} ⬡`;
      const costCrewLine =
        crewReq > 0
          ? `${crewReq} crew`
          : '';

      let buyTitle = '';
      if (!canBuy) {
        if (!hasCrew && crewReq > 0) buyTitle = tParam('needAstronauts', { n: crewReq });
        else if (!canPlace && needsSlot) buyTitle = t('noFreeSlot');
        else if (!canAfford) buyTitle = tParam('needCoinsToBuy', { cost: costCoins, crew: costCrewLine ? ` + ${costCrewLine}` : '' });
        else buyTitle = tParam('needCoinsAndSlot', { cost: costCoins });
      } else buyTitle = tParam('buyUpgradeTitle', { name: getCatalogUpgradeName(def.id), cost: costCoins + (costCrewLine ? ` + ${costCrewLine}` : '') });

      let maxTitle = t('maxBuyTooltip');
      if (maxCount <= 0 || !hasCrew) {
        if (!hasCrew && crewReq > 0) maxTitle = t('needCrewToBuy');
        else if (!canPlace && needsSlot) maxTitle = t('noFreeSlot');
        else if (!canAfford) maxTitle = tParam('needCoinsForOne', { cost: costCoins });
        else maxTitle = t('noSlotsOrCoins');
      }

      const crewBadge =
        crewReq > 0
          ? `<span class="upgrade-crew-req" title="${t('crewBadgeTitle')}">${crewReq} crew</span>`
          : '';

      const planetsForSelect = needsSlot ? planetsWithSlot : player.planets;
      const planetOptions = choosePlanet
        ? planetsForSelect.map((p) => `<option value="${p.id}">${getCatalogPlanetNameById(p.id)}</option>`).join('')
        : '';
      const planetSelectHtml = choosePlanet
        ? `<label class="upgrade-planet-label" for="planet-${def.id}">${t('toPlanet')}</label><select class="upgrade-planet-select" id="planet-${def.id}" data-upgrade-id="${def.id}" aria-label="${t('assignToPlanet')}">${planetOptions}</select>`
        : '';

      const isRecommended = canBuy && !player.upgrades.some((u) => u.id === def.id);
      const card = document.createElement('div');
      card.className =
        'upgrade-card' +
        (canBuy ? ' upgrade-card--affordable' : '') +
        (isRecommended ? ' upgrade-card--recommended' : '') +
        (!hasCrew && crewReq > 0 ? ' upgrade-card--needs-crew' : '');
      card.setAttribute('data-tier', String(def.tier));
      const eachSec = tParam('eachPerSecond', { n: formatNumber(def.coinsPerSecond, settings.compactNumbers) });
      const totalSec = owned > 0 ? ' · ' + tParam('totalPerSecond', { n: formatNumber(owned * def.coinsPerSecond, settings.compactNumbers) }) : '';
      const slotCostText = getEffectiveUpgradeUsesSlot(def.id) ? t('upgradeUsesSlot') : t('upgradeNoSlot');
      const affinityDesc = getPlanetAffinityDescription(def.id);
      const affinityTitleRaw = affinityDesc ? `${t('upgradePlanetAffinityTitle')}: ${affinityDesc}` : t('upgradePlanetAffinityTitle');
      const affinityTitle = affinityTitleRaw.replace(/"/g, '&quot;');
      card.innerHTML = `
        <div class="upgrade-info">
          <div class="upgrade-header">
            <span class="upgrade-tier" aria-label="${tParam('tierLabel', { n: def.tier })}">T${def.tier}</span>
            <div class="upgrade-name">${getCatalogUpgradeName(def.id)}${owned > 0 ? `<span class="count-badge">×${owned}</span>` : ''}${crewBadge}${isRecommended ? '<span class="upgrade-recommended">' + t('recommended') + '</span>' : ''}<span class="upgrade-affinity-info" title="${affinityTitle}" aria-label="${affinityTitleRaw}">i</span></div>
          </div>
          <div class="upgrade-description">${getCatalogUpgradeDesc(def.id)}</div>
          <div class="upgrade-effect">${eachSec}${totalSec}</div>
        </div>
        <div class="upgrade-cost">
          <span class="upgrade-cost-coins">${costCoins}</span>
          ${costCrewLine ? `<span class="upgrade-cost-crew">${costCrewLine}</span>` : ''}
          <span class="upgrade-cost-slot">· ${slotCostText}</span>
        </div>
        <div class="upgrade-actions">
          ${planetSelectHtml}
          <div class="upgrade-buttons">
            <span class="btn-tooltip-wrap" title="${buyTitle}"><button class="upgrade-btn upgrade-btn--buy" type="button" data-upgrade-id="${def.id}" data-action="buy" ${canBuy ? '' : 'disabled'}>${buyLabel}</button></span>
            <span class="btn-tooltip-wrap" title="${maxTitle}"><button class="upgrade-btn upgrade-btn--max" type="button" data-upgrade-id="${def.id}" data-action="max" ${maxCount > 0 && hasCrew ? '' : 'disabled'}>${maxLabel}</button></span>
          </div>
        </div>
      `;
      listEl.appendChild(card);
    }
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
    const needsSlot = getEffectiveUpgradeUsesSlot(def.id);
    const canPlace = needsSlot ? hasFreeSlot : player.planets.length > 0;
    const owned = player.upgrades.filter((u) => u.id === id).length;
    const crewReq = getEffectiveRequiredAstronauts(def.id);
    const hasCrew = player.astronautCount >= crewReq;
    const canAfford = player.coins.gte(def.cost);
    const canBuy = canAfford && canPlace && hasCrew;
    const buyLabel = owned > 0 ? t('buyLabelPlusOne') : t('buyLabel');
    const maxCount = getMaxBuyCount(id);
    const maxLabel = maxCount > 1 ? tParam('maxLabelCount', { n: maxCount }) : t('maxLabel');

    const costCoins = formatNumber(def.cost, settings.compactNumbers) + ' ⬡';
    const costCrew = crewReq > 0 ? ` + ${crewReq} crew` : '';
    let buyTitle = '';
    if (!canBuy) {
      if (!hasCrew && crewReq > 0) buyTitle = tParam('needAstronauts', { n: crewReq });
      else if (!canPlace && needsSlot) buyTitle = t('noFreeSlot');
      else if (!canAfford) buyTitle = tParam('needCoinsToBuy', { cost: costCoins, crew: costCrew });
      else buyTitle = tParam('needCoinsAndSlot', { cost: costCoins });
    } else buyTitle = tParam('buyUpgradeTitle', { name: getCatalogUpgradeName(id), cost: costCoins + costCrew });

    let maxTitle = t('maxBuyTooltip');
    if (maxCount <= 0 || !hasCrew) {
      if (!hasCrew && crewReq > 0) maxTitle = t('needCrewToBuy');
      else if (!canPlace && needsSlot) maxTitle = t('noFreeSlot');
      else if (!canAfford) maxTitle = tParam('needCoinsForOne', { cost: costCoins });
      else maxTitle = t('noSlotsOrCoins');
    }

    const isRecommended = canBuy && !player.upgrades.some((u) => u.id === id);
    const crewBadge = crewReq > 0 ? `<span class="upgrade-crew-req" title="${t('crewBadgeTitle')}">${crewReq} crew</span>` : '';
    const nameEl = card.querySelector('.upgrade-name');
    if (nameEl) {
      nameEl.innerHTML = getCatalogUpgradeName(id) + (owned > 0 ? `<span class="count-badge">×${owned}</span>` : '') + crewBadge + (isRecommended ? '<span class="upgrade-recommended">' + t('recommended') + '</span>' : '');
    }
    const select = card.querySelector('.upgrade-planet-select') as HTMLSelectElement | null;
    if (select) {
      const planetsForSelect = needsSlot ? getPlanetsWithEffectiveFreeSlot(player) : player.planets;
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
    if (buyBtn) {
      buyBtn.textContent = buyLabel;
      buyBtn.toggleAttribute('disabled', !canBuy);
      const buyWrap = buyBtn.parentElement?.classList.contains('btn-tooltip-wrap') ? buyBtn.parentElement : null;
      if (buyWrap) buyWrap.setAttribute('title', buyTitle);
    }
    const maxBtn = card.querySelector('.upgrade-btn--max');
    if (maxBtn) {
      maxBtn.textContent = maxLabel;
      maxBtn.toggleAttribute('disabled', maxCount <= 0 || !hasCrew);
      const maxWrap = maxBtn.parentElement?.classList.contains('btn-tooltip-wrap') ? maxBtn.parentElement : null;
      if (maxWrap) maxWrap.setAttribute('title', maxTitle);
    }
    const wasAffordable = card.classList.contains('upgrade-card--affordable');
    card.classList.toggle('upgrade-card--affordable', canBuy);
    if (canBuy && !wasAffordable) {
      card.classList.add('upgrade-card--just-affordable');
      setTimeout(() => card.classList.remove('upgrade-card--just-affordable'), 800);
    }
    card.classList.toggle('upgrade-card--recommended', isRecommended);
    card.classList.toggle('upgrade-card--needs-crew', !hasCrew && crewReq > 0);
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
