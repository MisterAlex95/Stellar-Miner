import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  setSession,
  getSession,
  getEventMultiplier,
  getEventContext,
  getActiveEventInstances,
  setActiveEventInstances,
  pushActiveEventInstance,
  getNextEventAt,
  setNextEventAt,
  getGameStartTime,
  setGameStartTime,
  getSettings,
  setSettings,
  getQuestState,
  setQuestState,
  getLastCoinsForBump,
  setLastCoinsForBump,
  getClickTimestamps,
  setClickTimestamps,
  getSessionClickCount,
  setSessionClickCount,
  getSessionCoinsFromClicks,
  setSessionCoinsFromClicks,
  getRunStats,
  setRunStatsFromPayload,
  resetRunStatsOnPrestige,
  addRunCoins,
  incrementRunQuestsClaimed,
  incrementRunEventsTriggered,
  updateRunMaxComboMult,
  getPrestigesToday,
  incrementPrestigesToday,
  getOrCreateSession,
  saveLoad,
  setStarfieldApi,
  setMineZoneCanvasApi,
} from './gameState.js';
import { GameSession } from '../domain/aggregates/GameSession.js';
import { Player } from '../domain/entities/Player.js';
import { GameEvent } from '../domain/entities/GameEvent.js';
import { EventEffect } from '../domain/value-objects/EventEffect.js';
import Decimal from 'break_infinity.js';

