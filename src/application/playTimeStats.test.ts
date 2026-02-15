import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getPlayTimeStats, formatDuration } from './playTimeStats.js';
import { STATS_STORAGE_KEY } from './catalogs.js';

describe('playTimeStats', () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage[key] ?? null,
    });
  });

  it('getPlayTimeStats returns default when no localStorage', () => {
    const orig = globalThis.localStorage;
    vi.stubGlobal('localStorage', undefined);
    const r = getPlayTimeStats();
    expect(r.firstPlayedAt).toBeDefined();
    expect(r.totalPlayTimeMs).toBe(0);
    vi.stubGlobal('localStorage', orig);
  });

  it('getPlayTimeStats returns default when key missing', () => {
    const r = getPlayTimeStats();
    expect(r.firstPlayedAt).toBeDefined();
    expect(r.totalPlayTimeMs).toBe(0);
  });

  it('getPlayTimeStats returns stored data', () => {
    storage[STATS_STORAGE_KEY] = JSON.stringify({
      firstPlayedAt: 1000,
      totalPlayTimeMs: 5000,
    });
    expect(getPlayTimeStats()).toEqual({ firstPlayedAt: 1000, totalPlayTimeMs: 5000 });
  });

  it('getPlayTimeStats fills missing fields with defaults', () => {
    storage[STATS_STORAGE_KEY] = JSON.stringify({});
    const r = getPlayTimeStats();
    expect(r.firstPlayedAt).toBeDefined();
    expect(r.totalPlayTimeMs).toBe(0);
  });

  it('getPlayTimeStats handles parse error', () => {
    storage[STATS_STORAGE_KEY] = 'invalid';
    const r = getPlayTimeStats();
    expect(r.totalPlayTimeMs).toBe(0);
  });

  it('formatDuration formats seconds only', () => {
    expect(formatDuration(5000)).toBe('5s');
  });
  it('formatDuration formats minutes and seconds', () => {
    expect(formatDuration(125000)).toBe('2m 5s');
  });
  it('formatDuration formats hours and minutes', () => {
    expect(formatDuration(7325000)).toBe('2h 2m');
  });
  it('formatDuration formats days and hours', () => {
    expect(formatDuration(90000000)).toBe('1d 1h');
  });
});
