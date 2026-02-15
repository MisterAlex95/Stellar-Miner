import Decimal from 'break_infinity.js';
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
import { getMaxAstronauts } from '../domain/constants.js';
import { renderPrestigeSection } from './prestigeView.js';
import { renderCrewSection } from './crewView.js';
import { EVENT_INTERVAL_MS, EVENT_CATALOG } from '../application/catalogs.js';
import { getDiscoveredEventIds } from '../application/gameState.js';
import { getNextMilestone, getUnlockedBlocks } from '../application/progression.js';
import { getResearchProductionMultiplier, getResearchProductionPercent } from '../application/research.js';
import { t, tParam, type StringKey } from '../application/strings.js';
import { getCatalogEventName } from '../application/i18nCatalogs.js';
import { createEventBadgeHtml } from './components/eventBadge.js';

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
  const targetNum = target.toNumber();
  if (target.lte(Decimal.NUMBER_MAX_VALUE) && Number.isFinite(targetNum)) {
    if (displayedCoins < 0) displayedCoins = targetNum;
    else {
      const speed = 12;
      displayedCoins += (targetNum - displayedCoins) * Math.min(1, dt * speed);
      if (Math.abs(displayedCoins - targetNum) < 0.5) displayedCoins = targetNum;
    }
    coinsEl.textContent = formatNumber(Math.floor(displayedCoins), settings.compactNumbers);
    if (settings.compactNumbers) coinsEl.title = target.toFixed(2);
    else coinsEl.removeAttribute('title');
  } else {
    coinsEl.textContent = formatNumber(target, settings.compactNumbers);
    coinsEl.title = target.toFixed(2);
  }
}

/** Call from game loop with dt to animate production rate toward target. */
export function updateProductionDisplay(dt: number): void {
  const session = getSession();
  if (!session) return;
  const eventMult = getEventMultiplier();
  const researchMult = getResearchProductionMultiplier();
  const target = session.player.effectiveProductionRate.mul(eventMult * researchMult);
  const settings = getSettings();
  const rateEl = document.getElementById('production-value');
  if (!rateEl) return;
  const targetNum = target.toNumber();
  if (target.lte(Decimal.NUMBER_MAX_VALUE) && Number.isFinite(targetNum)) {
    if (displayedProduction < 0) displayedProduction = targetNum;
    else {
      const speed = 10;
      displayedProduction += (targetNum - displayedProduction) * Math.min(1, dt * speed);
      if (Math.abs(displayedProduction - targetNum) < 0.05) displayedProduction = targetNum;
    }
    rateEl.textContent = formatNumber(displayedProduction, settings.compactNumbers) + '/s';
    if (settings.compactNumbers) rateEl.title = target.toFixed(2) + '/s';
    else rateEl.removeAttribute('title');
  } else {
    rateEl.textContent = formatNumber(target, settings.compactNumbers) + '/s';
    rateEl.title = target.toFixed(2) + '/s';
  }
}

export function syncCoinDisplay(): void {
  const session = getSession();
  if (!session) return;
  const target = session.player.coins.value;
  displayedCoins = target.toNumber();
  const coinsEl = document.getElementById('coins-value');
  if (coinsEl) {
    coinsEl.textContent = formatNumber(target, getSettings().compactNumbers);
    if (getSettings().compactNumbers) coinsEl.title = target.toFixed(2);
    else coinsEl.removeAttribute('title');
  }
}

export function syncProductionDisplay(): void {
  const session = getSession();
  if (!session) return;
  const eventMult = getEventMultiplier();
  const researchMult = getResearchProductionMultiplier();
  const target = session.player.effectiveProductionRate.mul(eventMult * researchMult);
  displayedProduction = target.toNumber();
  const rateEl = document.getElementById('production-value');
  if (rateEl) {
    rateEl.textContent = formatNumber(target, getSettings().compactNumbers) + '/s';
    if (getSettings().compactNumbers) rateEl.title = target.toFixed(2) + '/s';
    else rateEl.removeAttribute('title');
  }
}

