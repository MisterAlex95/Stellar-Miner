import { getSession, getSettings } from '../application/gameState.js';
import { formatNumber } from '../application/format.js';
import { getAssignedAstronauts } from '../application/crewHelpers.js';
import { UPGRADE_CATALOG } from '../application/catalogs.js';
import { getAstronautCost } from '../domain/constants.js';

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
  const cost = getAstronautCost(player.astronautCount);
  const canHire = player.coins.gte(cost);
  hireBtn.textContent = `Hire astronaut · ${formatNumber(cost, settings.compactNumbers)} ⬡`;
  const tooltipText = canHire ? `Hire an astronaut for ${formatNumber(cost, settings.compactNumbers)} ⬡ · +2% production each; required for tier 2+ upgrades` : `Need ${formatNumber(cost, settings.compactNumbers)} ⬡ to hire`;
  const wrap = hireBtn.parentElement?.classList.contains('btn-tooltip-wrap') ? hireBtn.parentElement : null;
  if (wrap) wrap.setAttribute('title', tooltipText);
  else hireBtn.setAttribute('title', tooltipText);
  hireBtn.toggleAttribute('disabled', !canHire);
  const assigned = getAssignedAstronauts(session);
  const free = player.astronautCount;
  if (crewCountEl) {
    crewCountEl.title = 'Free astronauts give +2% production each; assigned crew operate upgrades';
    if (free === 0 && assigned === 0) {
      crewCountEl.textContent = 'No crew yet';
    } else if (free === 0) {
      crewCountEl.textContent = `${assigned} on equipment · 0 free (hire more for +% production)`;
    } else if (assigned > 0) {
      crewCountEl.textContent = `${free} free · +${free * 2}% production | ${assigned} on equipment`;
    } else {
      crewCountEl.textContent = `${free} astronaut${free > 1 ? 's' : ''} · +${free * 2}% production`;
    }
  }
  if (crewOperatesEl) {
    const totalUpgrades = player.upgrades.length;
    const nextUnlock = UPGRADE_CATALOG.find((d) => d.requiredAstronauts > player.astronautCount);
    if (player.astronautCount === 0 && assigned === 0) {
      crewOperatesEl.textContent = 'Hire crew to buy tier 2+ upgrades (each costs coins + astronauts).';
    } else if (nextUnlock) {
      crewOperatesEl.textContent = `${free} available. Next: ${nextUnlock.name} costs ${nextUnlock.requiredAstronauts} crew.`;
    } else {
      crewOperatesEl.textContent = totalUpgrades > 0 ? `${totalUpgrades} upgrade${totalUpgrades !== 1 ? 's' : ''} operated by crew.` : `${free} available.`;
    }
  }
}
