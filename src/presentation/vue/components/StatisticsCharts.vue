<template>
  <section
    class="statistics-group statistics-charts"
    aria-labelledby="stat-charts"
    data-stat-group="charts"
    v-show="chartsVisible"
  >
    <h3 id="stat-charts" class="statistics-group-title">{{ t('chartsTitle') }}</h3>
    <div class="statistics-chart-range" role="tablist" aria-label="Chart time range">
      <button
        type="button"
        class="statistics-range-btn"
        :class="{ 'statistics-range-btn--active': chartRange === 'recent' }"
        data-range="recent"
        role="tab"
        :aria-selected="chartRange === 'recent'"
        @click="setChartRange('recent')"
      >
        {{ recentLabel }}
      </button>
      <button
        type="button"
        class="statistics-range-btn"
        :class="{ 'statistics-range-btn--active': chartRange === 'longTerm' }"
        data-range="longTerm"
        role="tab"
        :aria-selected="chartRange === 'longTerm'"
        @click="setChartRange('longTerm')"
      >
        {{ longTermLabel }}
      </button>
    </div>
    <div class="statistics-charts-row">
      <div class="statistics-chart-wrap">
        <div class="statistics-chart-label">{{ t('coinsOverTime') }} <span class="statistics-chart-help" :data-chart-title="t('coinsOverTime')" :data-chart-desc="t('chartDescCoins')" :aria-label="t('chartDescCoins')">?</span></div>
        <canvas ref="coinsCanvas" class="statistics-chart" id="chart-coins" width="260" height="120" role="img" :aria-label="t('chartAriaCoins')"></canvas>
        <div class="statistics-chart-legend" id="chart-legend-coins">
          <span class="statistics-chart-legend-swatch statistics-chart-legend-swatch--coins"></span>
          <span class="statistics-chart-legend-label">{{ t('chartLegendCoins') }}</span>
          <span class="statistics-chart-legend-minmax">{{ t('chartLegendMinMaxPlaceholder') }}</span>
        </div>
      </div>
      <div class="statistics-chart-wrap">
        <div class="statistics-chart-label">{{ t('productionOverTime') }} <span class="statistics-chart-help" :aria-label="t('chartDescProduction')">?</span></div>
        <canvas ref="productionCanvas" class="statistics-chart" id="chart-production" width="260" height="120" role="img" :aria-label="t('chartAriaProduction')"></canvas>
        <div class="statistics-chart-legend" id="chart-legend-production">
          <span class="statistics-chart-legend-swatch statistics-chart-legend-swatch--production"></span>
          <span class="statistics-chart-legend-label">{{ t('chartLegendProduction') }}</span>
          <span class="statistics-chart-legend-minmax">{{ t('chartLegendMinMaxPlaceholder') }}</span>
        </div>
      </div>
      <div class="statistics-chart-wrap">
        <div class="statistics-chart-label">{{ t('totalCoinsEverChart') }} <span class="statistics-chart-help" :aria-label="t('chartDescTotalEver')">?</span></div>
        <canvas ref="totalEverCanvas" class="statistics-chart" id="chart-total-ever" width="260" height="120" role="img" :aria-label="t('chartAriaTotalEver')"></canvas>
        <div class="statistics-chart-legend" id="chart-legend-total-ever">
          <span class="statistics-chart-legend-swatch statistics-chart-legend-swatch--total-ever"></span>
          <span class="statistics-chart-legend-label">{{ t('chartLegendTotalEver') }}</span>
          <span class="statistics-chart-legend-minmax">{{ t('chartLegendMinMaxPlaceholder') }}</span>
        </div>
      </div>
      <div class="statistics-chart-wrap">
        <div class="statistics-chart-label">{{ t('coinsGainedPerPeriod') }} <span class="statistics-chart-help" :aria-label="t('chartDescCoinsGained')">?</span></div>
        <canvas ref="coinsGainedCanvas" class="statistics-chart" id="chart-coins-gained" width="260" height="120" role="img" :aria-label="t('chartAriaCoinsGained')"></canvas>
        <div class="statistics-chart-legend" id="chart-legend-coins-gained">
          <span class="statistics-chart-legend-swatch statistics-chart-legend-swatch--coins-gained"></span>
          <span class="statistics-chart-legend-label">{{ t('chartLegendCoinsGained') }}</span>
          <span class="statistics-chart-legend-minmax">{{ t('chartLegendMinMaxPlaceholder') }}</span>
        </div>
      </div>
      <div class="statistics-chart-wrap">
        <div class="statistics-chart-label">{{ t('coinsPerClickPerPeriod') }} <span class="statistics-chart-help" :aria-label="t('chartDescCoinsPerClickPerPeriod')">?</span></div>
        <canvas ref="coinsPerClickCanvas" class="statistics-chart" id="chart-coins-per-click" width="260" height="120" role="img" :aria-label="t('chartAriaCoinsPerClickPerPeriod')"></canvas>
        <div class="statistics-chart-legend" id="chart-legend-coins-per-click">
          <span class="statistics-chart-legend-swatch statistics-chart-legend-swatch--coins-per-click"></span>
          <span class="statistics-chart-legend-label">{{ t('chartLegendCoinsPerClick') }}</span>
          <span class="statistics-chart-legend-minmax">{{ t('chartLegendMinMaxPlaceholder') }}</span>
        </div>
      </div>
      <div class="statistics-chart-wrap">
        <div class="statistics-chart-label">{{ t('clicksPerPeriod') }} <span class="statistics-chart-help" :aria-label="t('chartDescClicksPerPeriod')">?</span></div>
        <canvas ref="clicksCanvas" class="statistics-chart" id="chart-clicks" width="260" height="120" role="img" :aria-label="t('chartAriaClicks')"></canvas>
        <div class="statistics-chart-legend" id="chart-legend-clicks">
          <span class="statistics-chart-legend-swatch statistics-chart-legend-swatch--clicks"></span>
          <span class="statistics-chart-legend-label">{{ t('chartLegendClicks') }}</span>
          <span class="statistics-chart-legend-minmax">{{ t('chartLegendMinMaxPlaceholder') }}</span>
        </div>
      </div>
      <div class="statistics-chart-wrap">
        <div class="statistics-chart-label">{{ t('coinsFromClicksPerPeriod') }} <span class="statistics-chart-help" :aria-label="t('chartDescCoinsFromClicksPerPeriod')">?</span></div>
        <canvas ref="coinsFromClicksCanvas" class="statistics-chart" id="chart-coins-from-clicks" width="260" height="120" role="img" :aria-label="t('chartAriaCoinsFromClicks')"></canvas>
        <div class="statistics-chart-legend" id="chart-legend-coins-from-clicks">
          <span class="statistics-chart-legend-swatch statistics-chart-legend-swatch--coins-from-clicks"></span>
          <span class="statistics-chart-legend-label">{{ t('chartLegendCoinsFromClicks') }}</span>
          <span class="statistics-chart-legend-minmax">{{ t('chartLegendMinMaxPlaceholder') }}</span>
        </div>
      </div>
    </div>
    <div ref="tooltipEl" id="chart-tooltip" class="statistics-chart-tooltip" aria-live="polite" aria-hidden="true"></div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useGameStateStore } from '../stores/gameState.js';