export function updateStats(): void {
  const session = getSession();
  if (!session) return;
  const player = session.player;
  const settings = getSettings();
  const eventMult = getEventMultiplier();
  const researchMult = getResearchProductionMultiplier();
  const effectiveRate = player.effectiveProductionRate.mul(eventMult * researchMult);
  const coinsCard = document.getElementById('coins-stat-card');
  const crewLineEl = document.getElementById('crew-stat-line');
  const crewDetailEl = document.getElementById('crew-stat-detail');
  const freeCrew = player.astronautCount;
  const assignedCrew = session ? getAssignedAstronauts(session) : 0;
  const totalCrew = freeCrew + assignedCrew;
  const showCrew = totalCrew > 0;
  if (crewLineEl) {
    crewLineEl.textContent = showCrew ? tParam('crewStatFormat', { n: freeCrew }) : '';
    crewLineEl.style.display = showCrew ? 'block' : 'none';
  }
  if (crewDetailEl) {
    crewDetailEl.textContent = showCrew ? tParam('crewStatDetail', { assigned: String(assignedCrew), total: String(totalCrew) }) : '';
    crewDetailEl.style.display = showCrew ? 'block' : 'none';
  }
  const crewByJobEl = document.getElementById('crew-stat-by-job');
  if (crewByJobEl) {
    if (showCrew) {
      const { miner, scientist, pilot } = player.crewByRole;
      crewByJobEl.innerHTML = [
        `<span class="crew-stat-role crew-stat-role--miner">${miner} ${t('crewStatRoleMiners')}</span>`,
        `<span class="crew-stat-role crew-stat-role--scientist">${scientist} ${t('crewStatRoleScientists')}</span>`,
        `<span class="crew-stat-role crew-stat-role--pilot">${pilot} ${t('crewStatRolePilots')}</span>`,
      ].join(', ');
    } else {
      crewByJobEl.textContent = '';
    }
    crewByJobEl.style.display = showCrew ? 'block' : 'none';
  }
  const crewCompactEl = document.getElementById('stats-compact-crew');
  if (crewCompactEl) crewCompactEl.textContent = String(totalCrew);
  const lastCoinsForBump = getLastCoinsForBump();
  if (coinsCard && player.coins.value.gt(lastCoinsForBump)) {
    coinsCard.classList.add('stat-card--bump');
    setTimeout(() => coinsCard.classList.remove('stat-card--bump'), 400);
  }
  setLastCoinsForBump(player.coins.value);

  const productionCard = document.getElementById('production-stat-card');
  const productionLive = document.getElementById('production-live');
  if (productionCard) productionCard.classList.toggle('stat-card--live', effectiveRate.gt(0));
  if (productionLive) productionLive.textContent = effectiveRate.gt(0) ? '●' : '';
  const breakdownEl = document.getElementById('production-breakdown');
  if (breakdownEl) {
    const base = player.productionRate.value;
    const planetBonus = player.planets.length > 1 ? (player.planets.length - 1) * 5 : 0;
    const prestigeBonus = player.prestigeLevel > 0 ? player.prestigeLevel * 5 : 0;
    const minerBonus = 1 + player.crewByRole.miner * 0.02;
    const otherCrewBonus = 1 + (player.crewByRole.scientist + player.crewByRole.pilot) * 0.01;
    const veteranBonus = 1 + player.veteranCount * 0.005;
    const totalHousing = player.planets.reduce((s, p) => s + p.housingCount, 0);
    const maxCrew = getMaxAstronauts(player.planets.length, totalHousing);
    const morale =
      player.astronautCount + player.veteranCount === 0
        ? 1
        : player.astronautCount <= maxCrew
          ? 1.05
          : 0.95;
    const crewCombinedPct = (minerBonus * otherCrewBonus * veteranBonus * morale - 1) * 100;
    const parts: string[] = [];
    if (base.gt(0)) parts.push(`${t('breakdownBase')} ${formatNumber(base, settings.compactNumbers)}/s`);
    if (planetBonus > 0) parts.push(`+${planetBonus}% ${t('breakdownPlanets')}`);
    if (prestigeBonus > 0) parts.push(`+${prestigeBonus}% ${t('breakdownPrestige')}`);
    if (crewCombinedPct !== 0) parts.push(`${crewCombinedPct > 0 ? '+' : ''}${Math.round(crewCombinedPct)}% ${t('breakdownCrew')}`);
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
      const remaining = new Decimal(milestone.coinsNeeded).sub(session.player.coins.value);
      const remainingFormatted = remaining.lte(0) ? formatNumber(0, settings.compactNumbers) : formatNumber(remaining, settings.compactNumbers);
      const titleKey = ('progression' + milestone.block.id.charAt(0).toUpperCase() + milestone.block.id.slice(1) + 'Title') as StringKey;
      nextMilestoneEl.textContent = tParam('nextMilestoneFormat', { remaining: remainingFormatted, title: t(titleKey) });
      nextMilestoneEl.style.display = 'block';
    } else {
      nextMilestoneEl.textContent = '';
      nextMilestoneEl.style.display = 'none';
    }
  }

  const eventsUnlocked = getUnlockedBlocks(session).has('events');
  const activeEventInstances = getActiveEventInstances();
  const nextEventAt = getNextEventAt();
  const activeEl = document.getElementById('active-events');
  const nextEventRow = document.getElementById('next-event-row');
  const nextEventLabel = document.getElementById('next-event-label');
  const nextEventProgressWrap = document.getElementById('next-event-progress-wrap');
  const nextEventProgressBar = document.getElementById('next-event-progress-bar');
  if (!eventsUnlocked) {
    if (activeEl) activeEl.style.display = 'none';
    if (nextEventRow) nextEventRow.style.display = 'none';
    if (nextEventLabel) nextEventLabel.style.display = 'none';
    if (nextEventProgressWrap) nextEventProgressWrap.style.display = 'none';
  } else {
    const now = Date.now();
    const active = activeEventInstances.filter((a) => a.endsAt > now);
    if (nextEventRow) nextEventRow.style.display = active.length > 0 ? 'none' : 'flex';
    if (activeEl) {
      if (active.length === 0) {
        activeEl.innerHTML = '';
        activeEl.style.display = 'none';
      } else {
        activeEl.style.display = 'flex';
        activeEl.innerHTML = active
          .map((a) => {
            const name = getCatalogEventName(a.event.id);
            const secondsLeft = Math.ceil((a.endsAt - now) / 1000);
            const title = tParam('eventBadgeTitle', { name, mult: String(a.event.effect.multiplier) });
            const modifier = a.event.effect.multiplier >= 1 ? 'positive' : 'negative';
            return createEventBadgeHtml(name, secondsLeft, title, { modifier, mult: a.event.effect.multiplier });
          })
          .join('');
      }
    }
    if (nextEventProgressWrap && nextEventProgressBar && active.length === 0) {
      const progress = Math.max(0, Math.min(1, 1 - (nextEventAt - now) / EVENT_INTERVAL_MS));
      nextEventProgressWrap.style.display = 'block';
      nextEventProgressBar.style.width = `${progress * 100}%`;
      if (nextEventLabel) {
        nextEventLabel.style.display = 'block';
        nextEventLabel.setAttribute('aria-hidden', 'false');
      }
    } else {
      if (nextEventProgressWrap) nextEventProgressWrap.style.display = active.length > 0 ? 'none' : 'block';
      if (nextEventLabel) {
        nextEventLabel.style.display = active.length > 0 ? 'none' : 'block';
        nextEventLabel.setAttribute('aria-hidden', active.length > 0 ? 'true' : 'false');
      }
    }
  }
  const hintWrap = document.getElementById('events-hint-wrap');
  const hintTrigger = document.getElementById('events-hint-trigger');
  if (hintWrap) hintWrap.style.display = 'block';
  if (hintTrigger) {
    hintTrigger.setAttribute('title', t('eventsHintTitle'));
    hintTrigger.setAttribute('aria-label', t('eventsHintTitle'));
  }
  const hintModalBody = document.getElementById('events-hint-modal-body');
  if (hintModalBody) {
    const discovered = getDiscoveredEventIds();
    const explanation = `<p class="events-hint-what">${t('eventsHintWhat')}</p>`;
    const unlockLine = !eventsUnlocked ? `<p class="events-hint-unlock">${t('eventsHintUnlock')}</p>` : '';
    let listSection: string;
    if (discovered.length === 0) {
      listSection = `<p class="events-hint-heading">${t('eventsHintHeading')}</p><p class="events-hint-empty">${t('eventsHintEmpty')}</p>`;
    } else {
      const items = discovered
        .map((id) => {
          const ev = EVENT_CATALOG.find((e) => e.id === id);
          if (!ev) return '';
          const name = getCatalogEventName(ev.id);
          const mult = ev.effect.multiplier;
          const secs = ev.effect.durationMs / 1000;
          const modClass = mult >= 1 ? 'events-hint-item--positive' : 'events-hint-item--negative';
          return `<div class="events-hint-item ${modClass}"><span class="events-hint-item__name">${escapeHtml(name)}</span> <span class="events-hint-item__effect">×${mult}</span> <span class="events-hint-item__dur">${secs}s</span></div>`;
        })
        .filter(Boolean);
      listSection = `<p class="events-hint-heading">${t('eventsHintHeading')}</p><div class="events-hint-list">${items.join('')}</div>`;
    }
    hintModalBody.innerHTML = explanation + unlockLine + listSection;
  }
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
