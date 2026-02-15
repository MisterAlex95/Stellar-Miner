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
import { getResearchProductionMultiplier, getResearchProductionPercent, getResearchClickPercent, getEffectiveUsedSlots, getUnlockedResearch } from '../application/research.js';
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
const STAT_GROUP_UNLOCK: Record<string, BlockId> = {
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

const STATS_RANGE_STORAGE_KEY = 'stellar-miner-stats-range';

/** Coins gained per period: first point 0, then delta of totalCoinsEver. */
function getCoinsGainedPerPeriod(history: HistoryPoint[]): number[] {
  if (history.length === 0) return [];
  const out: number[] = [0];
  for (let i = 1; i < history.length; i++) {
    out.push(Math.max(0, history[i].totalCoinsEver - history[i - 1].totalCoinsEver));
  }
  return out;
}

/** Average coins per click in each period (0 when no clicks). */
function getCoinsPerClickPerPeriod(history: HistoryPoint[]): number[] {
  if (history.length === 0) return [];
  return history.map((p) => {
    const clicks = p.clicksInPeriod ?? 0;
    const fromClicks = p.coinsFromClicksInPeriod ?? 0;
    return clicks > 0 ? fromClicks / clicks : 0;
  });
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
            <div class="statistics-chart-label">${t('coinsOverTime')} <span class="statistics-chart-help" data-chart-title="coinsOverTime" data-chart-desc="chartDescCoins" title="${t('chartDescCoins').replace(/"/g, '&quot;')}" aria-label="${t('chartDescCoins').replace(/"/g, '&quot;')}">?</span></div>
            <canvas class="statistics-chart" id="chart-coins" width="260" height="120" role="img" aria-label="${t('chartAriaCoins')}"></canvas>
            <div class="statistics-chart-legend" id="chart-legend-coins">
              <span class="statistics-chart-legend-swatch statistics-chart-legend-swatch--coins"></span>
              <span class="statistics-chart-legend-label">${t('chartLegendCoins')}</span>
              <span class="statistics-chart-legend-minmax">${t('chartLegendMinMaxPlaceholder')}</span>
            </div>
          </div>
          <div class="statistics-chart-wrap">
            <div class="statistics-chart-label">${t('productionOverTime')} <span class="statistics-chart-help" data-chart-title="productionOverTime" data-chart-desc="chartDescProduction" title="${t('chartDescProduction').replace(/"/g, '&quot;')}" aria-label="${t('chartDescProduction').replace(/"/g, '&quot;')}">?</span></div>
            <canvas class="statistics-chart" id="chart-production" width="260" height="120" role="img" aria-label="${t('chartAriaProduction')}"></canvas>
            <div class="statistics-chart-legend" id="chart-legend-production">
              <span class="statistics-chart-legend-swatch statistics-chart-legend-swatch--production"></span>
              <span class="statistics-chart-legend-label">${t('chartLegendProduction')}</span>
              <span class="statistics-chart-legend-minmax">${t('chartLegendMinMaxPlaceholder')}</span>
            </div>
          </div>
          <div class="statistics-chart-wrap">
            <div class="statistics-chart-label">${t('totalCoinsEverChart')} <span class="statistics-chart-help" data-chart-title="totalCoinsEverChart" data-chart-desc="chartDescTotalEver" title="${t('chartDescTotalEver').replace(/"/g, '&quot;')}" aria-label="${t('chartDescTotalEver').replace(/"/g, '&quot;')}">?</span></div>
            <canvas class="statistics-chart" id="chart-total-ever" width="260" height="120" role="img" aria-label="${t('chartAriaTotalEver')}"></canvas>
            <div class="statistics-chart-legend" id="chart-legend-total-ever">
              <span class="statistics-chart-legend-swatch statistics-chart-legend-swatch--total-ever"></span>
              <span class="statistics-chart-legend-label">${t('chartLegendTotalEver')}</span>
              <span class="statistics-chart-legend-minmax">${t('chartLegendMinMaxPlaceholder')}</span>
            </div>
          </div>
          <div class="statistics-chart-wrap">
            <div class="statistics-chart-label">${t('coinsGainedPerPeriod')} <span class="statistics-chart-help" data-chart-title="coinsGainedPerPeriod" data-chart-desc="chartDescCoinsGained" title="${t('chartDescCoinsGained').replace(/"/g, '&quot;')}" aria-label="${t('chartDescCoinsGained').replace(/"/g, '&quot;')}">?</span></div>
            <canvas class="statistics-chart" id="chart-coins-gained" width="260" height="120" role="img" aria-label="${t('chartAriaCoinsGained')}"></canvas>
            <div class="statistics-chart-legend" id="chart-legend-coins-gained">
              <span class="statistics-chart-legend-swatch statistics-chart-legend-swatch--coins-gained"></span>
              <span class="statistics-chart-legend-label">${t('chartLegendCoinsGained')}</span>
              <span class="statistics-chart-legend-minmax">${t('chartLegendMinMaxPlaceholder')}</span>
            </div>
          </div>
          <div class="statistics-chart-wrap">
            <div class="statistics-chart-label">${t('coinsPerClickPerPeriod')} <span class="statistics-chart-help" data-chart-title="coinsPerClickPerPeriod" data-chart-desc="chartDescCoinsPerClickPerPeriod" title="${t('chartDescCoinsPerClickPerPeriod').replace(/"/g, '&quot;')}" aria-label="${t('chartDescCoinsPerClickPerPeriod').replace(/"/g, '&quot;')}">?</span></div>
            <canvas class="statistics-chart" id="chart-coins-per-click" width="260" height="120" role="img" aria-label="${t('chartAriaCoinsPerClickPerPeriod')}"></canvas>
            <div class="statistics-chart-legend" id="chart-legend-coins-per-click">
              <span class="statistics-chart-legend-swatch statistics-chart-legend-swatch--coins-per-click"></span>
              <span class="statistics-chart-legend-label">${t('chartLegendCoinsPerClick')}</span>
              <span class="statistics-chart-legend-minmax">${t('chartLegendMinMaxPlaceholder')}</span>
            </div>
          </div>
          <div class="statistics-chart-wrap">
            <div class="statistics-chart-label">${t('clicksPerPeriod')} <span class="statistics-chart-help" data-chart-title="clicksPerPeriod" data-chart-desc="chartDescClicksPerPeriod" title="${t('chartDescClicksPerPeriod').replace(/"/g, '&quot;')}" aria-label="${t('chartDescClicksPerPeriod').replace(/"/g, '&quot;')}">?</span></div>
            <canvas class="statistics-chart" id="chart-clicks" width="260" height="120" role="img" aria-label="${t('chartAriaClicks')}"></canvas>
            <div class="statistics-chart-legend" id="chart-legend-clicks">
              <span class="statistics-chart-legend-swatch statistics-chart-legend-swatch--clicks"></span>
              <span class="statistics-chart-legend-label">${t('chartLegendClicks')}</span>
              <span class="statistics-chart-legend-minmax">${t('chartLegendMinMaxPlaceholder')}</span>
            </div>
          </div>
          <div class="statistics-chart-wrap">
            <div class="statistics-chart-label">${t('coinsFromClicksPerPeriod')} <span class="statistics-chart-help" data-chart-title="coinsFromClicksPerPeriod" data-chart-desc="chartDescCoinsFromClicksPerPeriod" title="${t('chartDescCoinsFromClicksPerPeriod').replace(/"/g, '&quot;')}" aria-label="${t('chartDescCoinsFromClicksPerPeriod').replace(/"/g, '&quot;')}">?</span></div>
            <canvas class="statistics-chart" id="chart-coins-from-clicks" width="260" height="120" role="img" aria-label="${t('chartAriaCoinsFromClicks')}"></canvas>
            <div class="statistics-chart-legend" id="chart-legend-coins-from-clicks">
              <span class="statistics-chart-legend-swatch statistics-chart-legend-swatch--coins-from-clicks"></span>
              <span class="statistics-chart-legend-label">${t('chartLegendCoinsFromClicks')}</span>
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
          createStatisticsCard(t('prestigesToday'), 'prestiges-today'),
          createStatisticsCard(t('researchNodesUnlocked'), 'research-nodes-unlocked'),
          createStatisticsCard(t('expeditionStatus'), 'expedition-status'),
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
          createStatisticsCard(t('playingSince'), 'playing-since'),
          createStatisticsCard(t('peakProductionChart'), 'peak-production-chart'),
        ].join(''),
        'activity'
      )}
      ${createStatisticsGroup(
        'stat-run-stats',
        t('runStatsTitle'),
        [
          createStatisticsCard(t('runDuration'), 'run-duration'),
          createStatisticsCard(t('runCoinsEarned'), 'run-coins-earned'),
          createStatisticsCard(t('runQuestsClaimed'), 'run-quests-claimed'),
          createStatisticsCard(t('runEventsTriggered'), 'run-events-triggered'),
          createStatisticsCard(t('runMaxCombo'), 'run-max-combo'),
          createStatisticsCard(t('runAvgCoinsPerSec'), 'run-avg-coins-per-sec'),
        ].join(''),
        'run-stats'
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
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STATS_RANGE_STORAGE_KEY) : null;
  if (saved === 'recent' || saved === 'longTerm') {
    chartRange = saved;
    rangeWrap.querySelectorAll('.statistics-range-btn').forEach((b) => {
      const isActive = (b as HTMLElement).getAttribute('data-range') === saved;
      b.classList.toggle('statistics-range-btn--active', isActive);
      b.setAttribute('aria-selected', String(isActive));
    });
  }
  rangeWrap.querySelectorAll('.statistics-range-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const range = (btn as HTMLElement).getAttribute('data-range') as ChartRange | null;
      if (range !== 'recent' && range !== 'longTerm') return;
      chartRange = range;
      try {
        localStorage.setItem(STATS_RANGE_STORAGE_KEY, range);
      } catch {
        // ignore
      }
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

  type ValueType = 'coins' | 'production' | 'totalEver' | 'coinsGained' | 'coinsPerClickPerPeriod' | 'clicksPerPeriod' | 'coinsFromClicksPerPeriod';
  function onChartMouseMove(e: MouseEvent, canvasId: string, valueType: ValueType): void {
    const canvas = e.currentTarget as HTMLCanvasElement;
    const history = getStatsHistory(chartRange);
    if (history.length < 2) return;
    const offsetX = e.offsetX;
    const index = getChartIndexAtOffsetX(canvas, history.length, offsetX);
    chartHoverState = { canvasId, index };
    const compact = getSettings().compactNumbers;
    let text: string;
    if (valueType === 'coins') {
      text = `${formatNumber(history[index].coins, compact)} ⬡`;
    } else if (valueType === 'production') {
      text = `${formatNumber(history[index].production, compact)}/s`;
    } else if (valueType === 'totalEver') {
      text = `${formatNumber(history[index].totalCoinsEver, compact)} ⬡ total`;
    } else if (valueType === 'coinsGained') {
      const gained = getCoinsGainedPerPeriod(history);
      text = `${formatNumber(gained[index] ?? 0, compact)} ⬡`;
    } else if (valueType === 'coinsPerClickPerPeriod') {
      const avg = getCoinsPerClickPerPeriod(history);
      text = `${formatNumber(avg[index] ?? 0, compact)} ⬡/click`;
    } else if (valueType === 'clicksPerPeriod') {
      const n = history[index].clicksInPeriod ?? 0;
      text = `${formatNumber(n, compact)} clicks`;
    } else {
      const n = history[index].coinsFromClicksInPeriod ?? 0;
      text = `${formatNumber(n, compact)} ⬡`;
    }
    showTooltip(text, e.clientX, e.clientY);
  }

  const totalEverCanvas = container.querySelector('#chart-total-ever') as HTMLCanvasElement | null;
  const coinsGainedCanvas = container.querySelector('#chart-coins-gained') as HTMLCanvasElement | null;
  const coinsPerClickCanvas = container.querySelector('#chart-coins-per-click') as HTMLCanvasElement | null;
  const clicksCanvas = container.querySelector('#chart-clicks') as HTMLCanvasElement | null;
  const coinsFromClicksCanvas = container.querySelector('#chart-coins-from-clicks') as HTMLCanvasElement | null;
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
  if (coinsGainedCanvas) {
    coinsGainedCanvas.addEventListener('mousemove', (e: MouseEvent) => onChartMouseMove(e, 'chart-coins-gained', 'coinsGained'));
    coinsGainedCanvas.addEventListener('mouseleave', hideTooltip);
  }
  if (coinsPerClickCanvas) {
    coinsPerClickCanvas.addEventListener('mousemove', (e: MouseEvent) => onChartMouseMove(e, 'chart-coins-per-click', 'coinsPerClickPerPeriod'));
    coinsPerClickCanvas.addEventListener('mouseleave', hideTooltip);
  }
  if (clicksCanvas) {
    clicksCanvas.addEventListener('mousemove', (e: MouseEvent) => onChartMouseMove(e, 'chart-clicks', 'clicksPerPeriod'));
    clicksCanvas.addEventListener('mouseleave', hideTooltip);
  }
  if (coinsFromClicksCanvas) {
    coinsFromClicksCanvas.addEventListener('mousemove', (e: MouseEvent) => onChartMouseMove(e, 'chart-coins-from-clicks', 'coinsFromClicksPerPeriod'));
    coinsFromClicksCanvas.addEventListener('mouseleave', hideTooltip);
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
  const run = getRunStats();
  const runDurationMs = now - run.runStartTime;
  setStat('run-duration', formatDuration(runDurationMs));
  setStat('run-coins-earned', formatNumber(run.runCoinsEarned, compact));
  setStat('run-quests-claimed', String(run.runQuestsClaimed));
  setStat('run-events-triggered', String(run.runEventsTriggered));
  setStat(
    'run-max-combo',
    run.runMaxComboMult > 0 ? `${getComboName(run.runMaxComboMult)} ×${run.runMaxComboMult.toFixed(1)}` : '—'
  );
  setStat(
    'run-avg-coins-per-sec',
    runDurationMs > 0
      ? formatNumber(run.runCoinsEarned / (runDurationMs / 1000), compact) + '/s'
      : '—'
  );
  setStat('prestiges-today', String(getPrestigesToday()));
  setStat('research-nodes-unlocked', `${getUnlockedResearch().length} / ${RESEARCH_CATALOG.length}`);
  const expeditionEndsAt = getExpeditionEndsAt();
  setStat(
    'expedition-status',
    expeditionEndsAt != null && expeditionEndsAt > now
      ? tParam('expeditionStatInProgress', { s: String(Math.ceil((expeditionEndsAt - now) / 1000)) })
      : t('expeditionStatNone')
  );
  setStat(
    'playing-since',
    playTime.firstPlayedAt > 0
      ? new Date(playTime.firstPlayedAt).toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '—'
  );
  const history = getStatsHistory(chartRange);
  setStat(
    'peak-production-chart',
    history.length >= 1 ? formatNumber(Math.max(...history.map((p) => p.production)), compact) + '/s' : '—'
  );
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

  const hoverChanged =
    chartHoverState?.canvasId !== lastDrawnHover?.canvasId || chartHoverState?.index !== lastDrawnHover?.index;
  if (history.length >= 2 && (history.length !== lastHistoryLength || hoverChanged)) {
    lastHistoryLength = history.length;
    lastDrawnHover = chartHoverState;
    const coinsCanvas = document.getElementById('chart-coins') as HTMLCanvasElement | null;
    const productionCanvas = document.getElementById('chart-production') as HTMLCanvasElement | null;
    const totalEverCanvas = document.getElementById('chart-total-ever') as HTMLCanvasElement | null;
    const coinsGainedCanvas = document.getElementById('chart-coins-gained') as HTMLCanvasElement | null;
    const coinsPerClickCanvas = document.getElementById('chart-coins-per-click') as HTMLCanvasElement | null;
    const clicksCanvas = document.getElementById('chart-clicks') as HTMLCanvasElement | null;
    const coinsFromClicksCanvas = document.getElementById('chart-coins-from-clicks') as HTMLCanvasElement | null;
    const coinsHover = chartHoverState?.canvasId === 'chart-coins' ? chartHoverState.index : null;
    const productionHover = chartHoverState?.canvasId === 'chart-production' ? chartHoverState.index : null;
    const totalEverHover = chartHoverState?.canvasId === 'chart-total-ever' ? chartHoverState.index : null;
    const coinsGainedHover = chartHoverState?.canvasId === 'chart-coins-gained' ? chartHoverState.index : null;
    const coinsPerClickHover = chartHoverState?.canvasId === 'chart-coins-per-click' ? chartHoverState.index : null;
    const clicksHover = chartHoverState?.canvasId === 'chart-clicks' ? chartHoverState.index : null;
    const coinsFromClicksHover = chartHoverState?.canvasId === 'chart-coins-from-clicks' ? chartHoverState.index : null;
    const formatVal = (n: number) => formatNumber(n, compact);
    const coinsValues = history.map((p) => p.coins);
    const productionValues = history.map((p) => p.production);
    const totalEverValues = history.map((p) => p.totalCoinsEver);
    const coinsGainedValues = getCoinsGainedPerPeriod(history);
    const coinsPerClickValues = getCoinsPerClickPerPeriod(history);
    const clicksValues = history.map((p) => p.clicksInPeriod ?? 0);
    const coinsFromClicksValues = history.map((p) => p.coinsFromClicksInPeriod ?? 0);
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
    if (coinsGainedCanvas && coinsGainedValues.length >= 2) {
      drawLineChart(
        coinsGainedCanvas,
        coinsGainedValues,
        {
          colorStroke: CHART_COLORS.strokeCoinsGained,
          colorFill: CHART_COLORS.fillCoinsGained,
          legendLabel: t('chartLegendCoinsGained'),
          formatValue: formatVal,
        },
        coinsGainedHover
      );
      const minG = Math.min(...coinsGainedValues);
      const maxG = Math.max(...coinsGainedValues);
      updateChartLegend('chart-legend-coins-gained', t('chartLegendCoinsGained'), minG, maxG, formatVal);
    }
    if (coinsPerClickCanvas && coinsPerClickValues.length >= 2) {
      drawLineChart(
        coinsPerClickCanvas,
        coinsPerClickValues,
        {
          colorStroke: CHART_COLORS.strokeCoinsPerClick,
          colorFill: CHART_COLORS.fillCoinsPerClick,
          legendLabel: t('chartLegendCoinsPerClick'),
          formatValue: formatVal,
        },
        coinsPerClickHover
      );
      const minCp = Math.min(...coinsPerClickValues);
      const maxCp = Math.max(...coinsPerClickValues);
      updateChartLegend('chart-legend-coins-per-click', t('chartLegendCoinsPerClick'), minCp, maxCp, formatVal);
    }
    if (clicksCanvas && clicksValues.length >= 2) {
      drawLineChart(
        clicksCanvas,
        clicksValues,
        {
          colorStroke: CHART_COLORS.strokeClicks,
          colorFill: CHART_COLORS.fillClicks,
          legendLabel: t('chartLegendClicks'),
          formatValue: formatVal,
        },
        clicksHover
      );
      const minCl = Math.min(...clicksValues);
      const maxCl = Math.max(...clicksValues);
      updateChartLegend('chart-legend-clicks', t('chartLegendClicks'), minCl, maxCl, formatVal);
    }
    if (coinsFromClicksCanvas && coinsFromClicksValues.length >= 2) {
      drawLineChart(
        coinsFromClicksCanvas,
        coinsFromClicksValues,
        {
          colorStroke: CHART_COLORS.strokeCoinsFromClicks,
          colorFill: CHART_COLORS.fillCoinsFromClicks,
          legendLabel: t('chartLegendCoinsFromClicks'),
          formatValue: formatVal,
        },
        coinsFromClicksHover
      );
      const minCf = Math.min(...coinsFromClicksValues);
      const maxCf = Math.max(...coinsFromClicksValues);
      updateChartLegend('chart-legend-coins-from-clicks', t('chartLegendCoinsFromClicks'), minCf, maxCf, formatVal);
    }
  }
}