import { getSettings } from '../../../application/gameState.js';
import { getStatsHistory } from '../../../application/statsHistory.js';
import { STATS_HISTORY_MAX_POINTS, STATS_HISTORY_INTERVAL_MS, STATS_LONG_TERM_MAX_POINTS, STATS_LONG_TERM_INTERVAL_MS } from '../../../application/catalogs.js';
import { t, tParam } from '../../../application/strings.js';
import { formatNumber } from '../../../application/format.js';
import {
  getCoinsGainedPerPeriod,
  getCoinsPerClickPerPeriod,
} from '../../../application/statisticsData.js';
import { CHART_COLORS, getChartIndexAtOffsetX, drawLineChart, updateChartLegend } from '../../components/chartUtils.js';
import type { ChartRange } from '../../../application/statsHistory.js';

const props = defineProps<{
  chartRange: ChartRange;
  setChartRange: (r: ChartRange) => void;
  chartsVisible: boolean;
}>();

const store = useGameStateStore();
const coinsCanvas = ref<HTMLCanvasElement | null>(null);
const productionCanvas = ref<HTMLCanvasElement | null>(null);
const totalEverCanvas = ref<HTMLCanvasElement | null>(null);
const coinsGainedCanvas = ref<HTMLCanvasElement | null>(null);
const coinsPerClickCanvas = ref<HTMLCanvasElement | null>(null);
const clicksCanvas = ref<HTMLCanvasElement | null>(null);
const coinsFromClicksCanvas = ref<HTMLCanvasElement | null>(null);
const tooltipEl = ref<HTMLElement | null>(null);

const hoverState = ref<{ canvasId: string; index: number } | null>(null);

const recentMin = Math.round((STATS_HISTORY_MAX_POINTS * STATS_HISTORY_INTERVAL_MS) / 60000);
const longTermMin = Math.round((STATS_LONG_TERM_MAX_POINTS * STATS_LONG_TERM_INTERVAL_MS) / 60000);
const recentLabel = computed(() => tParam('lastXMin', { n: recentMin }));
const longTermLabel = computed(() =>
  longTermMin >= 60 ? tParam('lastXHours', { n: longTermMin / 60 }) : tParam('lastXMin', { n: longTermMin })
);

