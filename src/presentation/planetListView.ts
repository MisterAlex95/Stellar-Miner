import { getSession, getSettings, planetService } from '../application/gameState.js';
import { formatNumber } from '../application/format.js';
import { getPlanetEffectiveProduction } from '../application/productionHelpers.js';
import { t, tParam } from '../application/strings.js';
import { getCatalogPlanetNameById } from '../application/i18nCatalogs.js';

export function renderPlanetList(): void {
  const session = getSession();
  if (!session) return;
  const listEl = document.getElementById('planet-list');
  if (!listEl) return;
  const player = session.player;
  const settings = getSettings();
  const cost = planetService.getNewPlanetCost(player);
  const astronautsRequired = planetService.getExpeditionAstronautsRequired(player);
  const canLaunch = planetService.canLaunchExpedition(player);
  const planetName = (pl: { id: string }) => getCatalogPlanetNameById(pl.id);
  listEl.innerHTML = player.planets
    .map((p) => {
      const addSlotCost = planetService.getAddSlotCost(p);
      const canAddSlot = planetService.canAddSlot(player, p);
      const slotBtnTitle = canAddSlot ? tParam('addSlotTooltip', { cost: formatNumber(addSlotCost, settings.compactNumbers) }) : tParam('needCoinsForSlot', { cost: formatNumber(addSlotCost, settings.compactNumbers) });
      const planetProd = getPlanetEffectiveProduction(p, session);
      const prodLine = planetProd > 0 ? `<div class="planet-card-production">${formatNumber(planetProd, settings.compactNumbers)}/s</div>` : '';
      const cardTitle = player.planets.length > 1
        ? tParam('planetCardTitleProd', { used: p.usedSlots, max: p.maxUpgrades, pct: String((player.planets.length - 1) * 5) })
        : tParam('planetCardTitle', { used: p.usedSlots, max: p.maxUpgrades });
      return `<div class="planet-card" data-planet-id="${p.id}" title="${cardTitle}">
        <div class="planet-card-name">${planetName(p)}</div>
        <div class="planet-card-slots"><span class="planet-slot-value">${p.usedSlots}/${p.maxUpgrades}</span> ${t('slots')}</div>
        ${prodLine}
        <span class="btn-tooltip-wrap" title="${slotBtnTitle}"><button type="button" class="add-slot-btn" data-planet-id="${p.id}" ${canAddSlot ? '' : 'disabled'}>${tParam('addSlotBtn', { cost: formatNumber(addSlotCost, settings.compactNumbers) })}</button></span>
      </div>`;
    })
    .join('');
  const buyPlanetBtn = document.getElementById('buy-planet-btn');
  if (buyPlanetBtn) {
    buyPlanetBtn.textContent = tParam('sendExpeditionBtn', { cost: formatNumber(cost, settings.compactNumbers), n: astronautsRequired });
    const tooltipText = canLaunch
      ? tParam('sendExpeditionTooltip', { n: astronautsRequired, cost: formatNumber(cost, settings.compactNumbers) })
      : tParam('needForExpedition', { cost: formatNumber(cost, settings.compactNumbers), n: astronautsRequired });
    const wrap = buyPlanetBtn.parentElement?.classList.contains('btn-tooltip-wrap') ? buyPlanetBtn.parentElement : null;
    if (wrap) wrap.setAttribute('title', tooltipText);
    else buyPlanetBtn.setAttribute('title', tooltipText);
    buyPlanetBtn.toggleAttribute('disabled', !canLaunch);
  }
}
