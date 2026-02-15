import { getSession, getSettings, planetService } from '../application/gameState.js';
import { formatNumber } from '../application/format.js';
import { getPlanetEffectiveProduction } from '../application/productionHelpers.js';

export function renderPlanetList(): void {
  const session = getSession();
  if (!session) return;
  const listEl = document.getElementById('planet-list');
  if (!listEl) return;
  const player = session.player;
  const settings = getSettings();
  const cost = planetService.getNewPlanetCost(player);
  const canBuyPlanet = planetService.canBuyNewPlanet(player);
  listEl.innerHTML = player.planets
    .map((p) => {
      const addSlotCost = planetService.getAddSlotCost(p);
      const canAddSlot = planetService.canAddSlot(player, p);
      const slotBtnTitle = canAddSlot ? `Add one upgrade slot · ${formatNumber(addSlotCost, settings.compactNumbers)} ⬡` : `Need ${formatNumber(addSlotCost, settings.compactNumbers)} ⬡ to add a slot`;
      const planetProd = getPlanetEffectiveProduction(p, session);
      const prodLine = planetProd > 0 ? `<div class="planet-card-production">${formatNumber(planetProd, settings.compactNumbers)}/s</div>` : '';
      return `<div class="planet-card" data-planet-id="${p.id}" title="${p.usedSlots}/${p.maxUpgrades} slots${player.planets.length > 1 ? ' • +' + (player.planets.length - 1) * 5 + '% prod from planets' : ''}">
        <div class="planet-card-name">${p.name}</div>
        <div class="planet-card-slots"><span class="planet-slot-value">${p.usedSlots}/${p.maxUpgrades}</span> slots</div>
        ${prodLine}
        <span class="btn-tooltip-wrap" title="${slotBtnTitle}"><button type="button" class="add-slot-btn" data-planet-id="${p.id}" ${canAddSlot ? '' : 'disabled'}>+1 slot · ${formatNumber(addSlotCost, settings.compactNumbers)} ⬡</button></span>
      </div>`;
    })
    .join('');
  const buyPlanetBtn = document.getElementById('buy-planet-btn');
  if (buyPlanetBtn) {
    buyPlanetBtn.textContent = `Buy new planet (${formatNumber(cost, settings.compactNumbers)} ⬡)`;
    const tooltipText = canBuyPlanet ? `Buy a new planet for ${formatNumber(cost, settings.compactNumbers)} ⬡ · +5% production` : `Need ${formatNumber(cost, settings.compactNumbers)} ⬡ to buy a new planet`;
    const wrap = buyPlanetBtn.parentElement?.classList.contains('btn-tooltip-wrap') ? buyPlanetBtn.parentElement : null;
    if (wrap) wrap.setAttribute('title', tooltipText);
    else buyPlanetBtn.setAttribute('title', tooltipText);
    buyPlanetBtn.toggleAttribute('disabled', !canBuyPlanet);
  }
}
