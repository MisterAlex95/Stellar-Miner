import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadStatsHistory,
  getStatsHistory,
  recordStatsIfDue,
  resetStatsHistory,
  type HistoryPoint,
} from './statsHistory.js';
import { STATS_HISTORY_STORAGE_KEY, STATS_LONG_TERM_MAX_POINTS } from './catalogs.js';

describe('statsHistory', () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
    });
    resetStatsHistory();
  });

  it('loadStatsHistory loads from storage', () => {
    const points: HistoryPoint[] = [{ t: 1000, coins: 50, production: 10, totalCoinsEver: 50 }];
    storage[STATS_HISTORY_STORAGE_KEY] = JSON.stringify({ recent: points, longTerm: [] });
    loadStatsHistory();
    expect(getStatsHistory('recent')).toHaveLength(1);
    expect(getStatsHistory('recent')[0].coins).toBe(50);
  });

  it('loadStatsHistory migrates legacy array format', () => {
    storage[STATS_HISTORY_STORAGE_KEY] = JSON.stringify([
      { t: 1000, coins: 50, production: 10 },
    ]);
    loadStatsHistory();
    const recent = getStatsHistory('recent');
    expect(recent).toHaveLength(1);
    expect(recent[0].totalCoinsEver).toBe(50);
  });

  it('loadStatsHistory loads object format with recent and longTerm', () => {
    storage[STATS_HISTORY_STORAGE_KEY] = JSON.stringify({
      recent: [{ t: 1000, coins: 50, production: 10, totalCoinsEver: 50 }],
      longTerm: [{ t: 0, coins: 0, production: 0, totalCoinsEver: 0 }],
    });
    loadStatsHistory();
    expect(getStatsHistory('recent')).toHaveLength(1);
    expect(getStatsHistory('longTerm')).toHaveLength(1);
  });

  it('loadStatsHistory trims longTerm to STATS_LONG_TERM_MAX_POINTS', () => {
    const longTerm = Array.from({ length: STATS_LONG_TERM_MAX_POINTS + 5 }, (_, i) => ({
      t: i,
      coins: i,
      production: 0,
      totalCoinsEver: i,
    }));
    storage[STATS_HISTORY_STORAGE_KEY] = JSON.stringify({ recent: [], longTerm });
    loadStatsHistory();
    expect(getStatsHistory('longTerm')).toHaveLength(STATS_LONG_TERM_MAX_POINTS);
  });

  it('loadStatsHistory handles parse error', () => {
    storage[STATS_HISTORY_STORAGE_KEY] = 'invalid';
    loadStatsHistory();
    expect(getStatsHistory('recent')).toHaveLength(0);
  });

  it('getStatsHistory returns recent by default', () => {
    expect(getStatsHistory()).toEqual(getStatsHistory('recent'));
  });

  it('recordStatsIfDue adds point when interval elapsed', () => {
    recordStatsIfDue(1000, 100, 5, 100);
    recordStatsIfDue(1000 + 6000, 200, 10, 200);
    expect(getStatsHistory('recent').length).toBeGreaterThanOrEqual(1);
  });

  it('recordStatsIfDue adds longTerm point when long-term interval elapsed', () => {
    resetStatsHistory();
    recordStatsIfDue(0, 0, 0, 0);
    recordStatsIfDue(65_000, 100, 5, 100);
    expect(getStatsHistory('longTerm').length).toBeGreaterThanOrEqual(1);
  });

  it('resetStatsHistory clears in-memory and storage', () => {
    recordStatsIfDue(1000, 100, 5, 100);
    resetStatsHistory();
    expect(getStatsHistory('recent')).toHaveLength(0);
    expect(getStatsHistory('longTerm')).toHaveLength(0);
    expect(storage[STATS_HISTORY_STORAGE_KEY]).toBeUndefined();
  });

  it('resetStatsHistory handles missing localStorage', () => {
    const orig = globalThis.localStorage;
    vi.stubGlobal('localStorage', undefined);
    resetStatsHistory();
    vi.stubGlobal('localStorage', orig);
  });
});
