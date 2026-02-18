/**
 * Shared line chart drawing for statistics. Used by StatisticsCharts.vue.
 */
import { tParam } from '../../../application/strings.js';

export function updateChartLegend(
  legendId: string,
  _legendLabel: string,
  min: number,
  max: number,
  formatValue: (n: number) => string
): void {
  const el = document.getElementById(legendId);
  if (!el) return;
  const minmaxEl = el.querySelector('.statistics-chart-legend-minmax');
  if (minmaxEl) minmaxEl.textContent = tParam('chartMinMax', { min: formatValue(min), max: formatValue(max) });
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export const CHART_PADDING = { top: 16, right: 14, bottom: 12, left: 14 };

const CHART_GRID_LINES = 4;
const CHART_Y_PADDING_RATIO = 0.05;
const HOVER_LINE_DASH = [3, 3];
const HOVER_DOT_RADIUS = 3.5;

export const CHART_COLORS = {
  stroke: '#f59e0b',
  fill: 'rgba(245, 158, 11, 0.2)',
  grid: 'rgba(43, 48, 59, 0.6)',
  strokeProduction: '#22c55e',
  fillProduction: 'rgba(34, 197, 94, 0.2)',
  strokeTotalEver: '#a78bfa',
  fillTotalEver: 'rgba(167, 139, 250, 0.2)',
  strokeCoinsGained: '#06b6d4',
  fillCoinsGained: 'rgba(6, 182, 212, 0.2)',
  strokeCoinsPerClick: '#f97316',
  fillCoinsPerClick: 'rgba(249, 115, 22, 0.2)',
  strokeClicks: '#e879f9',
  fillClicks: 'rgba(232, 121, 249, 0.2)',
  strokeCoinsFromClicks: '#eab308',
  fillCoinsFromClicks: 'rgba(234, 179, 8, 0.2)',
};

export function getChartIndexAtOffsetX(
  canvas: HTMLCanvasElement,
  valueCount: number,
  offsetX: number
): number {
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || valueCount < 2) return 0;
  const chartW = rect.width - CHART_PADDING.left - CHART_PADDING.right;
  const stepX = chartW / (valueCount - 1);
  const index = Math.round((offsetX - CHART_PADDING.left) / stepX);
  return clamp(index, 0, valueCount - 1);
}

export type ChartOptions = {
  colorStroke: string;
  colorFill: string;
  label?: string;
  legendLabel: string;
  formatValue?: (n: number) => string;
};

export function drawLineChart(
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
  const yMin = min - range * CHART_Y_PADDING_RATIO;
  const yMax = max + range * CHART_Y_PADDING_RATIO;
  const yRange = yMax - yMin;

  ctx.strokeStyle = 'rgba(42, 47, 61, 0.5)';
  ctx.lineWidth = 1;
  for (let g = 0; g <= CHART_GRID_LINES; g++) {
    const gy = chartTop + (chartH * g) / CHART_GRID_LINES;
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
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();

  if (hoveredIndex != null && hoveredIndex >= 0 && hoveredIndex < points.length) {
    const pt = points[hoveredIndex];
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.setLineDash(HOVER_LINE_DASH);
    ctx.beginPath();
    ctx.moveTo(pt.x, chartBottom);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = options.colorStroke;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, HOVER_DOT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}
