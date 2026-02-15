import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  setSession,
  getSession,
  getEventMultiplier,
  getEventContext,
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
  getOrCreateSession,
  saveLoad,
} from './gameState.js';
import { GameSession } from '../domain/aggregates/GameSession.js';
import { Player } from '../domain/entities/Player.js';
import { GameEvent } from '../domain/entities/GameEvent.js';
import { EventEffect } from '../domain/value-objects/EventEffect.js';

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
});
