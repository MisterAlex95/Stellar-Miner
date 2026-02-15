import { getSession, getSettings } from '../application/gameState.js';
import { formatNumber } from '../application/format.js';
import { getAssignedAstronauts } from '../application/crewHelpers.js';
import { UPGRADE_CATALOG } from '../application/catalogs.js';
import { getAstronautCost, getMaxAstronauts } from '../domain/constants.js';
import { t, tParam } from '../application/strings.js';
import { getCatalogUpgradeName } from '../application/i18nCatalogs.js';
import { getEffectiveRequiredAstronauts } from '../application/research.js';
import { updateTooltipForButton } from './components/buttonTooltip.js';

export function renderCrewSection(): void {
  const session = getSession();
  if (!session) return;
  const player = session.player;
  const settings = getSettings();
  const listEl = document.getElementById('crew-section');
  const hireBtn = document.getElementById('hire-astronaut-btn');
  const crewCountEl = document.getElementById('crew-count');
  const crewOperatesEl = document.getElementById('crew-operates');
  if (!listEl || !hireBtn) return;
  const assigned = getAssignedAstronauts(session);
  const free = player.astronautCount;
  const totalHousing = player.planets.reduce((s, p) => s + p.housingCount, 0);
  const maxCrew = getMaxAstronauts(player.planets.length, totalHousing);
  const totalCrew = free + assigned;
  const atCap = totalCrew >= maxCrew;
  const cost = getAstronautCost(free);
  const canHire = player.coins.gte(cost) && !atCap;
  hireBtn.textContent = tParam('hireAstronautCost', { cost: formatNumber(cost, settings.compactNumbers) });
  const costStr = formatNumber(cost, settings.compactNumbers);
  const tooltipText = atCap
    ? tParam('freeAstronautsTitle', { max: maxCrew, planets: player.planets.length })
    : canHire
      ? t('hireAstronaut') + ` · ${costStr} ⬡ · +2% production each (${totalCrew}/${maxCrew}).`
      : tParam('needCoinsToBuy', { cost: costStr, crew: '' }) + ` (${totalCrew}/${maxCrew}).`;
  updateTooltipForButton(hireBtn, tooltipText);
  hireBtn.toggleAttribute('disabled', !canHire);
  if (crewCountEl) {
    crewCountEl.title = tParam('freeAstronautsTitle', { max: maxCrew, planets: player.planets.length });
    if (free === 0 && assigned === 0) {
      crewCountEl.textContent = tParam('noCrewYetMax', { max: maxCrew });
    } else if (free === 0) {
      crewCountEl.textContent = tParam('crewLineAssigned', { assigned: String(assigned), max: String(maxCrew) });
    } else if (assigned > 0) {
      crewCountEl.textContent = tParam('crewLineFree', { free: String(free), pct: String(free * 2), assigned: String(assigned), total: String(totalCrew), max: String(maxCrew) });
    } else {
      crewCountEl.textContent = tParam('crewLineAstronauts', { free: String(free), max: String(maxCrew), pct: String(free * 2) });
    }
  }
  if (crewOperatesEl) {
    const totalUpgrades = player.upgrades.length;
    const nextUnlock = UPGRADE_CATALOG.find((d) => getEffectiveRequiredAstronauts(d.id) > player.astronautCount);
    if (player.astronautCount === 0 && assigned === 0) {
      crewOperatesEl.textContent = t('crewOperatesHint');
    } else if (nextUnlock) {
      crewOperatesEl.textContent = tParam('crewOperatesNext', { free: String(free), name: getCatalogUpgradeName(nextUnlock.id), n: String(getEffectiveRequiredAstronauts(nextUnlock.id)) });
    } else {
      crewOperatesEl.textContent = totalUpgrades > 0 ? tParam('crewOperatesUpgrades', { n: String(totalUpgrades) }) : tParam('crewOperatesAvailable', { free: String(free) });
    }
  }
}
