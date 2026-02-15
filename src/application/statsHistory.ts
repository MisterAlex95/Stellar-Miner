import {
  STATS_HISTORY_INTERVAL_MS,
  STATS_HISTORY_MAX_POINTS,
  STATS_HISTORY_STORAGE_KEY,
  STATS_LONG_TERM_INTERVAL_MS,
  STATS_LONG_TERM_MAX_POINTS,
} from './catalogs.js';

export type HistoryPoint = { t: number; coins: number; production: number; totalCoinsEver: number };

export type ChartRange = 'recent' | 'longTerm';

let points: HistoryPoint[] = [];
let longTermPoints: HistoryPoint[] = [];
let lastRecordAt = 0;
let lastLongTermRecordAt = 0;

function migratePoint(p: { t: number; coins: number; production: number; totalCoinsEver?: number }): HistoryPoint {
  return {
    t: p.t,
    coins: p.coins,
    production: p.production,
    totalCoinsEver: p.totalCoinsEver ?? p.coins,
  };
}

function loadFromStorage(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(STATS_HISTORY_STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as
      | Array<{ t: number; coins: number; production: number; totalCoinsEver?: number }>
      | { recent?: HistoryPoint[]; longTerm?: HistoryPoint[] };
    if (Array.isArray(data) && data.length > 0) {
      points = data.map(migratePoint);
      if (points.length > STATS_HISTORY_MAX_POINTS) points = points.slice(-STATS_HISTORY_MAX_POINTS);
      const last = points[points.length - 1];
      if (last) lastRecordAt = last.t;
    } else if (data && typeof data === 'object' && !Array.isArray(data) && ('recent' in data || 'longTerm' in data)) {
      const obj = data as { recent?: HistoryPoint[]; longTerm?: HistoryPoint[] };
      if (Array.isArray(obj.recent) && obj.recent.length > 0) {
        points = obj.recent.map(migratePoint);
        if (points.length > STATS_HISTORY_MAX_POINTS) points = points.slice(-STATS_HISTORY_MAX_POINTS);
        const last = points[points.length - 1];
        if (last) lastRecordAt = last.t;
      }
      if (Array.isArray(obj.longTerm) && obj.longTerm.length > 0) {
        longTermPoints = obj.longTerm.map(migratePoint);
        if (longTermPoints.length > STATS_LONG_TERM_MAX_POINTS) {
          longTermPoints = longTermPoints.slice(-STATS_LONG_TERM_MAX_POINTS);
        }
        const last = longTermPoints[longTermPoints.length - 1];
        if (last) lastLongTermRecordAt = last.t;
      }
    }
  } catch {
    points = [];
    longTermPoints = [];
  }
}

function saveToStorage(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      STATS_HISTORY_STORAGE_KEY,
      JSON.stringify({ recent: points, longTerm: longTermPoints })
    );
  } catch {}
}

export function loadStatsHistory(): void {
  loadFromStorage();
}

export function getStatsHistory(range: ChartRange = 'recent'): HistoryPoint[] {
  return range === 'longTerm' ? longTermPoints : points;
}

export function recordStatsIfDue(now: number, coins: number, production: number, totalCoinsEver: number): void {
  const point: HistoryPoint = { t: now, coins, production, totalCoinsEver };
  let dirty = false;
  if (now - lastRecordAt >= STATS_HISTORY_INTERVAL_MS) {
    lastRecordAt = now;
    points.push(point);
    if (points.length > STATS_HISTORY_MAX_POINTS) points = points.slice(-STATS_HISTORY_MAX_POINTS);
    dirty = true;
  }
  if (now - lastLongTermRecordAt >= STATS_LONG_TERM_INTERVAL_MS) {
    lastLongTermRecordAt = now;
    longTermPoints.push(point);
    if (longTermPoints.length > STATS_LONG_TERM_MAX_POINTS) longTermPoints = longTermPoints.slice(-STATS_LONG_TERM_MAX_POINTS);
    dirty = true;
  }
  if (dirty) saveToStorage();
}

export function resetStatsHistory(): void {
  points = [];
  longTermPoints = [];
  lastRecordAt = 0;
  lastLongTermRecordAt = 0;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(STATS_HISTORY_STORAGE_KEY);
    } catch {}
  }
}
