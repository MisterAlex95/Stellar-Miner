<template>
  <section class="balance-charts-section">
    <div class="balance-charts-head">
      <h2 class="balance-charts-title">Curves</h2>
      <p class="balance-charts-desc">
        {{ charts.length > 0 ? 'Normalized 0–1 for comparison. Hover for values.' : 'Available for balance and modules.' }}
      </p>
    </div>
    <div class="balance-charts-body">
      <template v-if="charts.length > 0">
        <div class="balance-charts-canvas-wrap">
          <canvas
            ref="overlayCanvasRef"
            class="balance-chart-canvas"
            @mousemove="onOverlayMouseMove"
            @mouseleave="hoveredIndex = null"
          />
        </div>
        <div class="balance-charts-legend">
          <div
            v-for="(chart, idx) in charts"
            :key="idx"
            class="balance-charts-legend-item"
          >
            <span class="balance-charts-swatch" :style="{ background: chart.colorStroke }" />
            <span class="balance-charts-legend-label">{{ chart.title }}</span>
            <span class="balance-charts-legend-range">{{ formatChartValue(Math.min(...chart.values)) }} – {{ formatChartValue(Math.max(...chart.values)) }}</span>
          </div>
        </div>
        <div v-if="hoveredIndex != null" class="balance-charts-tooltip">
          <span class="balance-charts-tooltip-label">{{ tooltipLabel }}</span>
          <template v-for="(chart, idx) in charts" :key="idx">
            <span class="balance-charts-tooltip-value" :style="{ color: chart.colorStroke }">
              {{ chart.title }} {{ formatChartValue(chart.values[Math.min(hoveredIndex, chart.values.length - 1)] ?? 0) }}
            </span>
          </template>
        </div>
      </template>
      <div v-else class="balance-charts-empty">
        <span class="balance-charts-empty-icon" aria-hidden="true">📈</span>
        <p>No curves for <strong>{{ dataKey }}</strong>. Select <em>balance</em> or <em>modules</em> to see cost and production curves.</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { drawMultiLineChart, getChartIndexAtOffsetX, CHART_COLORS } from '../lib/chartUtils.js';

const props = withDefaults(
  defineProps<{
    dataKey: string;
    data: Record<string, unknown> | unknown[] | null;
    affinityData?: { planetTypes?: string[]; affinity?: Record<string, Record<string, number>> } | null;
  }>(),
  { affinityData: null }
);

const overlayCanvasRef = ref<HTMLCanvasElement | null>(null);
const hoveredIndex = ref<number | null>(null);

export type ChartSpec = { title: string; values: number[]; colorStroke: string; colorFill: string };

const charts = computed((): ChartSpec[] => {
  const key = props.dataKey;
  const d = props.data;
  if (!d || typeof d !== 'object') return [];

  if (key === 'balance' && d && !Array.isArray(d)) {
    const b = d as Record<string, unknown>;
    const get = (name: string, def: number) => (typeof b[name] === 'number' ? (b[name] as number) : def);
    const baseCost = get('newPlanetBaseCost', 120000);
    const costGrowth = get('newPlanetCostGrowth', 1.28);
    const prestigePerLevel = get('prestigeBonusPerLevel', 0.07);
    const housingBase = get('housingBaseCost', 12000);
    const housingGrowth = get('housingCostGrowth', 1.26);
    const astroBase = get('astronautBaseCost', 2500);
    const astroGrowth = get('astronautCostGrowth', 1.2);

    const planetCosts: number[] = [];
    for (let i = 0; i <= 14; i++) {
      planetCosts.push((baseCost * (i + 1)) * Math.pow(costGrowth, i));
    }
    const prestigeBonus: number[] = [];
    for (let lvl = 1; lvl <= 25; lvl++) {
      prestigeBonus.push(prestigePerLevel * lvl * 100);
    }
    const housingCosts: number[] = [];
    for (let i = 0; i <= 9; i++) {
      housingCosts.push(housingBase * Math.pow(housingGrowth, i));
    }
    const astroCosts: number[] = [];
    for (let i = 0; i <= 14; i++) {
      astroCosts.push(astroBase * Math.pow(astroGrowth, i));
    }

    return [
      { title: 'Planet cost', values: planetCosts, colorStroke: CHART_COLORS.stroke, colorFill: CHART_COLORS.fill },
      { title: 'Prestige %', values: prestigeBonus, colorStroke: CHART_COLORS.strokeProduction, colorFill: CHART_COLORS.fillProduction },
      { title: 'Housing cost', values: housingCosts, colorStroke: CHART_COLORS.strokeTotalEver, colorFill: CHART_COLORS.fillTotalEver },
      { title: 'Astronaut cost', values: astroCosts, colorStroke: CHART_COLORS.strokeCoinsGained, colorFill: CHART_COLORS.fillCoinsGained },
    ];
  }

  if (key === 'modules') {
    const modulesList = Array.isArray(d)
      ? d
      : (d && typeof d === 'object' && 'modules' in d && Array.isArray((d as { modules: unknown[] }).modules))
        ? (d as { modules: unknown[] }).modules
        : null;
    if (!modulesList?.length) return [];
    const costValues = modulesList.map((m: unknown) => (m && typeof m === 'object' && 'cost' in m && typeof (m as { cost: number }).cost === 'number') ? (m as { cost: number }).cost : 0);
    const prodValues = modulesList.map((m: unknown) => (m && typeof m === 'object' && 'coinsPerSecond' in m && typeof (m as { coinsPerSecond: number }).coinsPerSecond === 'number') ? (m as { coinsPerSecond: number }).coinsPerSecond : 0);
    const list: ChartSpec[] = [
      { title: 'Module cost', values: costValues, colorStroke: CHART_COLORS.stroke, colorFill: CHART_COLORS.fill },
      { title: 'Module prod', values: prodValues, colorStroke: CHART_COLORS.strokeProduction, colorFill: CHART_COLORS.fillProduction },
    ];
    const affinity = props.affinityData?.affinity;
    const planetTypes = props.affinityData?.planetTypes ?? ['rocky', 'desert', 'ice', 'volcanic', 'gas'];
    const planetStyles = [
      { stroke: CHART_COLORS.strokeTotalEver, fill: CHART_COLORS.fillTotalEver },
      { stroke: CHART_COLORS.strokeCoinsPerClick, fill: CHART_COLORS.fillCoinsPerClick },
      { stroke: CHART_COLORS.strokeCoinsGained, fill: CHART_COLORS.fillCoinsGained },
      { stroke: CHART_COLORS.strokeCoinsFromClicks, fill: CHART_COLORS.fillCoinsFromClicks },
      { stroke: CHART_COLORS.strokeClicks, fill: CHART_COLORS.fillClicks },
    ];
    if (affinity && Object.keys(affinity).length > 0) {
      for (let t = 0; t < planetTypes.length; t++) {
        const planetType = planetTypes[t];
        const { stroke, fill } = planetStyles[t % planetStyles.length];
        list.push({
          title: `${planetType.charAt(0).toUpperCase() + planetType.slice(1)} (affinity)`,
          values: modulesList.map((m: unknown) => {
            if (!m || typeof m !== 'object') return 1;
            const obj = m as { id?: string };
            const byUpgrade = obj.id ? affinity[obj.id] : undefined;
            return byUpgrade && typeof byUpgrade[planetType] === 'number' ? byUpgrade[planetType] : 1;
          }),
          colorStroke: stroke,
          colorFill: fill,
        });
      }
    }
    return list;
  }

  return [];
});

