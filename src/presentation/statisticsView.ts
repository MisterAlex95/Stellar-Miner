import {
  getSession,
  getSettings,
  getGameStartTime,
  getNextEventAt,
  getActiveEventInstances,
  getEventMultiplier,
  getSessionClickCount,
  getSessionCoinsFromClicks,
  getRunStats,
  getPrestigesToday,
  getExpeditionEndsAt,
} from '../application/gameState.js';
import { getTotalClicksEver, getUnlockedAchievements, ACHIEVEMENTS } from '../application/achievements.js';
import { getQuestStreak } from '../application/quests.js';
import { getAssignedAstronauts } from '../application/crewHelpers.js';
import { getPlayTimeStats, formatDuration } from '../application/playTimeStats.js';
import { getStatsHistory, type ChartRange, type HistoryPoint } from '../application/statsHistory.js';
import { formatNumber } from '../application/format.js';
import { PLANET_PRODUCTION_BONUS, PRESTIGE_BONUS_PER_LEVEL, PRESTIGE_CLICK_BONUS_PERCENT_PER_LEVEL, ASTRONAUT_PRODUCTION_BONUS } from '../domain/constants.js';
import {
  STATS_HISTORY_INTERVAL_MS,
  STATS_HISTORY_MAX_POINTS,
  STATS_LONG_TERM_INTERVAL_MS,
  STATS_LONG_TERM_MAX_POINTS,
} from '../application/catalogs.js';
import { getUnlockedBlocks } from '../application/progression.js';
import type { BlockId } from '../application/progression.js';
import type { GameSession } from '../domain/aggregates/GameSession.js';
import {
  getResearchProductionMultiplier,
  getResearchProductionPercent,
  getResearchClickPercent,
  getEffectiveUsedSlots,
  getUnlockedResearch,
  getExpectedCoinsPerClick,
} from '../application/research.js';
import { RESEARCH_CATALOG } from '../application/research.js';
import { getComboName } from '../application/catalogs.js';
import { t, tParam } from '../application/strings.js';
import {
  createStatisticsCard,
  createStatisticsCardWide,
  createStatisticsGroup,
} from './components/statisticsCard.js';
import {
  CHART_PADDING,
  CHART_COLORS,
  getChartIndexAtOffsetX,
  drawLineChart,
  type ChartOptions,
} from './components/chartUtils.js';

/** Which block must be unlocked to show each statistics group. */
export const STAT_GROUP_UNLOCK: Record<string, BlockId> = {
  economy: 'upgrades',
  charts: 'quest',
  'production-breakdown': 'crew',
  progression: 'upgrades',
  activity: 'quest',
  'run-stats': 'quest',
  'quests-events': 'quest',
  achievements: 'upgrades',
};

const STAT_IDS = [
  'coins',
  'production',
  'total-coins-ever',
  'base-production',
  'planet-bonus',
  'prestige-bonus',
  'crew-bonus',
  'event-mult',
  'research-bonus',
  'planets-count',
  'upgrades-count',
  'slots-used',
  'prestige-level',
  'crew-count',
  'assigned-astronauts',
  'clicks-lifetime',
  'clicks-session',
  'coins-from-clicks-session',
  'play-time',
  'session-duration',
  'quest-streak',
  'active-events-count',
  'next-event-in',
  'achievements-unlocked',
  'achievements-total',
  'coins-per-click-avg',
  'run-duration',
  'run-coins-earned',
  'run-quests-claimed',
  'run-events-triggered',
  'run-max-combo',
  'run-avg-coins-per-sec',
  'prestiges-today',
  'research-nodes-unlocked',
  'expedition-status',
  'playing-since',
  'peak-production-chart',
] as const;

export function updateChartLegend(legendId: string, legendLabel: string, min: number, max: number, formatValue: (n: number) => string): void {
  const el = document.getElementById(legendId);
  if (!el) return;
  const minmaxEl = el.querySelector('.statistics-chart-legend-minmax');
  if (minmaxEl) minmaxEl.textContent = tParam('chartMinMax', { min: formatValue(min), max: formatValue(max) });
}