function drawCharts(): void {
  const history = getStatsHistory(props.chartRange);
  if (history.length < 2) return;
  const compact = getSettings().compactNumbers;
  const formatVal = (n: number) => formatNumber(n, compact);
  const coinsValues = history.map((p) => p.coins);
  const productionValues = history.map((p) => p.production);
  const totalEverValues = history.map((p) => p.totalCoinsEver);
  const coinsGainedValues = getCoinsGainedPerPeriod(history);
  const coinsPerClickValues = getCoinsPerClickPerPeriod(history);
  const clicksValues = history.map((p) => p.clicksInPeriod ?? 0);
  const coinsFromClicksValues = history.map((p) => p.coinsFromClicksInPeriod ?? 0);

  const h = hoverState.value;
  const coinsHover = h?.canvasId === 'chart-coins' ? h.index : null;
  const productionHover = h?.canvasId === 'chart-production' ? h.index : null;
  const totalEverHover = h?.canvasId === 'chart-total-ever' ? h.index : null;
  const coinsGainedHover = h?.canvasId === 'chart-coins-gained' ? h.index : null;
  const coinsPerClickHover = h?.canvasId === 'chart-coins-per-click' ? h.index : null;
  const clicksHover = h?.canvasId === 'chart-clicks' ? h.index : null;
  const coinsFromClicksHover = h?.canvasId === 'chart-coins-from-clicks' ? h.index : null;

  if (coinsCanvas.value) {
    drawLineChart(coinsCanvas.value, coinsValues, { colorStroke: CHART_COLORS.stroke, colorFill: CHART_COLORS.fill, legendLabel: t('chartLegendCoins'), formatValue: formatVal }, coinsHover);
    updateChartLegend('chart-legend-coins', t('chartLegendCoins'), Math.min(...coinsValues), Math.max(...coinsValues), formatVal);
  }
  if (productionCanvas.value) {
    drawLineChart(productionCanvas.value, productionValues, { colorStroke: CHART_COLORS.strokeProduction, colorFill: CHART_COLORS.fillProduction, legendLabel: t('chartLegendProduction'), formatValue: formatVal }, productionHover);
    updateChartLegend('chart-legend-production', t('chartLegendProduction'), Math.min(...productionValues), Math.max(...productionValues), formatVal);
  }
  if (totalEverCanvas.value) {
    drawLineChart(totalEverCanvas.value, totalEverValues, { colorStroke: CHART_COLORS.strokeTotalEver, colorFill: CHART_COLORS.fillTotalEver, legendLabel: t('chartLegendTotalEver'), formatValue: formatVal }, totalEverHover);
    updateChartLegend('chart-legend-total-ever', t('chartLegendTotalEver'), Math.min(...totalEverValues), Math.max(...totalEverValues), formatVal);
  }
  if (coinsGainedCanvas.value && coinsGainedValues.length >= 2) {
    drawLineChart(coinsGainedCanvas.value, coinsGainedValues, { colorStroke: CHART_COLORS.strokeCoinsGained, colorFill: CHART_COLORS.fillCoinsGained, legendLabel: t('chartLegendCoinsGained'), formatValue: formatVal }, coinsGainedHover);
    updateChartLegend('chart-legend-coins-gained', t('chartLegendCoinsGained'), Math.min(...coinsGainedValues), Math.max(...coinsGainedValues), formatVal);
  }
  if (coinsPerClickCanvas.value && coinsPerClickValues.length >= 2) {
    drawLineChart(coinsPerClickCanvas.value, coinsPerClickValues, { colorStroke: CHART_COLORS.strokeCoinsPerClick, colorFill: CHART_COLORS.fillCoinsPerClick, legendLabel: t('chartLegendCoinsPerClick'), formatValue: formatVal }, coinsPerClickHover);
    updateChartLegend('chart-legend-coins-per-click', t('chartLegendCoinsPerClick'), Math.min(...coinsPerClickValues), Math.max(...coinsPerClickValues), formatVal);
  }
  if (clicksCanvas.value && clicksValues.length >= 2) {
    drawLineChart(clicksCanvas.value, clicksValues, { colorStroke: CHART_COLORS.strokeClicks, colorFill: CHART_COLORS.fillClicks, legendLabel: t('chartLegendClicks'), formatValue: formatVal }, clicksHover);
    updateChartLegend('chart-legend-clicks', t('chartLegendClicks'), Math.min(...clicksValues), Math.max(...clicksValues), formatVal);
  }
  if (coinsFromClicksCanvas.value && coinsFromClicksValues.length >= 2) {
    drawLineChart(coinsFromClicksCanvas.value, coinsFromClicksValues, { colorStroke: CHART_COLORS.strokeCoinsFromClicks, colorFill: CHART_COLORS.fillCoinsFromClicks, legendLabel: t('chartLegendCoinsFromClicks'), formatValue: formatVal }, coinsFromClicksHover);
    updateChartLegend('chart-legend-coins-from-clicks', t('chartLegendCoinsFromClicks'), Math.min(...coinsFromClicksValues), Math.max(...coinsFromClicksValues), formatVal);
  }
}

