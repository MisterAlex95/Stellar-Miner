import { getSession, getSettings, planetService } from '../application/gameState.js';
import { formatNumber } from '../application/format.js';
import { hasEffectiveFreeSlot } from '../application/research.js';
import { t, tParam } from '../application/strings.js';
import { getCatalogPlanetNameById } from '../application/i18nCatalogs.js';
import { HOUSING_ASTRONAUT_CAPACITY } from '../domain/constants.js';

export function renderHousingSection(): void {
  const session = getSession();
  if (!session) return;
  const listEl = document.getElementById('housing-list');
  if (!listEl) return;
  const player = session.player;
  const settings = getSettings();
  const planetsWithSlot = player.planets.filter(hasEffectiveFreeSlot);
  if (planetsWithSlot.length === 0) {
    listEl.innerHTML = `<p class="housing-empty">${t('housingNoSlot')}</p>`;
    return;
  }
  listEl.innerHTML = planetsWithSlot
    .map((p) => {
      const cost = planetService.getHousingCost(p);
      const canBuild = planetService.canBuildHousing(player, p, hasEffectiveFreeSlot);
      const planetName = getCatalogPlanetNameById(p.id);
      const housingInfo = p.housingCount > 0 ? ` (${p.housingCount} ${t('housingBuilt')})` : '';
      const tooltip = canBuild
        ? tParam('housingBuildTooltip', { planet: planetName, cost: formatNumber(cost, settings.compactNumbers), capacity: HOUSING_ASTRONAUT_CAPACITY })
        : tParam('needCoinsForHousing', { cost: formatNumber(cost, settings.compactNumbers) });
      return `<div class="housing-card" data-planet-id="${p.id}">
        <span class="housing-planet-name">${planetName}${housingInfo}</span>
        <span class="btn-tooltip-wrap" title="${tooltip}">
          <button type="button" class="build-housing-btn" data-planet-id="${p.id}" ${canBuild ? '' : 'disabled'}>
            ${tParam('buildHousingBtn', { cost: formatNumber(cost, settings.compactNumbers) })}
          </button>
        </span>
      </div>`;
    })
    .join('');
}