/** Coins gained per period: first point 0, then delta of totalCoinsEver. */
export function getCoinsGainedPerPeriod(history: HistoryPoint[]): number[] {
  if (history.length === 0) return [];
  const out: number[] = [0];
  for (let i = 1; i < history.length; i++) {
    out.push(Math.max(0, history[i].totalCoinsEver - history[i - 1].totalCoinsEver));
  }
  return out;
}

/** Average coins per click in each period (0 when no clicks). */
export function getCoinsPerClickPerPeriod(history: HistoryPoint[]): number[] {
  if (history.length === 0) return [];
  return history.map((p) => {
    const clicks = p.clicksInPeriod ?? 0;
    const fromClicks = p.coinsFromClicksInPeriod ?? 0;
    return clicks > 0 ? fromClicks / clicks : 0;
  });
}

/** @deprecated Stats panel is now Vue (StatisticsPanel.vue). Kept as no-op for any legacy callers. */
export function renderStatisticsSection(_container: HTMLElement): void {
  // No-op: stats UI is driven by Vue panel.
}


export type StatisticsData = {
  stats: Record<string, string>;
  groupVisible: Record<string, boolean>;
  eventsUnlocked: boolean;
};

/** Pure computation of all stat values and group visibility. Used by Vue stats panel. */
export function computeStatisticsData(
  session: GameSession,
  settings: { compactNumbers: boolean },
  chartRange: ChartRange
): StatisticsData {
  const compact = settings.compactNumbers;
  const unlocked = getUnlockedBlocks(session);
  const eventsUnlocked = unlocked.has('events');
  const groupVisible: Record<string, boolean> = {};
  for (const [group, block] of Object.entries(STAT_GROUP_UNLOCK)) {
    groupVisible[group] = unlocked.has(block);
  }

  const player = session.player;
  const now = Date.now();
  const eventMult = getEventMultiplier();
  const researchMult = getResearchProductionMultiplier();
  const effectiveRate = player.effectiveProductionRate.mul(eventMult * researchMult);
  const playTime = getPlayTimeStats();
  const sessionStart = getGameStartTime();
  const sessionDurationMs = now - sessionStart;
  const activeEvents = getActiveEventInstances().filter((a) => a.endsAt > now);
  const nextEventAt = getNextEventAt();
  const assignedAstronauts = getAssignedAstronauts(session);

  const planetBonusPct = player.planets.length > 1 ? (player.planets.length - 1) * PLANET_PRODUCTION_BONUS * 100 : 0;
  const prestigeBonusPct = player.prestigeLevel * PRESTIGE_BONUS_PER_LEVEL * 100;
  const crewBonusPct = (player.astronautCount + assignedAstronauts) * ASTRONAUT_PRODUCTION_BONUS * 100;

  const totalSlots = player.planets.reduce((s, p) => s + p.maxUpgrades, 0);
  const usedSlots = player.planets.reduce((s, p) => s + getEffectiveUsedSlots(p), 0);

  const sessionClicks = getSessionClickCount();
  const sessionCoinsFromClicks = getSessionCoinsFromClicks();
  const avgCoinsPerClick = sessionClicks > 0 ? sessionCoinsFromClicks / sessionClicks : 0;

  const run = getRunStats();
  const runDurationMs = now - run.runStartTime;
  const history = getStatsHistory(chartRange);

  const researchProdPct = getResearchProductionPercent();
  const prestigeLevel = player.prestigeLevel;
  const effectiveResearchClickPct = prestigeLevel >= 1 ? getResearchClickPercent() : 0;
  const prestigeClickPct = prestigeLevel >= 2 ? (prestigeLevel - 1) * PRESTIGE_CLICK_BONUS_PERCENT_PER_LEVEL : 0;
  const totalClickPct = effectiveResearchClickPct + prestigeClickPct;
  const researchBonusText =
    researchProdPct > 0 || totalClickPct > 0
      ? [researchProdPct > 0 ? `+${researchProdPct.toFixed(0)}% prod` : '', totalClickPct > 0 ? `+${totalClickPct.toFixed(0)}% click` : '']
          .filter(Boolean)
          .join(', ')
      : '—';

  const expeditionEndsAt = getExpeditionEndsAt();
  const coinsPerClickDisplay =
    sessionClicks > 0 ? avgCoinsPerClick : getExpectedCoinsPerClick(player.prestigeLevel);

  const stats: Record<string, string> = {
    coins: formatNumber(player.coins.value, compact),
    production: formatNumber(effectiveRate, compact) + '/s',
    'total-coins-ever': formatNumber(player.totalCoinsEver, compact),
    'base-production': formatNumber(player.productionRate.value, compact) + '/s',
    'planet-bonus': planetBonusPct > 0 ? `+${planetBonusPct.toFixed(0)}%` : '—',
    'prestige-bonus': prestigeBonusPct > 0 ? `+${prestigeBonusPct.toFixed(0)}%` : '—',
    'crew-bonus': crewBonusPct > 0 ? `+${crewBonusPct.toFixed(0)}%` : '—',
    'event-mult': eventsUnlocked && eventMult > 1 ? `×${eventMult.toFixed(2)}` : '×1',
    'research-bonus': researchBonusText,
    'planets-count': String(player.planets.length),
    'upgrades-count': String(player.upgrades.length),
    'slots-used': `${usedSlots} / ${totalSlots}`,
    'prestige-level': String(player.prestigeLevel),
    'crew-count': String(player.astronautCount),
    'assigned-astronauts': String(assignedAstronauts),
    'clicks-lifetime': formatNumber(getTotalClicksEver(), compact),
    'clicks-session': String(sessionClicks),
    'coins-from-clicks-session': formatNumber(sessionCoinsFromClicks, compact),
    'play-time': formatDuration(playTime.totalPlayTimeMs),
    'session-duration': formatDuration(sessionDurationMs),
    'run-duration': formatDuration(runDurationMs),
    'run-coins-earned': formatNumber(run.runCoinsEarned, compact),
    'run-quests-claimed': String(run.runQuestsClaimed),
    'run-events-triggered': String(run.runEventsTriggered),
    'run-max-combo':
      run.runMaxComboMult > 0 ? `${getComboName(run.runMaxComboMult)} ×${run.runMaxComboMult.toFixed(1)}` : '—',
    'run-avg-coins-per-sec':
      runDurationMs > 0
        ? formatNumber(run.runCoinsEarned / (runDurationMs / 1000), compact) + '/s'
        : '—',
    'prestiges-today': String(getPrestigesToday()),
    'research-nodes-unlocked': `${getUnlockedResearch().length} / ${RESEARCH_CATALOG.length}`,
    'expedition-status':
      expeditionEndsAt != null && expeditionEndsAt > now
        ? tParam('expeditionStatInProgress', { s: String(Math.ceil((expeditionEndsAt - now) / 1000)) })
        : t('expeditionStatNone'),
    'playing-since':
      playTime.firstPlayedAt > 0
        ? new Date(playTime.firstPlayedAt).toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : '—',
    'peak-production-chart':
      history.length >= 1 ? formatNumber(Math.max(...history.map((p) => p.production)), compact) + '/s' : '—',
    'quest-streak': String(getQuestStreak()),
    'active-events-count': String(activeEvents.length),
    'next-event-in':
      activeEvents.length > 0
        ? '—'
        : (() => {
            const secs = Math.max(0, Math.ceil((nextEventAt - now) / 1000));
            const m = Math.floor(secs / 60);
            const s = secs % 60;
            return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${secs}s`;
          })(),
    'achievements-unlocked': String(getUnlockedAchievements().size),
    'achievements-total': String(ACHIEVEMENTS.length),
    'coins-per-click-avg': formatNumber(coinsPerClickDisplay, compact),
  };
  return { stats, groupVisible, eventsUnlocked };
}

/** @deprecated Stats panel is now Vue (StatisticsPanel.vue). Kept as no-op for any legacy callers. */
export function updateStatisticsSection(): void {
  // No-op: stats UI is driven by Vue panel and bridge.
}
