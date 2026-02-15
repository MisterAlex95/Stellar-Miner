import { getSession, getSettings, planetService } from '../application/gameState.js';
import { formatNumber } from '../application/format.js';
import { getPlanetEffectiveProduction } from '../application/productionHelpers.js';
import { getPlanetType } from '../application/planetAffinity.js';
import { getEffectiveUsedSlots, hasEffectiveFreeSlot } from '../application/research.js';
import { t, tParam } from '../application/strings.js';
import { drawPlanetSphereToCanvas } from './MineZoneCanvas.js';
import { buttonWithTooltipHtml, updateTooltipForButton } from './components/buttonTooltip.js';
import { escapeAttr } from './components/domUtils.js';
import { HOUSING_ASTRONAUT_CAPACITY } from '../domain/constants.js';

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
  const planetName = (pl: { name: string }) => pl.name;
  listEl.innerHTML = player.planets
    .map((p) => {
      const addSlotCost = planetService.getAddSlotCost(p);
      const canAddSlot = planetService.canAddSlot(player, p);
      const slotBtnTitle = canAddSlot ? tParam('addSlotTooltip', { cost: formatNumber(addSlotCost, settings.compactNumbers) }) : tParam('needCoinsForSlot', { cost: formatNumber(addSlotCost, settings.compactNumbers) });
      const planetProd = getPlanetEffectiveProduction(p, session);
      const prodStr = formatNumber(planetProd, settings.compactNumbers);
      const prodClass = planetProd.gt(0) ? 'planet-card-production' : 'planet-card-production planet-card-production--zero';
      const prodLine = `<div class="${prodClass}">${prodStr}/s</div>`;
      const effectiveUsed = getEffectiveUsedSlots(p);
      const cardTitle = player.planets.length > 1
        ? tParam('planetCardTitleProd', { used: effectiveUsed, max: p.maxUpgrades, pct: String((player.planets.length - 1) * 5) })
        : tParam('planetCardTitle', { used: effectiveUsed, max: p.maxUpgrades });
      const planetType = getPlanetType(p.name);
      const typeLabel = planetType.charAt(0).toUpperCase() + planetType.slice(1);
      const lines: string[] = [
        planetName(p),
        `${t('planetInfoType')}: ${typeLabel}`,
        `${t('planetInfoSlots')}: ${effectiveUsed}/${p.maxUpgrades}`,
        `${t('planetInfoProduction')}: ${prodStr}/s`,
      ];
      if (p.housingCount > 0) {
        const crewCap = p.housingCount * 2;
        lines.push(`${t('planetInfoHousing')}: ${tParam('planetInfoHousingLine', { n: String(p.housingCount), crew: String(crewCap) })}`);
      }
      const planetInfoTooltip = lines.join('\n');
      const hasSlot = hasEffectiveFreeSlot(p);
      const housingCost = planetService.getHousingCost(p);
      const canBuildHousing = planetService.canBuildHousing(player, p, hasEffectiveFreeSlot);
      const housingTooltip = canBuildHousing
        ? tParam('housingBuildTooltip', { planet: planetName(p), cost: formatNumber(housingCost, settings.compactNumbers), capacity: HOUSING_ASTRONAUT_CAPACITY })
        : tParam('needCoinsForHousing', { cost: formatNumber(housingCost, settings.compactNumbers) });
      const housingBtn = hasSlot
        ? buttonWithTooltipHtml(housingTooltip, `<button type="button" class="build-housing-btn" data-planet-id="${p.id}" ${canBuildHousing ? '' : 'disabled'}>${tParam('buildHousingBtn', { cost: formatNumber(housingCost, settings.compactNumbers) })}</button>`)
        : '';
      return `<div class="planet-card" data-planet-id="${p.id}" title="${cardTitle}">
        <div class="planet-card-header">
          <canvas class="planet-card-visual" width="48" height="48" data-planet-id="${p.id}" data-planet-name="${escapeAttr(p.name)}" aria-hidden="true"></canvas>
          <div class="planet-card-name-wrap">
            <span class="planet-card-name">${planetName(p)}</span>
            ${buttonWithTooltipHtml(planetInfoTooltip, `<span class="planet-card-info" aria-label="${t('planetInfoTitle')}">ℹ</span>`, 'planet-card-info-wrap')}
          </div>
        </div>
        <div class="planet-card-slots"><span class="planet-slot-value">${effectiveUsed}/${p.maxUpgrades}</span> ${t('slots')}</div>
        ${prodLine}
        <div class="planet-card-actions">
          ${buttonWithTooltipHtml(slotBtnTitle, `<button type="button" class="add-slot-btn" data-planet-id="${p.id}" ${canAddSlot ? '' : 'disabled'}>${tParam('addSlotBtn', { cost: formatNumber(addSlotCost, settings.compactNumbers) })}</button>`)}
          ${housingBtn}
        </div>
      </div>`;
    })
    .join('');
  listEl.querySelectorAll<HTMLCanvasElement>('.planet-card-visual').forEach((canvas) => {
    const planetName = canvas.getAttribute('data-planet-name');
    if (planetName) drawPlanetSphereToCanvas(canvas, planetName);
  });
  const buyPlanetBtn = document.getElementById('buy-planet-btn');
  if (buyPlanetBtn) {
    buyPlanetBtn.textContent = tParam('sendExpeditionBtn', { cost: formatNumber(cost, settings.compactNumbers), n: astronautsRequired });
    const tooltipText = canLaunch
      ? tParam('sendExpeditionTooltip', { n: astronautsRequired, cost: formatNumber(cost, settings.compactNumbers) })
      : tParam('needForExpedition', { cost: formatNumber(cost, settings.compactNumbers), n: astronautsRequired });
    updateTooltipForButton(buyPlanetBtn, tooltipText);
    buyPlanetBtn.toggleAttribute('disabled', !canLaunch);
  }
}