type ValueType = 'coins' | 'production' | 'totalEver' | 'coinsGained' | 'coinsPerClickPerPeriod' | 'clicksPerPeriod' | 'coinsFromClicksPerPeriod';

function onChartMouseMove(e: MouseEvent, canvasId: string, valueType: ValueType): void {
  const canvas = e.currentTarget as HTMLCanvasElement;
  const history = getStatsHistory(props.chartRange);
  if (history.length < 2) return;
  const index = getChartIndexAtOffsetX(canvas, history.length, e.offsetX);
  hoverState.value = { canvasId, index };
  const compact = getSettings().compactNumbers;
  let text: string;
  const p = history[index];
  if (valueType === 'coins') text = `${formatNumber(p.coins, compact)} ⬡`;
  else if (valueType === 'production') text = `${formatNumber(p.production, compact)}/s`;
  else if (valueType === 'totalEver') text = `${formatNumber(p.totalCoinsEver, compact)} ⬡ total`;
  else if (valueType === 'coinsGained') {
    const gained = getCoinsGainedPerPeriod(history);
    text = `${formatNumber(gained[index] ?? 0, compact)} ⬡`;
  } else if (valueType === 'coinsPerClickPerPeriod') {
    const avg = getCoinsPerClickPerPeriod(history);
    text = `${formatNumber(avg[index] ?? 0, compact)} ⬡/click`;
  } else if (valueType === 'clicksPerPeriod') {
    text = `${formatNumber(p.clicksInPeriod ?? 0, compact)} clicks`;
  } else {
    text = `${formatNumber(p.coinsFromClicksInPeriod ?? 0, compact)} ⬡`;
  }
  if (tooltipEl.value) {
    tooltipEl.value.textContent = text;
    tooltipEl.value.setAttribute('aria-hidden', 'false');
    const offset = 12;
    let left = e.clientX + offset;
    let top = e.clientY + offset;
    tooltipEl.value.style.left = `${left}px`;
    tooltipEl.value.style.top = `${top}px`;
    tooltipEl.value.classList.add('statistics-chart-tooltip--visible');
    const rect = tooltipEl.value.getBoundingClientRect();
    if (left + rect.width > window.innerWidth) left = e.clientX - rect.width - offset;
    if (top + rect.height > window.innerHeight) top = e.clientY - rect.height - offset;
    if (top < 0) top = offset;
    if (left < 0) left = offset;
    tooltipEl.value.style.left = `${left}px`;
    tooltipEl.value.style.top = `${top}px`;
  }
}

function hideTooltip(): void {
  hoverState.value = null;
  if (tooltipEl.value) {
    tooltipEl.value.classList.remove('statistics-chart-tooltip--visible');
    tooltipEl.value.setAttribute('aria-hidden', 'true');
  }
}

function bindCanvas(
  el: HTMLCanvasElement | null,
  canvasId: string,
  valueType: ValueType
): void {
  if (!el) return;
  el.addEventListener('mousemove', (e: MouseEvent) => onChartMouseMove(e, canvasId, valueType));
  el.addEventListener('mouseleave', hideTooltip);
}

onMounted(() => {
  nextTick(() => {
    bindCanvas(coinsCanvas.value, 'chart-coins', 'coins');
    bindCanvas(productionCanvas.value, 'chart-production', 'production');
    bindCanvas(totalEverCanvas.value, 'chart-total-ever', 'totalEver');
    bindCanvas(coinsGainedCanvas.value, 'chart-coins-gained', 'coinsGained');
    bindCanvas(coinsPerClickCanvas.value, 'chart-coins-per-click', 'coinsPerClickPerPeriod');
    bindCanvas(clicksCanvas.value, 'chart-clicks', 'clicksPerPeriod');
    bindCanvas(coinsFromClicksCanvas.value, 'chart-coins-from-clicks', 'coinsFromClicksPerPeriod');
    drawCharts();
  });
});

watch(
  () => [store.coins, store.production, props.chartRange, hoverState.value] as const,
  () => drawCharts(),
  { deep: true }
);
</script>
