import { getSession, getSettings, planetService } from '../application/gameState.js';
import { formatNumber } from '../application/format.js';
import { getPlanetEffectiveProduction } from '../application/productionHelpers.js';
import { getPlanetType } from '../application/planetAffinity.js';
import { getEffectiveUsedSlots } from '../application/research.js';
import { t, tParam } from '../application/strings.js';
import { getCatalogPlanetNameById, getCatalogUpgradeName } from '../application/i18nCatalogs.js';
import { drawPlanetSphereToCanvas } from './MineZoneCanvas.js';

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
      const prodStr = formatNumber(planetProd, settings.compactNumbers);
      const prodClass = planetProd.gt(0) ? 'planet-card-production' : 'planet-card-production planet-card-production--zero';
      const prodLine = `<div class="${prodClass}">${prodStr}/s</div>`;
      const effectiveUsed = getEffectiveUsedSlots(p);
      const cardTitle = player.planets.length > 1
        ? tParam('planetCardTitleProd', { used: effectiveUsed, max: p.maxUpgrades, pct: String((player.planets.length - 1) * 5) })
        : tParam('planetCardTitle', { used: effectiveUsed, max: p.maxUpgrades });
      const planetType = getPlanetType(p.id);
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
      const upgradeCounts: Record<string, number> = {};
      for (const u of p.upgrades) {
        upgradeCounts[u.id] = (upgradeCounts[u.id] ?? 0) + 1;
      }
      const upgradeEntries = Object.entries(upgradeCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([id, n]) => `${getCatalogUpgradeName(id)} ×${n}`);
      if (upgradeEntries.length > 0) {
        lines.push(`${t('planetInfoEquipment')}:`);
        lines.push(upgradeEntries.join('\n'));
      }
      const planetInfoTooltip = lines.join('\n');
      return `<div class="planet-card" data-planet-id="${p.id}" title="${cardTitle}">
        <div class="planet-card-header">
          <canvas class="planet-card-visual" width="48" height="48" data-planet-id="${p.id}" aria-hidden="true"></canvas>
          <div class="planet-card-name-wrap">
            <span class="planet-card-name">${planetName(p)}</span>
            <span class="btn-tooltip-wrap planet-card-info-wrap" title="${planetInfoTooltip.replace(/"/g, '&quot;')}"><span class="planet-card-info" aria-label="${t('planetInfoTitle')}">ℹ</span></span>
          </div>
        </div>
        <div class="planet-card-slots"><span class="planet-slot-value">${effectiveUsed}/${p.maxUpgrades}</span> ${t('slots')}</div>
        ${prodLine}
        <span class="btn-tooltip-wrap" title="${slotBtnTitle}"><button type="button" class="add-slot-btn" data-planet-id="${p.id}" ${canAddSlot ? '' : 'disabled'}>${tParam('addSlotBtn', { cost: formatNumber(addSlotCost, settings.compactNumbers) })}</button></span>
      </div>`;
    })
    .join('');
  listEl.querySelectorAll<HTMLCanvasElement>('.planet-card-visual').forEach((canvas) => {
    const planetId = canvas.getAttribute('data-planet-id');
    if (planetId) drawPlanetSphereToCanvas(canvas, planetId);
  });
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
