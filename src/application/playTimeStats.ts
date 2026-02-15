import { STATS_STORAGE_KEY } from './catalogs.js';

export type PlayTimeStats = { firstPlayedAt: number; totalPlayTimeMs: number };

export function getPlayTimeStats(): PlayTimeStats {
  if (typeof localStorage === 'undefined') return { firstPlayedAt: Date.now(), totalPlayTimeMs: 0 };
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return { firstPlayedAt: Date.now(), totalPlayTimeMs: 0 };
    const data = JSON.parse(raw) as { firstPlayedAt?: number; totalPlayTimeMs?: number };
    return {
      firstPlayedAt: data.firstPlayedAt ?? Date.now(),
      totalPlayTimeMs: data.totalPlayTimeMs ?? 0,
    };
  } catch {
    return { firstPlayedAt: Date.now(), totalPlayTimeMs: 0 };
  }
}

export function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const hour = Math.floor(min / 60);
  const day = Math.floor(hour / 24);
  if (day > 0) return `${day}d ${hour % 24}h`;
  if (hour > 0) return `${hour}h ${min % 60}m`;
  if (min > 0) return `${min}m ${sec % 60}s`;
  return `${sec}s`;
}
