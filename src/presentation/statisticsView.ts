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
import { PLANET_PRODUCTION_BONUS, PRESTIGE_BONUS_PER_LEVEL, ASTRONAUT_PRODUCTION_BONUS } from '../domain/constants.js';
import {
  STATS_HISTORY_INTERVAL_MS,
  STATS_HISTORY_MAX_POINTS,
  STATS_LONG_TERM_INTERVAL_MS,
  STATS_LONG_TERM_MAX_POINTS,
} from '../application/catalogs.js';
import { getUnlockedBlocks } from '../application/progression.js';
import type { BlockId } from '../application/progression.js';
import { getResearchProductionMultiplier, getResearchProductionPercent, getResearchClickPercent } from '../application/research.js';
import { t, tParam } from '../application/strings.js';

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

const CHART_PADDING = { top: 16, right: 14, bottom: 12, left: 14 };

const CHART_COLORS = {
  stroke: '#f59e0b',
  fill: 'rgba(245, 158, 11, 0.2)',
  grid: 'rgba(43, 48, 59, 0.6)',
  strokeProduction: '#22c55e',
  fillProduction: 'rgba(34, 197, 94, 0.2)',
  strokeTotalEver: '#a78bfa',
  fillTotalEver: 'rgba(167, 139, 250, 0.2)',
};

let chartHoverState: { canvasId: string; index: number } | null = null;
let lastDrawnHover: { canvasId: string; index: number } | null = null;

function getChartIndexAtOffsetX(canvas: HTMLCanvasElement, valueCount: number, offsetX: number): number {
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || valueCount < 2) return 0;
  const chartW = rect.width - CHART_PADDING.left - CHART_PADDING.right;
  const stepX = chartW / (valueCount - 1);
  let index = Math.round((offsetX - CHART_PADDING.left) / stepX);
  index = Math.max(0, Math.min(valueCount - 1, index));
  return index;
}

type ChartOptions = {
  colorStroke: string;
  colorFill: string;
  label?: string;
  legendLabel: string;
  formatValue?: (n: number) => string;
};

