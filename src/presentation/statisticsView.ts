import {
  getSession,
  getSettings,
  getGameStartTime,
  getNextEventAt,
  getActiveEventInstances,
  getEventMultiplier,
  getSessionClickCount,
  getSessionCoinsFromClicks,
} from '../application/gameState.js';
import { getTotalClicksEver, getUnlockedAchievements, ACHIEVEMENTS } from '../application/achievements.js';
import { getQuestStreak } from '../application/quests.js';
import { getAssignedAstronauts } from '../application/crewHelpers.js';
import { getPlayTimeStats, formatDuration } from '../application/playTimeStats.js';
import { getStatsHistory, type ChartRange } from '../application/statsHistory.js';
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
import { getResearchProductionMultiplier, getResearchProductionPercent, getResearchClickPercent, getEffectiveUsedSlots } from '../application/research.js';
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
const STAT_GROUP_UNLOCK: Record<string, BlockId> = {
  economy: 'upgrades',
  charts: 'quest',
  'production-breakdown': 'crew',
  progression: 'upgrades',
  activity: 'quest',
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
] as const;

function getStatEl(id: string): HTMLElement | null {
  return document.querySelector(`[data-stat-id="${id}"]`);
}

function setStat(id: string, value: string): void {
  const el = getStatEl(id);
  if (el) el.textContent = value;
}

let chartHoverState: { canvasId: string; index: number } | null = null;
let lastDrawnHover: { canvasId: string; index: number } | null = null;

function updateChartLegend(legendId: string, legendLabel: string, min: number, max: number, formatValue: (n: number) => string): void {
  const el = document.getElementById(legendId);
  if (!el) return;
  const minmaxEl = el.querySelector('.statistics-chart-legend-minmax');
  if (minmaxEl) minmaxEl.textContent = tParam('chartMinMax', { min: formatValue(min), max: formatValue(max) });
}

let lastHistoryLength = 0;
let chartRange: ChartRange = 'recent';

