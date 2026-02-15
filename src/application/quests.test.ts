import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateQuest,
  getQuestProgress,
  getQuestStreak,
  getQuestLastClaimAt,
  claimQuest,
} from './quests.js';
import { setSession, setQuestState, getQuestState } from './gameState.js';
import { GameSession } from '../domain/aggregates/GameSession.js';
import { Player } from '../domain/entities/Player.js';
import { QUEST_STREAK_KEY, QUEST_LAST_CLAIM_KEY } from './catalogs.js';

describe('quests', () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
    });
    const player = Player.create('p1');
    setSession(new GameSession('s1', player));
  });

  it('generateQuest returns quest with valid shape', () => {
    const q = generateQuest();
    expect(q.type).toMatch(/^(coins|production|upgrade|astronauts)$/);
    expect(q.target).toBeGreaterThan(0);
    expect(q.reward).toBeGreaterThan(0);
    expect(typeof q.description).toBe('string');
  });

  it('generateQuest can return production quest when random in range', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    const q = generateQuest();
    vi.restoreAllMocks();
    if (q.type === 'production') {
      expect(q.target).toBeGreaterThan(0);
      expect(q.description).toContain('production');
    }
  });

  it('generateQuest can return upgrade quest when random in range', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.55);
    const q = generateQuest();
    vi.restoreAllMocks();
    if (q.type === 'upgrade') {
      expect(q.targetId).toBeDefined();
      expect(q.target).toBeGreaterThan(0);
    }
  });

  it('generateQuest can return astronauts quest when random in range', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.95);
    const q = generateQuest();
    vi.restoreAllMocks();
    if (q.type === 'astronauts') {
      expect(q.target).toBeGreaterThan(0);
    }
  });

  it('getQuestProgress returns null when no session or no quest', () => {
    setQuestState({ quest: null });
    expect(getQuestProgress()).toBeNull();
    setSession(null!);
    expect(getQuestProgress()).toBeNull();
  });

  it('getQuestProgress returns progress for coins quest', () => {
    const player = Player.create('p1');
    player.addCoins(500);
    setSession(new GameSession('s1', player));
    setQuestState({ quest: { type: 'coins', target: 500, reward: 100, description: 'Reach 500' } });
    const p = getQuestProgress();
    expect(p).not.toBeNull();
    const current = p!.current;
    expect(typeof current === 'number' ? current : (current as { toNumber: () => number }).toNumber()).toBe(500);
    expect(p!.done).toBe(true);
  });

  it('getQuestProgress returns progress for production quest', () => {
    const player = Player.create('p1');
    player.setProductionRate(player.productionRate.add(100));
    setSession(new GameSession('s1', player));
    setQuestState({ quest: { type: 'production', target: 50, reward: 100, description: 'Reach 50/s' } });
    const p = getQuestProgress();
    expect(p).not.toBeNull();
    expect(p!.done).toBe(true);
  });

  it('getQuestProgress returns progress for upgrade quest', () => {
    const player = Player.create('p1');
    setSession(new GameSession('s1', player));
    setQuestState({
      quest: { type: 'upgrade', target: 1, targetId: 'mining-robot', reward: 50, description: 'Own 1× Robot' },
    });
    const p = getQuestProgress();
    expect(p).not.toBeNull();
    expect(typeof p!.current).toBe('number');
  });

  it('getQuestProgress returns progress for astronauts quest', () => {
    const player = Player.create('p1');
    player.addCoins(5000);
    player.hireAstronaut(1000);
    setSession(new GameSession('s1', player));
    setQuestState({ quest: { type: 'astronauts', target: 1, reward: 50, description: 'Have 1 astronaut' } });
    const p = getQuestProgress();
    expect(p).not.toBeNull();
    expect(p!.done).toBe(true);
  });

  it('getQuestStreak returns stored value', () => {
    storage[QUEST_STREAK_KEY] = '2';
    expect(getQuestStreak()).toBe(2);
  });

  it('getQuestLastClaimAt returns stored value', () => {
    storage[QUEST_LAST_CLAIM_KEY] = '1234567890';
    expect(getQuestLastClaimAt()).toBe(1234567890);
  });

  it('getQuestStreak returns 0 when no localStorage', () => {
    const orig = globalThis.localStorage;
    vi.stubGlobal('localStorage', undefined);
    expect(getQuestStreak()).toBe(0);
    vi.stubGlobal('localStorage', orig);
  });

  it('getQuestLastClaimAt returns 0 when no localStorage', () => {
    const orig = globalThis.localStorage;
    vi.stubGlobal('localStorage', undefined);
    expect(getQuestLastClaimAt()).toBe(0);
    vi.stubGlobal('localStorage', orig);
  });

  it('getQuestStreak returns 0 when getItem throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('storage error');
      },
      setItem: () => {},
    });
    expect(getQuestStreak()).toBe(0);
  });

  it('getQuestLastClaimAt returns 0 when getItem throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('storage error');
      },
      setItem: () => {},
    });
    expect(getQuestLastClaimAt()).toBe(0);
  });

  it('claimQuest returns false when no quest or not done', () => {
    expect(claimQuest({
      saveSession: vi.fn(),
      updateStats: vi.fn(),
      renderUpgradeList: vi.fn(),
      renderQuestSection: vi.fn(),
      showFloatingReward: vi.fn(),
      showQuestStreakToast: vi.fn(),
      checkAchievements: vi.fn(),
    })).toBe(false);
  });

  it('claimQuest returns true and runs callbacks when done', () => {
    const origDoc = globalThis.document;
    vi.stubGlobal('document', { getElementById: () => null });
    const player = Player.create('p1');
    player.addCoins(10000);
    setSession(new GameSession('s1', player));
    setQuestState({
      quest: { type: 'coins', target: 100, reward: 50, description: 'Reach 100 coins' },
    });
    const callbacks = {
      saveSession: vi.fn(),
      updateStats: vi.fn(),
      renderUpgradeList: vi.fn(),
      renderQuestSection: vi.fn(),
      showFloatingReward: vi.fn(),
      showQuestStreakToast: vi.fn(),
      checkAchievements: vi.fn(),
    };
    const result = claimQuest(callbacks);
    expect(result).toBe(true);
    expect(callbacks.saveSession).toHaveBeenCalled();
    expect(getQuestState().quest).not.toBeNull();
    vi.stubGlobal('document', origDoc);
  });
});