function drawLineChart(
  canvas: HTMLCanvasElement,
  values: number[],
  options: ChartOptions,
  hoveredIndex?: number | null
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx || values.length < 2) return;

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  const w = Math.round(rect.width * dpr);
  const h = Math.round(rect.height * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  const cw = rect.width;
  const ch = rect.height;
  const padding = CHART_PADDING;
  const chartW = cw - padding.left - padding.right;
  const chartH = ch - padding.top - padding.bottom;

  const chartTop = padding.top;
  const chartBottom = padding.top + chartH;
  ctx.clearRect(0, 0, cw, ch);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const yMin = min - range * 0.05;
  const yMax = max + range * 0.05;
  const yRange = yMax - yMin;

  const gridLines = 4;
  ctx.strokeStyle = 'rgba(42, 47, 61, 0.5)';
  ctx.lineWidth = 1;
  for (let g = 0; g <= gridLines; g++) {
    const gy = chartTop + (chartH * g) / gridLines;
    ctx.beginPath();
    ctx.moveTo(padding.left, gy);
    ctx.lineTo(padding.left + chartW, gy);
    ctx.stroke();
  }

  const stepX = chartW / (values.length - 1 || 1);
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < values.length; i++) {
    const x = padding.left + i * stepX;
    const y = chartTop + chartH - ((values[i] - yMin) / yRange) * chartH;
    points.push({ x, y });
  }

  const gradient = ctx.createLinearGradient(0, chartTop, 0, chartBottom);
  gradient.addColorStop(0, options.colorFill);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.strokeStyle = options.colorStroke;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.lineTo(points[points.length - 1].x, chartBottom);
  ctx.lineTo(points[0].x, chartBottom);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = options.colorStroke;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();

  if (hoveredIndex != null && hoveredIndex >= 0 && hoveredIndex < points.length) {
    const pt = points[hoveredIndex];
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(pt.x, chartBottom);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = options.colorStroke;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

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
    <h2>${t('statisticsTitle')}</h2>
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
              <span class="statistics-chart-legend-label">Coins ⬡</span>
              <span class="statistics-chart-legend-minmax">Min — · Max —</span>
            </div>
          </div>
          <div class="statistics-chart-wrap">
            <div class="statistics-chart-label">${t('productionOverTime')}</div>
            <canvas class="statistics-chart" id="chart-production" width="260" height="120" role="img" aria-label="${t('chartAriaProduction')}"></canvas>
            <div class="statistics-chart-legend" id="chart-legend-production">
              <span class="statistics-chart-legend-swatch statistics-chart-legend-swatch--production"></span>
              <span class="statistics-chart-legend-label">Production /s</span>
              <span class="statistics-chart-legend-minmax">Min — · Max —</span>
            </div>
          </div>
          <div class="statistics-chart-wrap">
            <div class="statistics-chart-label">${t('totalCoinsEverChart')}</div>
            <canvas class="statistics-chart" id="chart-total-ever" width="260" height="120" role="img" aria-label="${t('chartAriaTotalEver')}"></canvas>
            <div class="statistics-chart-legend" id="chart-legend-total-ever">
              <span class="statistics-chart-legend-swatch statistics-chart-legend-swatch--total-ever"></span>
              <span class="statistics-chart-legend-label">Total ever ⬡</span>
              <span class="statistics-chart-legend-minmax">Min — · Max —</span>
            </div>
          </div>
        </div>
        <div id="chart-tooltip" class="statistics-chart-tooltip" aria-live="polite" aria-hidden="true"></div>
      </section>
      <section class="statistics-group" aria-labelledby="stat-economy" data-stat-group="economy">
        <h3 id="stat-economy" class="statistics-group-title">${t('economyTitle')}</h3>
        <div class="statistics-cards">
          <div class="statistics-card">
            <span class="statistics-card-label">${t('currentCoins')}</span>
            <span class="statistics-card-value" data-stat-id="coins">—</span>
          </div>
          <div class="statistics-card">
            <span class="statistics-card-label">${t('productionEffective')}</span>
            <span class="statistics-card-value" data-stat-id="production">—</span>
          </div>
          <div class="statistics-card">
            <span class="statistics-card-label">${t('totalCoinsEverLabel')}</span>
            <span class="statistics-card-value" data-stat-id="total-coins-ever">—</span>
          </div>
          <div class="statistics-card">
            <span class="statistics-card-label">${t('avgCoinsPerClick')}</span>
            <span class="statistics-card-value" data-stat-id="coins-per-click-avg">—</span>
          </div>
        </div>
      </section>
      <section class="statistics-group" aria-labelledby="stat-production-breakdown" data-stat-group="production-breakdown">
        <h3 id="stat-production-breakdown" class="statistics-group-title">${t('productionBreakdownTitle')}</h3>
        <div class="statistics-cards">
          <div class="statistics-card">
            <span class="statistics-card-label">${t('baseRate')}</span>
            <span class="statistics-card-value" data-stat-id="base-production">—</span>
          </div>
          <div class="statistics-card">
            <span class="statistics-card-label">${t('planetBonus')}</span>
            <span class="statistics-card-value" data-stat-id="planet-bonus">—</span>
          </div>
          <div class="statistics-card">
            <span class="statistics-card-label">${t('prestigeBonus')}</span>
            <span class="statistics-card-value" data-stat-id="prestige-bonus">—</span>
          </div>
          <div class="statistics-card">
            <span class="statistics-card-label">${t('crewBonus')}</span>
            <span class="statistics-card-value" data-stat-id="crew-bonus">—</span>
          </div>
          <div class="statistics-card">
            <span class="statistics-card-label">${t('eventMultiplier')}</span>
            <span class="statistics-card-value" data-stat-id="event-mult">—</span>
          </div>
          <div class="statistics-card">
            <span class="statistics-card-label">${t('researchBonus')}</span>
            <span class="statistics-card-value" data-stat-id="research-bonus">—</span>
          </div>
        </div>
      </section>
      <section class="statistics-group" aria-labelledby="stat-progression" data-stat-group="progression">
        <h3 id="stat-progression" class="statistics-group-title">${t('progressionTitle')}</h3>
        <div class="statistics-cards">
          <div class="statistics-card">
            <span class="statistics-card-label">${t('planetsCount')}</span>
            <span class="statistics-card-value" data-stat-id="planets-count">—</span>
          </div>
          <div class="statistics-card">
            <span class="statistics-card-label">${t('upgradesOwned')}</span>
            <span class="statistics-card-value" data-stat-id="upgrades-count">—</span>
          </div>
          <div class="statistics-card">
            <span class="statistics-card-label">${t('slotsUsedTotal')}</span>
            <span class="statistics-card-value" data-stat-id="slots-used">—</span>
          </div>
          <div class="statistics-card">
            <span class="statistics-card-label">${t('prestigeLevel')}</span>
            <span class="statistics-card-value" data-stat-id="prestige-level">—</span>
          </div>
          <div class="statistics-card">
            <span class="statistics-card-label">${t('crewFree')}</span>
            <span class="statistics-card-value" data-stat-id="crew-count">—</span>
          </div>
          <div class="statistics-card">
            <span class="statistics-card-label">${t('crewAssigned')}</span>
            <span class="statistics-card-value" data-stat-id="assigned-astronauts">—</span>
          </div>
        </div>
      </section>
      <section class="statistics-group" aria-labelledby="stat-activity" data-stat-group="activity">
        <h3 id="stat-activity" class="statistics-group-title">${t('activityTitle')}</h3>
        <div class="statistics-cards">
          <div class="statistics-card">
            <span class="statistics-card-label">${t('clicksLifetime')}</span>
            <span class="statistics-card-value" data-stat-id="clicks-lifetime">—</span>
          </div>
          <div class="statistics-card">
            <span class="statistics-card-label">${t('clicksSession')}</span>
            <span class="statistics-card-value" data-stat-id="clicks-session">—</span>
          </div>
          <div class="statistics-card">
            <span class="statistics-card-label">${t('coinsFromClicksSession')}</span>
            <span class="statistics-card-value" data-stat-id="coins-from-clicks-session">—</span>
          </div>
          <div class="statistics-card">
            <span class="statistics-card-label">${t('totalPlayTime')}</span>
            <span class="statistics-card-value" data-stat-id="play-time">—</span>
          </div>
          <div class="statistics-card">
            <span class="statistics-card-label">${t('sessionDuration')}</span>
            <span class="statistics-card-value" data-stat-id="session-duration">—</span>
          </div>
        </div>
      </section>
      <section class="statistics-group" aria-labelledby="stat-quests-events" data-stat-group="quests-events">
        <h3 id="stat-quests-events" class="statistics-group-title">${t('questsEventsTitle')}</h3>
        <div class="statistics-cards">
          <div class="statistics-card">
            <span class="statistics-card-label">${t('questStreak')}</span>
            <span class="statistics-card-value" data-stat-id="quest-streak">—</span>
          </div>
          <div class="statistics-card">
            <span class="statistics-card-label">${t('activeEvents')}</span>
            <span class="statistics-card-value" data-stat-id="active-events-count">—</span>
          </div>
          <div class="statistics-card">
            <span class="statistics-card-label">${t('nextEventIn')}</span>
            <span class="statistics-card-value" data-stat-id="next-event-in">—</span>
          </div>
        </div>
      </section>
      <section class="statistics-group" aria-labelledby="stat-achievements" data-stat-group="achievements">
        <h3 id="stat-achievements" class="statistics-group-title">${t('achievementsTitle')}</h3>
        <div class="statistics-cards">
          <div class="statistics-card statistics-card--wide">
            <span class="statistics-card-label">${t('unlockedLabel')}</span>
            <span class="statistics-card-value" data-stat-id="achievements-unlocked">—</span>
            <span class="statistics-card-suffix"> / </span>
            <span class="statistics-card-value" data-stat-id="achievements-total">—</span>
          </div>
        </div>
      </section>
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
  const container = document.getElementById('statistics-container');
  if (container) {
    container.querySelectorAll<HTMLElement>('.statistics-group[data-stat-group]').forEach((el) => {
      const group = el.getAttribute('data-stat-group');
      const block = group ? STAT_GROUP_UNLOCK[group] : undefined;
      const show = block ? unlocked.has(block) : true;
      el.style.display = show ? '' : 'none';
    });
  }

  const player = session.player;
  const now = Date.now();
  const eventMult = getEventMultiplier();
  const researchMult = getResearchProductionMultiplier();
  const effectiveRate = player.effectiveProductionRate * eventMult * researchMult;
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
  const usedSlots = player.planets.reduce((s, p) => s + p.usedSlots, 0);

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
  setStat('event-mult', eventMult > 1 ? `×${eventMult.toFixed(2)}` : '×1');
  const researchProdPct = getResearchProductionPercent();
  const researchClickPct = getResearchClickPercent();
  const researchBonusText =
    researchProdPct > 0 || researchClickPct > 0
      ? [researchProdPct > 0 ? `+${researchProdPct.toFixed(0)}% prod` : '', researchClickPct > 0 ? `+${researchClickPct.toFixed(0)}% click` : '']
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
  setStat('active-events-count', String(activeEvents.length));
  if (activeEvents.length > 0) {
    setStat('next-event-in', '—');
  } else {
    const secs = Math.max(0, Math.ceil((nextEventAt - now) / 1000));
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    setStat('next-event-in', m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${secs}s`);
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
          legendLabel: 'Coins ⬡',
          formatValue: formatVal,
        },
        coinsHover
      );
      const minC = Math.min(...coinsValues);
      const maxC = Math.max(...coinsValues);
      updateChartLegend('chart-legend-coins', 'Coins ⬡', minC, maxC, formatVal);
    }
    if (productionCanvas) {
      drawLineChart(
        productionCanvas,
        productionValues,
        {
          colorStroke: CHART_COLORS.strokeProduction,
          colorFill: CHART_COLORS.fillProduction,
          legendLabel: 'Production /s',
          formatValue: formatVal,
        },
        productionHover
      );
      const minP = Math.min(...productionValues);
      const maxP = Math.max(...productionValues);
      updateChartLegend('chart-legend-production', 'Production /s', minP, maxP, formatVal);
    }
    if (totalEverCanvas) {
      drawLineChart(
        totalEverCanvas,
        totalEverValues,
        {
          colorStroke: CHART_COLORS.strokeTotalEver,
          colorFill: CHART_COLORS.fillTotalEver,
          legendLabel: 'Total ever ⬡',
          formatValue: formatVal,
        },
        totalEverHover
      );
      const minT = Math.min(...totalEverValues);
      const maxT = Math.max(...totalEverValues);
      updateChartLegend('chart-legend-total-ever', 'Total ever ⬡', minT, maxT, formatVal);
    }
  }
}