export function renderStatisticsSection(container: HTMLElement): void {
  lastHistoryLength = 0;
  chartHoverState = null;
  lastDrawnHover = null;
  const recentMin = Math.round((STATS_HISTORY_MAX_POINTS * STATS_HISTORY_INTERVAL_MS) / 60000);
  const longTermMin = Math.round((STATS_LONG_TERM_MAX_POINTS * STATS_LONG_TERM_INTERVAL_MS) / 60000);
  const longTermLabel = longTermMin >= 60 ? tParam('lastXHours', { n: longTermMin / 60 }) : tParam('lastXMin', { n: longTermMin });
  container.innerHTML = `
    <p class="statistics-intro">${t('statisticsIntro')}</p>
    <div class="statistics-grid">
      <section class="statistics-group statistics-charts" aria-labelledby="stat-charts" data-stat-group="charts">
        <h3 id="stat-charts" class="statistics-group-title">${t('chartsTitle')}</h3>
        <div class="statistics-chart-range" role="tablist" aria-label="Chart time range">
          <button type="button" class="statistics-range-btn statistics-range-btn--active" data-range="recent" role="tab" aria-selected="true">${tParam('lastXMin', { n: recentMin })}</button>
          <button type="button" class="statistics-range-btn" data-range="longTerm" role="tab" aria-selected="false">${longTermLabel}</button>
        </div>
        <div class="statistics-charts-row">
          <div class="statistics-chart-wrap">
            <div class="statistics-chart-label">${t('coinsOverTime')}</div>
            <canvas class="statistics-chart" id="chart-coins" width="260" height="120" role="img" aria-label="${t('chartAriaCoins')}"></canvas>
            <div class="statistics-chart-legend" id="chart-legend-coins">
              <span class="statistics-chart-legend-swatch statistics-chart-legend-swatch--coins"></span>
              <span class="statistics-chart-legend-label">${t('chartLegendCoins')}</span>
              <span class="statistics-chart-legend-minmax">${t('chartLegendMinMaxPlaceholder')}</span>
            </div>
          </div>
          <div class="statistics-chart-wrap">
            <div class="statistics-chart-label">${t('productionOverTime')}</div>
            <canvas class="statistics-chart" id="chart-production" width="260" height="120" role="img" aria-label="${t('chartAriaProduction')}"></canvas>
            <div class="statistics-chart-legend" id="chart-legend-production">
              <span class="statistics-chart-legend-swatch statistics-chart-legend-swatch--production"></span>
              <span class="statistics-chart-legend-label">${t('chartLegendProduction')}</span>
              <span class="statistics-chart-legend-minmax">${t('chartLegendMinMaxPlaceholder')}</span>
            </div>
          </div>
          <div class="statistics-chart-wrap">
            <div class="statistics-chart-label">${t('totalCoinsEverChart')}</div>
            <canvas class="statistics-chart" id="chart-total-ever" width="260" height="120" role="img" aria-label="${t('chartAriaTotalEver')}"></canvas>
            <div class="statistics-chart-legend" id="chart-legend-total-ever">
              <span class="statistics-chart-legend-swatch statistics-chart-legend-swatch--total-ever"></span>
              <span class="statistics-chart-legend-label">${t('chartLegendTotalEver')}</span>
              <span class="statistics-chart-legend-minmax">${t('chartLegendMinMaxPlaceholder')}</span>
            </div>
          </div>
        </div>
        <div id="chart-tooltip" class="statistics-chart-tooltip" aria-live="polite" aria-hidden="true"></div>
      </section>
      ${createStatisticsGroup(
        'stat-economy',
        t('economyTitle'),
        [
          createStatisticsCard(t('currentCoins'), 'coins'),
          createStatisticsCard(t('productionEffective'), 'production'),
          createStatisticsCard(t('totalCoinsEverLabel'), 'total-coins-ever'),
          createStatisticsCard(t('avgCoinsPerClick'), 'coins-per-click-avg'),
        ].join(''),
        'economy'
      )}
      ${createStatisticsGroup(
        'stat-production-breakdown',
        t('productionBreakdownTitle'),
        [
          createStatisticsCard(t('baseRate'), 'base-production'),
          createStatisticsCard(t('planetBonus'), 'planet-bonus'),
          createStatisticsCard(t('prestigeBonus'), 'prestige-bonus'),
          createStatisticsCard(t('crewBonus'), 'crew-bonus'),
          createStatisticsCard(t('eventMultiplier'), 'event-mult'),
          createStatisticsCard(t('researchBonus'), 'research-bonus'),
        ].join(''),
        'production-breakdown'
      )}
      ${createStatisticsGroup(
        'stat-progression',
        t('progressionTitle'),
        [
          createStatisticsCard(t('planetsCount'), 'planets-count'),
          createStatisticsCard(t('upgradesOwned'), 'upgrades-count'),
          createStatisticsCard(t('slotsUsedTotal'), 'slots-used'),
          createStatisticsCard(t('prestigeLevel'), 'prestige-level'),
          createStatisticsCard(t('crewFree'), 'crew-count'),
          createStatisticsCard(t('crewAssigned'), 'assigned-astronauts'),
        ].join(''),
        'progression'
      )}
      ${createStatisticsGroup(
        'stat-activity',
        t('activityTitle'),
        [
          createStatisticsCard(t('clicksLifetime'), 'clicks-lifetime'),
          createStatisticsCard(t('clicksSession'), 'clicks-session'),
          createStatisticsCard(t('coinsFromClicksSession'), 'coins-from-clicks-session'),
          createStatisticsCard(t('totalPlayTime'), 'play-time'),
          createStatisticsCard(t('sessionDuration'), 'session-duration'),
        ].join(''),
        'activity'
      )}
      ${createStatisticsGroup(
        'stat-quests-events',
        t('questsEventsTitle'),
        [
          createStatisticsCard(t('questStreak'), 'quest-streak'),
          createStatisticsCard(t('activeEvents'), 'active-events-count'),
          createStatisticsCard(t('nextEventIn'), 'next-event-in'),
        ].join(''),
        'quests-events'
      )}
      ${createStatisticsGroup(
        'stat-achievements',
        t('achievementsTitle'),
        createStatisticsCardWide({
          label: t('unlockedLabel'),
          statId1: 'achievements-unlocked',
          suffix: ' / ',
          statId2: 'achievements-total',
        }),
        'achievements'
      )}
    </div>
  `;
  bindChartRange(container);
  bindChartHover(container);
}

function bindChartRange(container: HTMLElement): void {
  const rangeWrap = container.querySelector('.statistics-chart-range');
  if (!rangeWrap) return;
  rangeWrap.querySelectorAll('.statistics-range-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const range = (btn as HTMLElement).getAttribute('data-range') as ChartRange | null;
      if (range !== 'recent' && range !== 'longTerm') return;
      chartRange = range;
      rangeWrap.querySelectorAll('.statistics-range-btn').forEach((b) => {
        const isActive = (b as HTMLElement).getAttribute('data-range') === range;
        b.classList.toggle('statistics-range-btn--active', isActive);
        b.setAttribute('aria-selected', String(isActive));
      });
      lastHistoryLength = -1;
    });
  });
}