const multiSeries = computed(() =>
  charts.value.map((c) => ({ title: c.title, values: c.values, colorStroke: c.colorStroke }))
);

const maxLength = computed(() => Math.max(...charts.value.map((c) => c.values.length), 0));

const tooltipLabel = computed(() => {
  const i = hoveredIndex.value;
  if (i == null) return '';
  if (props.dataKey === 'modules') {
    const list = Array.isArray(props.data)
      ? props.data
      : (props.data && typeof props.data === 'object' && 'modules' in props.data)
        ? (props.data as { modules: unknown[] }).modules
        : null;
    if (list && list[i]) {
      const m = list[i] as { name?: string; id?: string };
      return m?.name ?? m?.id ?? `Module ${i}`;
    }
  }
  return `Index ${i}`;
});

function formatChartValue(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
  return String(Math.round(n));
}

function redraw(): void {
  nextTick(() => {
    const canvas = overlayCanvasRef.value;
    if (!canvas || multiSeries.value.length === 0 || maxLength.value < 2) return;
    drawMultiLineChart(canvas, multiSeries.value, hoveredIndex.value);
  });
}

function onOverlayMouseMove(e: MouseEvent): void {
  const canvas = overlayCanvasRef.value;
  if (!canvas || maxLength.value < 2) return;
  const index = getChartIndexAtOffsetX(canvas, maxLength.value, e.offsetX);
  hoveredIndex.value = index;
  redraw();
}

watch([() => props.data, () => props.dataKey], redraw, { deep: true });
onMounted(redraw);
watch(hoveredIndex, redraw);
</script>

<style scoped>
@reference "../../styles/index.css";

.balance-charts-section {
  border-radius: 0.75rem;
  border: 1px solid var(--border);
  background: var(--bg-panel);
  box-shadow: var(--shadow-panel);
  overflow: hidden;
}
.balance-charts-head {
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--border);
  background: var(--bg-card);
}
.balance-charts-title {
  font-family: var(--font-display);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--accent);
  margin: 0;
}
.balance-charts-desc {
  font-size: 0.75rem;
  color: var(--text-dim);
  margin: 0.25rem 0 0;
}
.balance-charts-body {
  padding: 1rem;
}
.balance-charts-canvas-wrap {
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  background: var(--bg-card);
  padding: 0.75rem;
  overflow: hidden;
}
.balance-chart-canvas {
  display: block;
  width: 100%;
  height: 280px;
  border-radius: 0.375rem;
}
.balance-charts-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  margin-top: 0.875rem;
}
.balance-charts-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: var(--text-dim);
}
.balance-charts-swatch {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  flex-shrink: 0;
}
.balance-charts-legend-label {
  font-weight: 500;
  color: var(--text);
}
.balance-charts-legend-range {
  font-size: 0.6875rem;
  color: var(--text-dim);
  margin-left: 0.125rem;
}
.balance-charts-tooltip {
  margin-top: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  font-size: 0.75rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  align-items: baseline;
}
.balance-charts-tooltip-label {
  font-weight: 600;
  color: var(--accent);
  margin-right: 0.25rem;
}
.balance-charts-tooltip {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
.balance-charts-tooltip-value {
  font-weight: 500;
}
.balance-charts-empty {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--text-dim);
  font-size: 0.875rem;
}
.balance-charts-empty-icon {
  display: block;
  font-size: 2rem;
  margin-bottom: 0.5rem;
  opacity: 0.5;
}
.balance-charts-empty p {
  margin: 0;
  max-width: 20rem;
  margin-left: auto;
  margin-right: auto;
}
.balance-charts-empty strong {
  color: var(--text);
}
.balance-charts-empty em {
  font-style: normal;
  color: var(--accent);
}
</style>
