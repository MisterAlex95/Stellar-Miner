import {
  getSession,
  getSettings,
  getEventMultiplier,
  getLastCoinsForBump,
  setLastCoinsForBump,
  getNextEventAt,
  getActiveEventInstances,
} from '../application/gameState.js';
import { formatNumber } from '../application/format.js';
import { getAssignedAstronauts } from '../application/crewHelpers.js';
import { renderPrestigeSection } from './prestigeView.js';
import { renderCrewSection } from './crewView.js';
import { EVENT_INTERVAL_MS } from '../application/catalogs.js';
import { getNextMilestone } from '../application/progression.js';
import { getResearchProductionMultiplier, getResearchProductionPercent } from '../application/research.js';
import { t, tParam, type StringKey } from '../application/strings.js';
import { getCatalogEventName } from '../application/i18nCatalogs.js';

let displayedCoins = -1;
let displayedProduction = -1;

/** Call from game loop with dt to animate coin counter toward target. */
export function updateCoinDisplay(dt: number): void {
  const session = getSession();
  if (!session) return;
  const target = session.player.coins.value;
  const settings = getSettings();
  const coinsEl = document.getElementById('coins-value');
  if (!coinsEl) return;
  if (displayedCoins < 0) displayedCoins = target;
  else {
    const speed = 12;
    displayedCoins += (target - displayedCoins) * Math.min(1, dt * speed);
    if (Math.abs(displayedCoins - target) < 0.5) displayedCoins = target;
  }
  coinsEl.textContent = formatNumber(Math.floor(displayedCoins), settings.compactNumbers);
}

/** Call from game loop with dt to animate production rate toward target. */
export function updateProductionDisplay(dt: number): void {
  const session = getSession();
  if (!session) return;
  const eventMult = getEventMultiplier();
  const researchMult = getResearchProductionMultiplier();
  const target = session.player.effectiveProductionRate * eventMult * researchMult;
  const settings = getSettings();
  const rateEl = document.getElementById('production-value');
  if (!rateEl) return;
  if (displayedProduction < 0) displayedProduction = target;
  else {
    const speed = 10;
    displayedProduction += (target - displayedProduction) * Math.min(1, dt * speed);
    if (Math.abs(displayedProduction - target) < 0.05) displayedProduction = target;
  }
  rateEl.textContent = formatNumber(displayedProduction, settings.compactNumbers) + '/s';
}

export function syncCoinDisplay(): void {
  const session = getSession();
  if (!session) return;
  displayedCoins = session.player.coins.value;
  const coinsEl = document.getElementById('coins-value');
  if (coinsEl) coinsEl.textContent = formatNumber(Math.floor(displayedCoins), getSettings().compactNumbers);
}

export function syncProductionDisplay(): void {
  const session = getSession();
  if (!session) return;
  const eventMult = getEventMultiplier();
  const researchMult = getResearchProductionMultiplier();
  displayedProduction = session.player.effectiveProductionRate * eventMult * researchMult;
  const rateEl = document.getElementById('production-value');
  if (rateEl) rateEl.textContent = formatNumber(displayedProduction, getSettings().compactNumbers) + '/s';
}

export function updateStats(): void {
  const session = getSession();
  if (!session) return;
  const player = session.player;
  const settings = getSettings();
  const eventMult = getEventMultiplier();
  const researchMult = getResearchProductionMultiplier();
  const effectiveRate = player.effectiveProductionRate * eventMult * researchMult;
  const coinsCard = document.getElementById('coins-stat-card');
  const crewLineEl = document.getElementById('crew-stat-line');
  if (crewLineEl) {
    const session = getSession();
    const total = player.astronautCount + (session ? getAssignedAstronauts(session) : 0);
    crewLineEl.textContent = total > 0 ? tParam('crewStatFormat', { n: total }) : '';
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
    if (base > 0) parts.push(`${t('breakdownBase')} ${formatNumber(base, settings.compactNumbers)}/s`);
    if (planetBonus > 0) parts.push(`+${planetBonus}% ${t('breakdownPlanets')}`);
    if (prestigeBonus > 0) parts.push(`+${prestigeBonus}% ${t('breakdownPrestige')}`);
    if (crewBonus > 0) parts.push(`+${crewBonus}% ${t('breakdownCrew')}`);
    const researchPct = getResearchProductionPercent();
    if (researchPct > 0) parts.push(`+${Math.round(researchPct)}% ${t('breakdownResearch')}`);
    if (eventMult > 1) parts.push(`×${eventMult.toFixed(1)} ${t('breakdownEvent')}`);
    breakdownEl.textContent = parts.length > 0 ? parts.join(' · ') : '';
    breakdownEl.style.display = parts.length > 0 ? '' : 'none';
  }
  renderPrestigeSection();
  renderCrewSection();

  const nextMilestoneEl = document.getElementById('next-milestone');
  if (nextMilestoneEl) {
    const milestone = getNextMilestone(session);
    if (milestone) {
      const remaining = Math.max(0, milestone.coinsNeeded - session.player.coins.value);
      const titleKey = ('progression' + milestone.block.id.charAt(0).toUpperCase() + milestone.block.id.slice(1) + 'Title') as StringKey;
      nextMilestoneEl.textContent = tParam('nextMilestoneFormat', { remaining: formatNumber(remaining, settings.compactNumbers), title: t(titleKey) });
      nextMilestoneEl.style.display = 'block';
    } else {
      nextMilestoneEl.textContent = '';
      nextMilestoneEl.style.display = 'none';
    }
  }

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
          (a) => {
            const name = getCatalogEventName(a.event.id);
            return `<span class="event-badge" title="${tParam('eventBadgeTitle', { name, mult: String(a.event.effect.multiplier) })}">${name} (${Math.ceil((a.endsAt - now) / 1000)}s)</span>`;
          }
        )
        .join('');
    }
  }
  const nextEventEl = document.getElementById('next-event-countdown');
  const nextEventProgressWrap = document.getElementById('next-event-progress-wrap');
  const nextEventProgressBar = document.getElementById('next-event-progress-bar');
  const now = Date.now();
  const active = activeEventInstances.filter((a) => a.endsAt > now);
  if (nextEventEl) {
    if (active.length > 0) {
      nextEventEl.textContent = '';
      nextEventEl.style.display = 'none';
    } else {
      const secs = Math.max(0, Math.ceil((nextEventAt - now) / 1000));
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      nextEventEl.textContent = m > 0 ? tParam('nextEventInFormat', { time: `${m}:${s.toString().padStart(2, '0')}` }) : tParam('nextEventInFormat', { time: `${secs}s` });
      nextEventEl.style.display = 'block';
    }
  }
  if (nextEventProgressWrap && nextEventProgressBar && active.length === 0) {
    const progress = Math.max(0, Math.min(1, 1 - (nextEventAt - now) / EVENT_INTERVAL_MS));
    nextEventProgressWrap.style.display = 'block';
    nextEventProgressBar.style.width = `${progress * 100}%`;
  } else if (nextEventProgressWrap) {
    nextEventProgressWrap.style.display = active.length > 0 ? 'none' : 'block';
  }
}