function bindChartHover(container: HTMLElement): void {
  const coinsCanvas = container.querySelector('#chart-coins') as HTMLCanvasElement | null;
  const productionCanvas = container.querySelector('#chart-production') as HTMLCanvasElement | null;
  const tooltip = container.querySelector('#chart-tooltip') as HTMLElement | null;
  if (!tooltip) return;

  function showTooltip(text: string, clientX: number, clientY: number): void {
    tooltip!.textContent = text;
    tooltip!.setAttribute('aria-hidden', 'false');
    const offset = 12;
    tooltip!.style.left = `${clientX + offset}px`;
    tooltip!.style.top = `${clientY + offset}px`;
    tooltip!.classList.add('statistics-chart-tooltip--visible');
    const rect = tooltip!.getBoundingClientRect();
    let left = clientX + offset;
    let top = clientY + offset;
    if (left + rect.width > window.innerWidth) left = clientX - rect.width - offset;
    if (top + rect.height > window.innerHeight) top = clientY - rect.height - offset;
    if (top < 0) top = offset;
    if (left < 0) left = offset;
    tooltip!.style.left = `${left}px`;
    tooltip!.style.top = `${top}px`;
  }

  function hideTooltip(): void {
    tooltip!.classList.remove('statistics-chart-tooltip--visible');
    tooltip!.setAttribute('aria-hidden', 'true');
    chartHoverState = null;
  }

  type ValueType = 'coins' | 'production' | 'totalEver';
  function onChartMouseMove(e: MouseEvent, canvasId: string, valueType: ValueType): void {
    const canvas = e.currentTarget as HTMLCanvasElement;
    const history = getStatsHistory(chartRange);
    if (history.length < 2) return;
    const offsetX = e.offsetX;
    const index = getChartIndexAtOffsetX(canvas, history.length, offsetX);
    chartHoverState = { canvasId, index };
    const point = history[index];
    const compact = getSettings().compactNumbers;
    const text =
      valueType === 'coins'
        ? `${formatNumber(point.coins, compact)} ⬡`
        : valueType === 'production'
          ? `${formatNumber(point.production, compact)}/s`
          : `${formatNumber(point.totalCoinsEver, compact)} ⬡ total`;
    showTooltip(text, e.clientX, e.clientY);
  }

  const totalEverCanvas = container.querySelector('#chart-total-ever') as HTMLCanvasElement | null;
  if (coinsCanvas) {
    coinsCanvas.addEventListener('mousemove', (e: MouseEvent) => onChartMouseMove(e, 'chart-coins', 'coins'));
    coinsCanvas.addEventListener('mouseleave', hideTooltip);
  }
  if (productionCanvas) {
    productionCanvas.addEventListener('mousemove', (e: MouseEvent) => onChartMouseMove(e, 'chart-production', 'production'));
    productionCanvas.addEventListener('mouseleave', hideTooltip);
  }
  if (totalEverCanvas) {
    totalEverCanvas.addEventListener('mousemove', (e: MouseEvent) => onChartMouseMove(e, 'chart-total-ever', 'totalEver'));
    totalEverCanvas.addEventListener('mouseleave', hideTooltip);
  }
}

