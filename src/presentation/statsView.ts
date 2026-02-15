import {
  getSession,
  getSettings,
  getEventMultiplier,
  getLastCoinsForBump,
  setLastCoinsForBump,
  getNextEventAt,
  getActiveEventInstances,
  getSessionClickCount,
  getSessionCoinsFromClicks,
} from '../application/gameState.js';
import { formatNumber } from '../application/format.js';
import { getTotalClicksEver } from '../application/achievements.js';
import { getAssignedAstronauts } from '../application/crewHelpers.js';
import { renderPrestigeSection } from './prestigeView.js';
import { renderCrewSection } from './crewView.js';

export function updateStats(): void {
  const session = getSession();
  if (!session) return;
  const player = session.player;
  const settings = getSettings();
  const eventMult = getEventMultiplier();
  const effectiveRate = player.effectiveProductionRate * eventMult;
  const coinsEl = document.getElementById('coins-value');
  const rateEl = document.getElementById('production-value');
  const coinsCard = document.getElementById('coins-stat-card');
  if (coinsEl) coinsEl.textContent = formatNumber(player.coins.value, settings.compactNumbers);
  if (rateEl) rateEl.textContent = formatNumber(effectiveRate, settings.compactNumbers) + '/s';
  const crewLineEl = document.getElementById('crew-stat-line');
  if (crewLineEl) {
    const session = getSession();
    const total = player.astronautCount + (session ? getAssignedAstronauts(session) : 0);
    crewLineEl.textContent = total > 0 ? `Crew: ${total} astronaut${total !== 1 ? 's' : ''}` : '';
    crewLineEl.style.display = total > 0 ? 'block' : 'none';
  }
  const lastCoinsForBump = getLastCoinsForBump();
  if (coinsCard && player.coins.value > lastCoinsForBump) {
    coinsCard.classList.add('stat-card--bump');
    setTimeout(() => coinsCard.classList.remove('stat-card--bump'), 400);
  }
  setLastCoinsForBump(player.coins.value);

  const productionCard = document.getElementById('production-stat-card');
  const productionLive = document.getElementById('production-live');
  if (productionCard) productionCard.classList.toggle('stat-card--live', effectiveRate > 0);
  if (productionLive) productionLive.textContent = effectiveRate > 0 ? '●' : '';
  const breakdownEl = document.getElementById('production-breakdown');
  if (breakdownEl) {
    const base = player.productionRate.value;
    const planetBonus = player.planets.length > 1 ? (player.planets.length - 1) * 5 : 0;
    const prestigeBonus = player.prestigeLevel > 0 ? player.prestigeLevel * 5 : 0;
    const crewBonus = player.astronautCount > 0 ? player.astronautCount * 2 : 0;
    const parts: string[] = [];
    if (base > 0) parts.push(`Base ${formatNumber(base, settings.compactNumbers)}/s`);
    if (planetBonus > 0) parts.push(`+${planetBonus}% planets`);
    if (prestigeBonus > 0) parts.push(`+${prestigeBonus}% prestige`);
    if (crewBonus > 0) parts.push(`+${crewBonus}% crew`);
    if (eventMult > 1) parts.push(`×${eventMult.toFixed(1)} event`);
    breakdownEl.textContent = parts.length > 0 ? parts.join(' · ') : '';
    breakdownEl.style.display = parts.length > 0 ? '' : 'none';
  }
  const sessionEl = document.getElementById('session-stats');
  if (sessionEl) {
    const totalClicks = getTotalClicksEver();
    const sessionClickCount = getSessionClickCount();
    const sessionCoinsFromClicks = getSessionCoinsFromClicks();
    if (sessionClickCount > 0 || sessionCoinsFromClicks > 0 || totalClicks > 0) {
      const parts: string[] = [];
      if (sessionClickCount > 0 || sessionCoinsFromClicks > 0)
        parts.push(`Session: ${sessionClickCount} clicks · ${formatNumber(sessionCoinsFromClicks, settings.compactNumbers)} ⬡`);
      if (totalClicks > 0) parts.push(`Lifetime: ${formatNumber(totalClicks, settings.compactNumbers)} clicks`);
      sessionEl.textContent = parts.join(' · ');
      sessionEl.style.display = 'block';
    } else {
      sessionEl.style.display = 'none';
    }
  }
  renderPrestigeSection();
  renderCrewSection();

  const activeEventInstances = getActiveEventInstances();
  const nextEventAt = getNextEventAt();
  const activeEl = document.getElementById('active-events');
  if (activeEl) {
    const now = Date.now();
    const active = activeEventInstances.filter((a) => a.endsAt > now);
    if (active.length === 0) {
      activeEl.innerHTML = '';
      activeEl.style.display = 'none';
    } else {
      activeEl.style.display = 'block';
      activeEl.innerHTML = active
        .map(
          (a) =>
            `<span class="event-badge" title="${a.event.name}: ×${a.event.effect.multiplier} production">${a.event.name} (${Math.ceil((a.endsAt - now) / 1000)}s)</span>`
        )
        .join('');
    }
  }
  const nextEventEl = document.getElementById('next-event-countdown');
  if (nextEventEl) {
    const now = Date.now();
    const active = activeEventInstances.filter((a) => a.endsAt > now);
    if (active.length > 0) {
      nextEventEl.textContent = '';
      nextEventEl.style.display = 'none';
    } else {
      const secs = Math.max(0, Math.ceil((nextEventAt - now) / 1000));
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      nextEventEl.textContent = m > 0 ? `Next event in ${m}:${s.toString().padStart(2, '0')}` : `Next event in ${secs}s`;
      nextEventEl.style.display = 'block';
    }
  }
}
