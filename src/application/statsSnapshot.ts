/**
 * Stats block snapshot for the game state bridge. Moved from presentation/statsView.
 */
import Decimal from 'break_infinity.js';
import {
  getSession,
  getSettings,
  getEventMultiplier,
  getLastCoinsForBump,
  getLastCoinsBumpAtMs,
  setLastCoinsForBump,
  setLastCoinsBumpAtMs,
  getNextEventAt,
  getActiveEventInstances,
  getClickTimestamps,
  getSessionClickCount,
  getSessionCoinsFromClicks,
  getDiscoveredEventIds,
} from './gameState.js';
import { formatNumber } from './format.js';
import { getAssignedAstronauts } from './crewHelpers.js';
import { getMaxAstronauts, CREW_ROLES, type CrewRole, type CrewJobRole } from '../domain/constants.js';
import { EVENT_INTERVAL_MS, EVENT_CATALOG } from './catalogs.js';
import { getNextMilestone, getUnlockedBlocks } from './progression.js';
import {
  getResearchProductionMultiplier,
  getResearchProductionPercent,
  getUnlockedCrewRoles,
  getResearchHousingCapacityBonus,
} from './research.js';
import { getEstimatedClickRate } from './productionHelpers.js';
import { getPrestigeProductionPercent } from './handlersPrestige.js';
import { t, tParam, type StringKey } from './strings.js';
import { getCatalogEventName } from './i18nCatalogs.js';
import { formatDuration } from './playTimeStats.js';

export type StatsSnapshot = {
  formattedCoins: string;
  formattedProduction: string;
  crewLine: string;
  crewDetail: string;
  crewByJob: { role: string; text: string }[];
  showCrew: boolean;
  crewCompact: string;
  crewUnlocked: boolean;
  productionBreakdown: string;
  productionBreakdownVisible: boolean;
  productionLive: boolean;
  nextMilestoneText: string;
  nextMilestoneVisible: boolean;
  /** 0–100 progress toward next progression milestone (coins / threshold). */
  nextMilestonePct: number;
  activeEventsHtml: string;
  activeEventsVisible: boolean;
  nextEventPct: number;
  nextEventRowVisible: boolean;
  nextEventLabelVisible: boolean;
  eventsUnlocked: boolean;
  coinsBump: boolean;
  eventsHintBodyHtml: string;
};