export function updateStatisticsSection(): void {
  const session = getSession();
  const settings = getSettings();
  const compact = settings.compactNumbers;

  if (!session) return;

  const unlocked = getUnlockedBlocks(session);
  const eventsUnlocked = unlocked.has('events');
  const container = document.getElementById('statistics-container');
  if (container) {
    container.querySelectorAll<HTMLElement>('.statistics-group[data-stat-group]').forEach((el) => {
      const group = el.getAttribute('data-stat-group');
      const block = group ? STAT_GROUP_UNLOCK[group] : undefined;
      const show = block ? unlocked.has(block) : true;
      el.style.display = show ? '' : 'none';
    });
    ['active-events-count', 'next-event-in', 'event-mult'].forEach((statId) => {
      const card = container.querySelector<HTMLElement>(`[data-stat-id="${statId}"]`)?.closest('.statistics-card') as HTMLElement | null;
      if (card) card.style.display = eventsUnlocked ? '' : 'none';
    });
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

  setStat('coins', formatNumber(player.coins.value, compact));
  setStat('production', formatNumber(effectiveRate, compact) + '/s');
  setStat('total-coins-ever', formatNumber(player.totalCoinsEver, compact));
  setStat('base-production', formatNumber(player.productionRate.value, compact) + '/s');
  setStat('planet-bonus', planetBonusPct > 0 ? `+${planetBonusPct.toFixed(0)}%` : '—');
  setStat('prestige-bonus', prestigeBonusPct > 0 ? `+${prestigeBonusPct.toFixed(0)}%` : '—');
  setStat('crew-bonus', crewBonusPct > 0 ? `+${crewBonusPct.toFixed(0)}%` : '—');
  if (eventsUnlocked) setStat('event-mult', eventMult > 1 ? `×${eventMult.toFixed(2)}` : '×1');
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
  setStat('research-bonus', researchBonusText);
  setStat('planets-count', String(player.planets.length));
  setStat('upgrades-count', String(player.upgrades.length));
  setStat('slots-used', `${usedSlots} / ${totalSlots}`);
  setStat('prestige-level', String(player.prestigeLevel));
  setStat('crew-count', String(player.astronautCount));
  setStat('assigned-astronauts', String(assignedAstronauts));
  setStat('clicks-lifetime', formatNumber(getTotalClicksEver(), compact));
  setStat('clicks-session', String(sessionClicks));
  setStat('coins-from-clicks-session', formatNumber(sessionCoinsFromClicks, compact));
  setStat('play-time', formatDuration(playTime.totalPlayTimeMs));
  setStat('session-duration', formatDuration(sessionDurationMs));
  setStat('quest-streak', String(getQuestStreak()));
  if (eventsUnlocked) {
    setStat('active-events-count', String(activeEvents.length));
    if (activeEvents.length > 0) {
      setStat('next-event-in', '—');
    } else {
      const secs = Math.max(0, Math.ceil((nextEventAt - now) / 1000));
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      setStat('next-event-in', m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${secs}s`);
    }
  }
  setStat('achievements-unlocked', String(getUnlockedAchievements().size));
  setStat('achievements-total', String(ACHIEVEMENTS.length));
  setStat('coins-per-click-avg', sessionClicks > 0 ? formatNumber(avgCoinsPerClick, compact) : '—');

  const history = getStatsHistory(chartRange);
  const hoverChanged =
    chartHoverState?.canvasId !== lastDrawnHover?.canvasId || chartHoverState?.index !== lastDrawnHover?.index;
  if (history.length >= 2 && (history.length !== lastHistoryLength || hoverChanged)) {
    lastHistoryLength = history.length;
    lastDrawnHover = chartHoverState;
    const coinsCanvas = document.getElementById('chart-coins') as HTMLCanvasElement | null;
    const productionCanvas = document.getElementById('chart-production') as HTMLCanvasElement | null;
    const totalEverCanvas = document.getElementById('chart-total-ever') as HTMLCanvasElement | null;
    const coinsHover = chartHoverState?.canvasId === 'chart-coins' ? chartHoverState.index : null;
    const productionHover = chartHoverState?.canvasId === 'chart-production' ? chartHoverState.index : null;
    const totalEverHover = chartHoverState?.canvasId === 'chart-total-ever' ? chartHoverState.index : null;
    const formatVal = (n: number) => formatNumber(n, compact);
    const coinsValues = history.map((p) => p.coins);
    const productionValues = history.map((p) => p.production);
    const totalEverValues = history.map((p) => p.totalCoinsEver);
    if (coinsCanvas) {
      drawLineChart(
        coinsCanvas,
        coinsValues,
        {
          colorStroke: CHART_COLORS.stroke,
          colorFill: CHART_COLORS.fill,
          legendLabel: t('chartLegendCoins'),
          formatValue: formatVal,
        },
        coinsHover
      );
      const minC = Math.min(...coinsValues);
      const maxC = Math.max(...coinsValues);
      updateChartLegend('chart-legend-coins', t('chartLegendCoins'), minC, maxC, formatVal);
    }
    if (productionCanvas) {
      drawLineChart(
        productionCanvas,
        productionValues,
        {
          colorStroke: CHART_COLORS.strokeProduction,
          colorFill: CHART_COLORS.fillProduction,
          legendLabel: t('chartLegendProduction'),
          formatValue: formatVal,
        },
        productionHover
      );
      const minP = Math.min(...productionValues);
      const maxP = Math.max(...productionValues);
      updateChartLegend('chart-legend-production', t('chartLegendProduction'), minP, maxP, formatVal);
    }
    if (totalEverCanvas) {
      drawLineChart(
        totalEverCanvas,
        totalEverValues,
        {
          colorStroke: CHART_COLORS.strokeTotalEver,
          colorFill: CHART_COLORS.fillTotalEver,
          legendLabel: t('chartLegendTotalEver'),
          formatValue: formatVal,
        },
        totalEverHover
      );
      const minT = Math.min(...totalEverValues);
      const maxT = Math.max(...totalEverValues);
      updateChartLegend('chart-legend-total-ever', t('chartLegendTotalEver'), minT, maxT, formatVal);
    }
  }
}
