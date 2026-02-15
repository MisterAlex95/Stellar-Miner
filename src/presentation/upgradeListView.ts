import { getSession, getSettings } from '../application/gameState.js';
import { formatNumber } from '../application/format.js';
import {
  UPGRADE_CATALOG,
  UPGRADE_GROUPS,
  createUpgrade,
  getUnlockedUpgradeTiers,
} from '../application/catalogs.js';
import { updateStats } from './statsView.js';

export function getMaxBuyCount(upgradeId: string): number {
  const session = getSession();
  if (!session) return 0;
  const def = UPGRADE_CATALOG.find((d) => d.id === upgradeId);
  if (!def) return 0;
  const player = session.player;
  const freeSlots = player.planets.reduce((s, p) => s + p.freeSlots, 0);
  if (freeSlots <= 0 || !player.coins.gte(def.cost)) return 0;
  const byCoins = Math.floor(player.coins.value / def.cost);
  const byAstronauts = def.requiredAstronauts === 0 ? freeSlots : Math.floor(player.astronautCount / def.requiredAstronauts);
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

  const planetsWithSlot = player.getPlanetsWithFreeSlot();
  const hasFreeSlot = planetsWithSlot.length > 0;
  const choosePlanet = planetsWithSlot.length > 1;

  const ownedIds = player.upgrades.map((u) => u.id);
  const unlockedTiers = getUnlockedUpgradeTiers(ownedIds);

  for (const group of UPGRADE_GROUPS) {
    const groupDefs = UPGRADE_CATALOG.filter(
      (d) => d.tier >= group.minTier && d.tier <= group.maxTier && unlockedTiers.has(d.tier)
    );
    if (groupDefs.length === 0) continue;

    const header = document.createElement('div');
    header.className = 'upgrade-group-header';
    header.textContent = group.label;
    listEl.appendChild(header);

    for (const def of groupDefs) {
      const owned = player.upgrades.filter((u) => u.id === def.id).length;
      const upgrade = createUpgrade(def);
      const hasCrew = player.astronautCount >= def.requiredAstronauts;
      const canAfford = player.coins.gte(upgrade.cost);
      const canBuy = canAfford && hasFreeSlot && hasCrew;
      const buyLabel = owned > 0 ? `+1` : `Buy`;
      const maxCount = getMaxBuyCount(def.id);
      const maxLabel = maxCount > 1 ? `Max (${maxCount})` : `Max`;

      const costCoins = `${formatNumber(def.cost, settings.compactNumbers)} ⬡`;
      const costCrewLine =
        def.requiredAstronauts > 0
          ? `${def.requiredAstronauts} astronaut${def.requiredAstronauts > 1 ? 's' : ''}`
          : '';

      let buyTitle = '';
      if (!canBuy) {
        if (!hasCrew && def.requiredAstronauts > 0) buyTitle = `Need ${def.requiredAstronauts} astronaut${def.requiredAstronauts > 1 ? 's' : ''}. Hire crew in the Crew section.`;
        else if (!hasFreeSlot) buyTitle = 'No free slot. Add a slot to a planet or buy a new planet!';
        else if (!canAfford) buyTitle = `Need ${costCoins}${costCrewLine ? ` + ${costCrewLine}` : ''} to buy.`;
        else buyTitle = `Need ${costCoins}${costCrewLine ? ` + ${costCrewLine}` : ''} and a free slot.`;
      } else buyTitle = `Buy ${def.name} · ${costCoins}${costCrewLine ? ` + ${costCrewLine}` : ''}`;

      let maxTitle = 'Buy as many as you can afford with current slots';
      if (maxCount <= 0 || !hasCrew) {
        if (!hasCrew && def.requiredAstronauts > 0) maxTitle = 'Need more crew to buy this upgrade.';
        else if (!hasFreeSlot) maxTitle = 'No free slots. Add slots or buy a new planet.';
        else if (!canAfford) maxTitle = `Need ${costCoins} to buy at least one.`;
        else maxTitle = 'No free slots or not enough coins/crew to buy more.';
      }

      const crewBadge =
        def.requiredAstronauts > 0
          ? `<span class="upgrade-crew-req" title="Cost in astronauts (spent when you buy)">${def.requiredAstronauts} crew</span>`
          : '';

      const planetOptions = choosePlanet
        ? planetsWithSlot.map((p) => `<option value="${p.id}">${p.name}</option>`).join('')
        : '';
      const planetSelectHtml = choosePlanet
        ? `<label class="upgrade-planet-label" for="planet-${def.id}">To</label><select class="upgrade-planet-select" id="planet-${def.id}" data-upgrade-id="${def.id}" aria-label="Assign to planet">${planetOptions}</select>`
        : '';

      const isRecommended = canBuy && !player.upgrades.some((u) => u.id === def.id);
      const card = document.createElement('div');
      card.className =
        'upgrade-card' +
        (canBuy ? ' upgrade-card--affordable' : '') +
        (isRecommended ? ' upgrade-card--recommended' : '') +
        (!hasCrew && def.requiredAstronauts > 0 ? ' upgrade-card--needs-crew' : '');
      card.setAttribute('data-tier', String(def.tier));
      card.innerHTML = `
        <div class="upgrade-info">
          <div class="upgrade-header">
            <span class="upgrade-tier" aria-label="Tier ${def.tier}">T${def.tier}</span>
            <div class="upgrade-name">${def.name}${owned > 0 ? `<span class="count-badge">×${owned}</span>` : ''}${crewBadge}${isRecommended ? '<span class="upgrade-recommended">Recommended</span>' : ''}</div>
          </div>
          <div class="upgrade-description">${def.description}</div>
          <div class="upgrade-effect">+${formatNumber(def.coinsPerSecond, settings.compactNumbers)} /s each${owned > 0 ? ` · Total: +${formatNumber(owned * def.coinsPerSecond, settings.compactNumbers)}/s` : ''}</div>
        </div>
        <div class="upgrade-cost">
          <span class="upgrade-cost-coins">${costCoins}</span>
          ${costCrewLine ? `<span class="upgrade-cost-crew">${costCrewLine}</span>` : ''}
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

  const hasFreeSlot = player.getPlanetWithFreeSlot() !== null;
  listEl.querySelectorAll('.upgrade-card').forEach((card) => {
    const buyBtn = card.querySelector('.upgrade-btn--buy');
    const id = buyBtn?.getAttribute('data-upgrade-id');
    if (!id) return;
    const def = UPGRADE_CATALOG.find((d) => d.id === id);
    if (!def) return;
    const owned = player.upgrades.filter((u) => u.id === id).length;
    const hasCrew = player.astronautCount >= def.requiredAstronauts;
    const canAfford = player.coins.gte(def.cost);
    const canBuy = canAfford && hasFreeSlot && hasCrew;
    const buyLabel = owned > 0 ? '+1' : 'Buy';
    const maxCount = getMaxBuyCount(id);
    const maxLabel = maxCount > 1 ? `Max (${maxCount})` : 'Max';

    let buyTitle = '';
    if (!canBuy) {
      if (!hasCrew && def.requiredAstronauts > 0) buyTitle = `Need ${def.requiredAstronauts} astronaut${def.requiredAstronauts > 1 ? 's' : ''}. Hire crew in the Crew section.`;
      else if (!hasFreeSlot) buyTitle = 'No free slot. Add a slot to a planet or buy a new planet!';
      else if (!canAfford) buyTitle = `Need ${formatNumber(def.cost, settings.compactNumbers)} ⬡${def.requiredAstronauts > 0 ? ` + ${def.requiredAstronauts} crew` : ''} to buy.`;
      else buyTitle = `Need ${formatNumber(def.cost, settings.compactNumbers)} ⬡ and a free slot.`;
    } else buyTitle = `Buy ${def.name} · ${formatNumber(def.cost, settings.compactNumbers)} ⬡${def.requiredAstronauts > 0 ? ` + ${def.requiredAstronauts} crew` : ''}`;

    let maxTitle = 'Buy as many as you can afford with current slots';
    if (maxCount <= 0 || !hasCrew) {
      if (!hasCrew && def.requiredAstronauts > 0) maxTitle = 'Need more crew to buy this upgrade.';
      else if (!hasFreeSlot) maxTitle = 'No free slots. Add slots or buy a new planet.';
      else if (!canAfford) maxTitle = `Need ${formatNumber(def.cost, settings.compactNumbers)} ⬡ to buy at least one.`;
      else maxTitle = 'No free slots or not enough coins/crew to buy more.';
    }

    const isRecommended = canBuy && !player.upgrades.some((u) => u.id === id);
    const crewBadge = def.requiredAstronauts > 0 ? `<span class="upgrade-crew-req" title="Cost in astronauts (spent when you buy)">${def.requiredAstronauts} crew</span>` : '';
    const nameEl = card.querySelector('.upgrade-name');
    if (nameEl) {
      nameEl.innerHTML = def.name + (owned > 0 ? `<span class="count-badge">×${owned}</span>` : '') + crewBadge + (isRecommended ? '<span class="upgrade-recommended">Recommended</span>' : '');
    }
    const select = card.querySelector('.upgrade-planet-select') as HTMLSelectElement | null;
    if (select) {
      const planetsWithSlot = player.getPlanetsWithFreeSlot();
      if (planetsWithSlot.length !== select.options.length) {
        updateStats();
        renderUpgradeList();
        return;
      }
      const selectedId = select.options[select.selectedIndex]?.value;
      if (selectedId && !planetsWithSlot.some((p) => p.id === selectedId)) {
        select.value = planetsWithSlot[0]?.id ?? '';
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
    card.classList.toggle('upgrade-card--needs-crew', !hasCrew && def.requiredAstronauts > 0);
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