describe('gameState', () => {
  beforeEach(() => {
    const player = Player.create('player-1');
    const session = new GameSession('s1', player);
    setSession(session);
  });

  it('getSession returns current session', () => {
    const s = getSession();
    expect(s).not.toBeNull();
    expect(s?.player.id).toBe('player-1');
  });

  it('getEventMultiplier returns 1 when no active events', () => {
    expect(getEventMultiplier()).toBe(1);
  });

  it('getEventMultiplier returns product of active event multipliers', () => {
    const evt = new GameEvent('e1', 'E1', new EventEffect(2, Date.now() + 60000));
    setActiveEventInstances([{ event: evt, endsAt: Date.now() + 60000 }]);
    expect(getEventMultiplier()).toBe(2);
  });

  it('getActiveEventInstances and setActiveEventInstances', () => {
    const evt = new GameEvent('e1', 'E1', new EventEffect(1, Date.now() + 60000));
    setActiveEventInstances([{ event: evt, endsAt: Date.now() + 60000 }]);
    expect(getActiveEventInstances()).toHaveLength(1);
    expect(getActiveEventInstances()[0].event.id).toBe('e1');
  });

  it('getEventContext returns active event ids', () => {
    const evt = new GameEvent('e1', 'E1', new EventEffect(1, Date.now() + 60000));
    setActiveEventInstances([{ event: evt, endsAt: Date.now() + 60000 }]);
    expect(getEventContext().activeEventIds).toContain('e1');
  });

  it('pushActiveEventInstance adds instance', () => {
    setActiveEventInstances([]);
    const evt = new GameEvent('e1', 'E1', new EventEffect(1, Date.now() + 60000));
    pushActiveEventInstance({ event: evt, endsAt: Date.now() + 60000 });
    expect(getEventMultiplier()).toBe(1);
  });

  it('getNextEventAt / setNextEventAt', () => {
    setNextEventAt(12345);
    expect(getNextEventAt()).toBe(12345);
  });

  it('getGameStartTime / setGameStartTime', () => {
    setGameStartTime(1000);
    expect(getGameStartTime()).toBe(1000);
  });

  it('getSettings / setSettings', () => {
    const s = getSettings();
    expect(s).toBeDefined();
    setSettings({ ...s, theme: 'dark' });
    expect(getSettings().theme).toBe('dark');
  });

  it('getQuestState / setQuestState', () => {
    setQuestState({ quest: null });
    expect(getQuestState().quest).toBeNull();
  });

  it('getLastCoinsForBump / setLastCoinsForBump', () => {
    setLastCoinsForBump(500);
    expect(getLastCoinsForBump().toNumber()).toBe(500);
    setLastCoinsForBump(new Decimal(100));
    expect(getLastCoinsForBump().toNumber()).toBe(100);
  });

  it('getClickTimestamps / setClickTimestamps', () => {
    setClickTimestamps([1, 2, 3]);
    expect(getClickTimestamps()).toEqual([1, 2, 3]);
  });

  it('getSessionClickCount / setSessionClickCount', () => {
    setSessionClickCount(10);
    expect(getSessionClickCount()).toBe(10);
  });

  it('getSessionCoinsFromClicks / setSessionCoinsFromClicks', () => {
    setSessionCoinsFromClicks(100);
    expect(getSessionCoinsFromClicks()).toBe(100);
  });

  it('getOrCreateSession loads or creates session', async () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
    const session = await getOrCreateSession();
    expect(session).not.toBeNull();
    expect(session.player.id).toBeDefined();
  });

  it('setStarfieldApi and setMineZoneCanvasApi accept and clear api', () => {
    setStarfieldApi(null);
    setMineZoneCanvasApi(null);
    setStarfieldApi({} as Parameters<typeof setStarfieldApi>[0]);
    setMineZoneCanvasApi({} as Parameters<typeof setMineZoneCanvasApi>[0]);
    setStarfieldApi(null);
    setMineZoneCanvasApi(null);
  });

  it('getOrCreateSession returns loaded session when storage has valid save', async () => {
    const validSave = JSON.stringify({
      version: 1,
      id: 'loaded-1',
      player: {
        id: 'p1',
        coins: 200,
        productionRate: 5,
        planets: [{ id: 'planet-1', name: 'Titan', maxUpgrades: 6, upgrades: [], housing: 0 }],
        artifacts: [],
        prestigeLevel: 0,
        totalCoinsEver: 200,
        astronautCount: 0,
      },
      activeEvents: [],
    });
    const storage: Record<string, string> = { 'stellar-miner-session': validSave };
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => storage[k] ?? null,
      setItem: () => {},
    });
    const session = await getOrCreateSession();
    expect(session.id).toBe('loaded-1');
    expect(session.player.coins.value.toNumber()).toBe(200);
  });

  it('getRunStats returns current run stats', () => {
    const stats = getRunStats();
    expect(stats).toHaveProperty('runStartTime');
    expect(stats).toHaveProperty('runCoinsEarned', 0);
    expect(stats).toHaveProperty('runQuestsClaimed', 0);
    expect(stats).toHaveProperty('runEventsTriggered', 0);
    expect(stats).toHaveProperty('runMaxComboMult', 0);
  });

  it('setRunStatsFromPayload resets to defaults when null', () => {
    setRunStatsFromPayload({ runCoinsEarned: 100 });
    expect(getRunStats().runCoinsEarned).toBe(100);
    setRunStatsFromPayload(null);
    expect(getRunStats().runCoinsEarned).toBe(0);
    expect(getRunStats().runQuestsClaimed).toBe(0);
  });

  it('setRunStatsFromPayload merges partial payload with defaults', () => {
    setRunStatsFromPayload({ runEventsTriggered: 5, runMaxComboMult: 2 });
    const stats = getRunStats();
    expect(stats.runEventsTriggered).toBe(5);
    expect(stats.runMaxComboMult).toBe(2);
  });

  it('resetRunStatsOnPrestige zeroes run stats', () => {
    setRunStatsFromPayload({ runCoinsEarned: 50, runQuestsClaimed: 1 });
    resetRunStatsOnPrestige();
    expect(getRunStats().runCoinsEarned).toBe(0);
    expect(getRunStats().runQuestsClaimed).toBe(0);
  });

  it('addRunCoins increments runCoinsEarned', () => {
    resetRunStatsOnPrestige();
    addRunCoins(100);
    expect(getRunStats().runCoinsEarned).toBe(100);
    addRunCoins(50);
    expect(getRunStats().runCoinsEarned).toBe(150);
  });

  it('incrementRunQuestsClaimed and incrementRunEventsTriggered', () => {
    resetRunStatsOnPrestige();
    incrementRunQuestsClaimed();
    incrementRunQuestsClaimed();
    expect(getRunStats().runQuestsClaimed).toBe(2);
    incrementRunEventsTriggered();
    expect(getRunStats().runEventsTriggered).toBe(1);
  });

  it('updateRunMaxComboMult updates only when greater', () => {
    resetRunStatsOnPrestige();
    updateRunMaxComboMult(2);
    expect(getRunStats().runMaxComboMult).toBe(2);
    updateRunMaxComboMult(1);
    expect(getRunStats().runMaxComboMult).toBe(2);
    updateRunMaxComboMult(3);
    expect(getRunStats().runMaxComboMult).toBe(3);
  });

  it('getPrestigesToday returns 0 when no localStorage', () => {
    const orig = globalThis.localStorage;
    vi.stubGlobal('localStorage', undefined);
    expect(getPrestigesToday()).toBe(0);
    vi.stubGlobal('localStorage', orig);
  });

  it('getPrestigesToday returns stored count when date is today', () => {
    const today = new Date().toISOString().slice(0, 10);
    vi.stubGlobal('localStorage', {
      getItem: () => JSON.stringify({ date: today, count: 2 }),
      setItem: () => {},
    });
    expect(getPrestigesToday()).toBe(2);
  });

  it('getPrestigesToday returns 0 when date is not today or invalid', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => JSON.stringify({ date: '2000-01-01', count: 5 }),
      setItem: () => {},
    });
    expect(getPrestigesToday()).toBe(0);
    vi.stubGlobal('localStorage', {
      getItem: () => JSON.stringify({}),
      setItem: () => {},
    });
    expect(getPrestigesToday()).toBe(0);
  });

  it('incrementPrestigesToday sets count to 1 when no prior data', () => {
    const storage: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => storage[k] ?? null,
      setItem: (k: string, v: string) => {
        storage[k] = v;
      },
    });
    incrementPrestigesToday();
    const data = JSON.parse(storage['stellar-miner-prestiges-today'] ?? '{}');
    expect(data.count).toBe(1);
    expect(data.date).toBe(new Date().toISOString().slice(0, 10));
  });

  it('incrementPrestigesToday increments when date is today', () => {
    const today = new Date().toISOString().slice(0, 10);
    const storage: Record<string, string> = {
      'stellar-miner-prestiges-today': JSON.stringify({ date: today, count: 1 }),
    };
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => storage[k] ?? null,
      setItem: (k: string, v: string) => {
        storage[k] = v;
      },
    });
    incrementPrestigesToday();
    const data = JSON.parse(storage['stellar-miner-prestiges-today'] ?? '{}');
    expect(data.count).toBe(2);
  });

  it('getPrestigesToday returns 0 when JSON.parse throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => 'invalid-json',
      setItem: () => {},
    });
    expect(getPrestigesToday()).toBe(0);
  });

  it('incrementPrestigesToday no-ops when getItem throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('storage error');
      },
      setItem: () => {},
    });
    expect(() => incrementPrestigesToday()).not.toThrow();
  });

  it('getEventContext excludes expired events', () => {
    const evt = new GameEvent('e1', 'E1', new EventEffect(1, 0));
    setActiveEventInstances([{ event: evt, endsAt: Date.now() - 1000 }]);
    expect(getEventContext().activeEventIds).not.toContain('e1');
  });
});
