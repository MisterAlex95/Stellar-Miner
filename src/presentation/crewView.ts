import { getSession, getSettings } from '../application/gameState.js';
import { formatNumber } from '../application/format.js';
import { getAssignedAstronauts } from '../application/crewHelpers.js';
import { UPGRADE_CATALOG } from '../application/catalogs.js';
import { getAstronautCost, getMaxAstronauts, CREW_ROLES, type CrewRole } from '../domain/constants.js';
import { t, tParam, type StringKey } from '../application/strings.js';
import { getCatalogUpgradeName } from '../application/i18nCatalogs.js';
import { getEffectiveRequiredAstronauts } from '../application/research.js';
import { updateTooltipForButton } from './components/buttonTooltip.js';

const ROLE_KEYS: Record<CrewRole, StringKey> = {
  miner: 'crewRoleMiner',
  scientist: 'crewRoleScientist',
  pilot: 'crewRolePilot',
};

const ROLE_HINT_KEYS: Record<CrewRole, StringKey> = {
  miner: 'crewRoleMinerHint',
  scientist: 'crewRoleScientistHint',
  pilot: 'crewRolePilotHint',
};

export function renderCrewSection(): void {
  const session = getSession();
  if (!session) return;
  const player = session.player;
  const settings = getSettings();
  const crewCountEl = document.getElementById('crew-count');
  const crewBreakdownEl = document.getElementById('crew-breakdown');
  const crewVeteransEl = document.getElementById('crew-veterans');
  const crewOperatesEl = document.getElementById('crew-operates');
  if (!crewCountEl) return;
  const assigned = getAssignedAstronauts(session);
  const free = player.astronautCount;
  const totalHousing = player.planets.reduce((s, p) => s + p.housingCount, 0);
  const maxCrew = getMaxAstronauts(player.planets.length, totalHousing);
  const totalCrew = free + assigned;
  const atCap = totalCrew >= maxCrew;
  const cost = getAstronautCost(free);
  const canHire = player.coins.gte(cost) && !atCap;
  const costStr = formatNumber(cost, settings.compactNumbers);

  if (crewBreakdownEl) {
    const { miner, scientist, pilot } = player.crewByRole;
    if (free > 0) {
      crewBreakdownEl.textContent = tParam('crewBreakdown', {
        miners: String(miner),
        scientists: String(scientist),
        pilots: String(pilot),
      });
      crewBreakdownEl.style.display = '';
    } else {
      crewBreakdownEl.textContent = '';
      crewBreakdownEl.style.display = 'none';
    }
  }
  if (crewVeteransEl) {
    if (player.veteranCount > 0) {
      crewVeteransEl.textContent = tParam('crewVeterans', { n: String(player.veteranCount) });
      crewVeteransEl.style.display = '';
    } else {
      crewVeteransEl.textContent = '';
      crewVeteransEl.style.display = 'none';
    }
  }

  CREW_ROLES.forEach((role) => {
    const btn = document.getElementById(`hire-astronaut-${role}`);
    if (!btn || !(btn instanceof HTMLButtonElement)) return;
    const roleLabel = t(ROLE_KEYS[role]);
    const textEl = btn.querySelector('.crew-btn-text');
    if (textEl) textEl.textContent = tParam('hireAsRole', { role: roleLabel, cost: costStr });
    const tooltipText = atCap
      ? tParam('freeAstronautsTitle', { max: maxCrew, planets: player.planets.length })
      : canHire
        ? t(ROLE_HINT_KEYS[role]) + ` · ${costStr} ⬡ (${totalCrew}/${maxCrew}).`
        : tParam('needCoinsToBuy', { cost: costStr, crew: '' }) + ` (${totalCrew}/${maxCrew}).`;
    updateTooltipForButton(btn, tooltipText);
    btn.toggleAttribute('disabled', !canHire);
  });

  crewCountEl.title = tParam('freeAstronautsTitle', { max: maxCrew, planets: player.planets.length });
  if (free === 0 && assigned === 0) {
    crewCountEl.textContent = tParam('noCrewYetMax', { max: maxCrew });
  } else if (free === 0) {
    crewCountEl.textContent = tParam('crewLineAssigned', { assigned: String(assigned), max: String(maxCrew) });
  } else if (assigned > 0) {
    const pct = Math.round(player.crewByRole.miner * 2 + (player.crewByRole.scientist + player.crewByRole.pilot) * 1);
    crewCountEl.textContent = tParam('crewLineFree', { free: String(free), pct: String(pct), assigned: String(assigned), total: String(totalCrew), max: String(maxCrew) });
  } else {
    const pct = Math.round(player.crewByRole.miner * 2 + (player.crewByRole.scientist + player.crewByRole.pilot) * 1);
    crewCountEl.textContent = tParam('crewLineAstronauts', { free: String(free), max: String(maxCrew), pct: String(pct) });
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