function escapeAmpLt(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}
function escapeAttr(s: string): string {
  return escapeAmpLt(s).replace(/"/g, '&quot;');
}
function escapeHtml(s: string): string {
  return escapeAmpLt(s).replace(/>/g, '&gt;');
}

function createEventBadgeHtml(
  eventName: string,
  secondsLeft: number,
  title: string,
  options: { modifier: 'positive' | 'negative'; mult: number }
): string {
  const { modifier, mult } = options;
  const multStr = mult >= 1 ? `×${mult}` : `×${mult}`;
  const cls = `event-badge event-badge--${modifier}`;
  return `<span class="${cls}" data-mult="${escapeAttr(String(mult))}" title="${escapeAttr(title)}"><span class="event-badge__name">${escapeAttr(eventName)}</span> <span class="event-badge__mult">${escapeAttr(multStr)}</span> <span class="event-badge__time">— ${secondsLeft}s</span></span>`;
}

/** Build stats block snapshot for Vue bridge (no DOM). Side effect: setLastCoinsForBump. */
export function getStatsSnapshot(): StatsSnapshot {
  const session = getSession();
  const settings = getSettings();
  const defaultSnapshot: StatsSnapshot = {
    formattedCoins: '0',
    formattedProduction: '0/s',
    crewLine: '',
    crewDetail: '',
    crewByJob: [],
    showCrew: false,
    crewCompact: '0',
    crewUnlocked: false,
    productionBreakdown: '',
    productionBreakdownVisible: false,
    productionLive: false,
    nextMilestoneText: '',
    nextMilestoneVisible: false,
    nextMilestonePct: 0,
    activeEventsHtml: '',
    activeEventsVisible: false,
    nextEventPct: 0,
    nextEventRowVisible: false,
    nextEventLabelVisible: false,
    eventsUnlocked: false,
    coinsBump: false,
    eventsHintBodyHtml: '',
  };
  if (!session) return defaultSnapshot;
  const player = session.player;
  const eventMult = getEventMultiplier();
  const researchMult = getResearchProductionMultiplier();
  const effectiveRate = player.effectiveProductionRate.mul(eventMult * researchMult);
  const assignedCrew = getAssignedAstronauts(session);
  const totalCrew = player.astronautCount;
  const freeCrew = totalCrew - assignedCrew;
  const crewUnlocked = getUnlockedBlocks(session).has('crew');
  const showCrew = crewUnlocked && totalCrew > 0;

  const crewStatRoleKeys: Record<CrewRole, StringKey> = {
    astronaut: 'crewStatRoleAstronauts',
    miner: 'crewStatRoleMiners',
    scientist: 'crewStatRoleScientists',
    pilot: 'crewStatRolePilots',
    medic: 'crewStatRoleMedics',
    engineer: 'crewStatRoleEngineers',
  };
  const crewByJob: { role: string; text: string }[] = [];
  if (showCrew) {
    const unlockedJobs = getUnlockedCrewRoles();
    for (const role of CREW_ROLES) {
      const isUnlocked = role === 'astronaut' || unlockedJobs.includes(role as CrewJobRole);
      if (!isUnlocked) continue;
      crewByJob.push({ role, text: `${player.crewByRole[role]} ${t(crewStatRoleKeys[role])}` });
    }
  }

  const lastCoinsForBump = getLastCoinsForBump();
  const nowMs = Date.now();
  const bumpThrottleMs = 1200;
  const coinsIncreased = player.coins.value.gt(lastCoinsForBump);
  const throttleOk = nowMs - getLastCoinsBumpAtMs() >= bumpThrottleMs;
  const coinsBump = coinsIncreased && throttleOk;
  if (coinsBump) setLastCoinsBumpAtMs(nowMs);
  setLastCoinsForBump(player.coins.value);

  let productionBreakdown = '';
  const base = player.productionRate.value;
  const planetBonus = player.planets.length > 1 ? (player.planets.length - 1) * 5 : 0;
  const prestigeBonus = getPrestigeProductionPercent(player);
  const minerBonus = 1 + player.crewByRole.miner * 0.018;
  const otherCrewBonus =
    1 +
    (player.crewByRole.scientist + player.crewByRole.pilot + player.crewByRole.medic) * 0.008 +
    player.crewByRole.engineer * 0.012;
  const veteranBonus = 1 + player.veteranCount * 0.005;
  const totalHousing = player.planets.reduce((s, p) => s + p.housingCount, 0);
  const maxCrew = getMaxAstronauts(player.planets.length, totalHousing, getResearchHousingCapacityBonus());
  const morale =
    player.astronautCount + player.veteranCount === 0
      ? 1
      : player.astronautCount <= maxCrew
        ? 1.05
        : 0.95;
  const crewCombinedPct = (minerBonus * otherCrewBonus * veteranBonus * morale - 1) * 100;
  const parts: string[] = [];
  if (base.gt(0)) parts.push(`${t('breakdownBase')} ${formatNumber(base, settings.compactNumbers)}/s`);
  if (planetBonus > 0) parts.push(`+${Math.round(planetBonus)}% ${t('breakdownPlanets')}`);
  if (prestigeBonus > 0) parts.push(`+${Math.round(prestigeBonus)}% ${t('breakdownPrestige')}`);
  if (crewCombinedPct !== 0) parts.push(`${crewCombinedPct > 0 ? '+' : ''}${Math.round(crewCombinedPct)}% ${t('breakdownCrew')}`);
  const researchPct = getResearchProductionPercent();
  if (researchPct > 0) parts.push(`+${researchPct}% ${t('breakdownResearch')}`);
  if (eventMult > 1) parts.push(`×${eventMult.toFixed(1)} ${t('breakdownEvent')}`);
  const nowForRate = Date.now();
  const { coinsPerSecondFromClicks } = getEstimatedClickRate({
    clickTimestamps: getClickTimestamps(),
    now: nowForRate,
    sessionClicks: getSessionClickCount(),
    sessionCoinsFromClicks: getSessionCoinsFromClicks(),
    prestigeLevel: player.prestigeLevel,
  });
  if (coinsPerSecondFromClicks > 0) {
    parts.push(tParam('productionClicksRateOnly', { rate: formatNumber(coinsPerSecondFromClicks, settings.compactNumbers) }));
  }
  productionBreakdown = parts.join(' · ');

  let nextMilestoneText = '';
  let nextMilestoneVisible = false;
  let nextMilestonePct = 0;
  const milestone = getNextMilestone(session);
  let coinsPerSecondFromClicksForMilestone = 0;
  if (milestone) {
    nextMilestoneVisible = true;
    const coins = session.player.coins.value;
    nextMilestonePct = Math.min(100, Math.max(0, coins.div(milestone.coinsNeeded).mul(100).toNumber()));
    const remaining = new Decimal(milestone.coinsNeeded).sub(coins);
    const remainingFormatted = remaining.lte(0) ? formatNumber(0, settings.compactNumbers) : formatNumber(remaining, settings.compactNumbers);
    const titleKey = ('progression' + milestone.block.id.charAt(0).toUpperCase() + milestone.block.id.slice(1) + 'Title') as StringKey;
    nextMilestoneText = tParam('nextMilestoneFormat', { remaining: remainingFormatted, title: t(titleKey) });
    if (remaining.gt(0)) {
      const totalRate = effectiveRate.add(coinsPerSecondFromClicks);
      if (totalRate.gt(0)) {
        const secs = remaining.div(totalRate).toNumber();
        const ms = Number.isFinite(secs) && secs >= 0 ? secs * 1000 : 0;
        nextMilestoneText += ' ' + tParam('nextMilestoneTime', { time: formatDuration(ms) });
      }
    }
  }

  const eventsUnlocked = getUnlockedBlocks(session).has('events');
  const activeEventInstances = getActiveEventInstances();
  const nextEventAt = getNextEventAt();
  const nowEvents = Date.now();
  const active = eventsUnlocked ? activeEventInstances.filter((a) => a.endsAt > nowEvents) : [];
  const activeEventsHtml =
    eventsUnlocked && active.length > 0
      ? active
          .map((a) => {
            const name = getCatalogEventName(a.event.id);
            const secondsLeft = Math.ceil((a.endsAt - nowEvents) / 1000);
            const title = tParam('eventBadgeTitle', { name, mult: String(a.event.effect.multiplier) });
            const modifier = a.event.effect.multiplier >= 1 ? 'positive' : 'negative';
            return createEventBadgeHtml(name, secondsLeft, title, { modifier, mult: a.event.effect.multiplier });
          })
          .join('')
      : '';
  const nextEventPct =
    eventsUnlocked && active.length === 0 ? Math.max(0, Math.min(1, 1 - (nextEventAt - nowEvents) / EVENT_INTERVAL_MS)) * 100 : 0;
  const nextEventRowVisible = eventsUnlocked;
  const nextEventLabelVisible = eventsUnlocked && active.length === 0;

  const formattedCoins = formatNumber(player.coins.value, settings.compactNumbers);
  const productionRateNum = effectiveRate.toNumber();
  const clickRate = getEstimatedClickRate({
    clickTimestamps: getClickTimestamps(),
    now: Date.now(),
    sessionClicks: getSessionClickCount(),
    sessionCoinsFromClicks: getSessionCoinsFromClicks(),
    prestigeLevel: player.prestigeLevel,
  }).coinsPerSecondFromClicks;
  const totalProduction = productionRateNum + clickRate;
  const formattedProduction = formatNumber(totalProduction, settings.compactNumbers) + '/s';

  const discovered = getDiscoveredEventIds();
  const explanation = `<p class="events-hint-what">${t('eventsHintWhat')}</p>`;
  const unlockLine = !eventsUnlocked ? `<p class="events-hint-unlock">${t('eventsHintUnlock')}</p>` : '';
  let eventsHintBodyHtml: string;
  if (discovered.length === 0) {
    eventsHintBodyHtml = explanation + unlockLine + `<p class="events-hint-heading">${t('eventsHintHeading')}</p><p class="events-hint-empty">${t('eventsHintEmpty')}</p>`;
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
    eventsHintBodyHtml = explanation + unlockLine + `<p class="events-hint-heading">${t('eventsHintHeading')}</p><div class="events-hint-list">${items.join('')}</div>`;
  }

  return {
    formattedCoins,
    formattedProduction,
    crewLine: showCrew ? tParam('crewStatFormat', { n: freeCrew }) : '',
    crewDetail: showCrew ? tParam('crewStatDetail', { assigned: String(assignedCrew), total: String(totalCrew) }) : '',
    crewByJob,
    showCrew,
    crewCompact: String(showCrew ? freeCrew : totalCrew),
    crewUnlocked,
    productionBreakdown,
    productionBreakdownVisible: parts.length > 0,
    productionLive: effectiveRate.gt(0),
    nextMilestoneText,
    nextMilestoneVisible,
    nextMilestonePct,
    activeEventsHtml,
    activeEventsVisible: active.length > 0,
    nextEventPct,
    nextEventRowVisible,
    nextEventLabelVisible,
    eventsUnlocked,
    coinsBump,
    eventsHintBodyHtml,
  };
}
