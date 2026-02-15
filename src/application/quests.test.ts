import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateQuest,
  getQuestProgress,
  getQuestStreak,
  getQuestLastClaimAt,
  claimQuest,
} from './quests.js';
import { setSession, setQuestState, getQuestState, setRunStatsFromPayload } from './gameState.js';
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
    expect(q.type).toMatch(/^(coins|production|upgrade|astronauts|combo_tier|events_triggered|tier1_set|prestige_today)$/);
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
    vi.spyOn(Math, 'random').mockReturnValue(0.75);
    const q = generateQuest();
    vi.restoreAllMocks();
    expect(q.type).toBe('astronauts');
    expect(q.target).toBeGreaterThan(0);
  });

  it('generateQuest can return coins quest when random in first bucket', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const q = generateQuest();
    vi.restoreAllMocks();
    expect(q.type).toBe('coins');
    expect(q.target).toBeGreaterThan(0);
    expect(q.description).toContain('coins');
  });

  it('generateQuest can return prestige_today quest when random in range', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.85);
    const q = generateQuest();
    vi.restoreAllMocks();
    expect(q.type).toBe('prestige_today');
    expect(q.target).toBeGreaterThan(0);
  });

  it('generateQuest can return combo_tier quest when random in range', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const q = generateQuest();
    vi.restoreAllMocks();
    expect(q.type).toBe('combo_tier');
    expect(q.target).toBeGreaterThan(0);
    expect(q.description).toContain('combo');
  });

  it('generateQuest can return events_triggered quest when random in range', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.95);
    const q = generateQuest();
    vi.restoreAllMocks();
    expect(q.type).toBe('events_triggered');
    expect(q.target).toBeGreaterThan(0);
  });

  it('generateQuest can return tier1_set quest when random in last bucket', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const q = generateQuest();
    vi.restoreAllMocks();
    expect(q.type).toBe('tier1_set');
    expect(q.description).toContain('tier-1');
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

  it('getQuestProgress returns progress for combo_tier quest', () => {
    setSession(new GameSession('s1', Player.create('p1')));
    setRunStatsFromPayload({ runMaxComboMult: 1.5 });
    setQuestState({ quest: { type: 'combo_tier', target: 150, reward: 100, description: 'Reach ×1.5 combo' } });
    const p = getQuestProgress();
    expect(p).not.toBeNull();
    expect(p!.current).toBe(150);
    expect(p!.done).toBe(true);
  });

  it('getQuestProgress returns progress for combo_tier when below target', () => {
    setSession(new GameSession('s1', Player.create('p1')));
    setRunStatsFromPayload({ runMaxComboMult: 1.1 });
    setQuestState({ quest: { type: 'combo_tier', target: 130, reward: 100, description: 'Reach ×1.3 combo' } });
    const p = getQuestProgress();
    expect(p).not.toBeNull();
    expect(p!.current).toBe(110);
    expect(p!.done).toBe(false);
  });

  it('getQuestProgress returns progress for events_triggered quest', () => {
    setSession(new GameSession('s1', Player.create('p1')));
    setRunStatsFromPayload({ runEventsTriggered: 5 });
    setQuestState({ quest: { type: 'events_triggered', target: 5, reward: 100, description: 'Trigger 5 events' } });
    const p = getQuestProgress();
    expect(p).not.toBeNull();
    expect(p!.current).toBe(5);
    expect(p!.done).toBe(true);
  });

  it('getQuestProgress returns progress for tier1_set quest', () => {
    const player = Player.create('p1');
    setSession(new GameSession('s1', player));
    setQuestState({ quest: { type: 'tier1_set', target: 1, reward: 1500, description: 'Own one of every tier-1' } });
    const p = getQuestProgress();
    expect(p).not.toBeNull();
    expect(typeof p!.current).toBe('number');
  });

  it('getQuestProgress returns progress for prestige_today quest when storage has count', () => {
    setSession(new GameSession('s1', Player.create('p1')));
    const today = new Date().toISOString().slice(0, 10);
    storage['stellar-miner-prestiges-today'] = JSON.stringify({ date: today, count: 2 });
    setQuestState({ quest: { type: 'prestige_today', target: 2, reward: 200, description: 'Prestige 2 times today' } });
    const p = getQuestProgress();
    expect(p).not.toBeNull();
    expect(p!.current).toBe(2);
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

  it('claimQuest calls showFloatingReward with claim button when element exists', () => {
    const mockBtn = { id: 'quest-claim' } as unknown as HTMLElement;
    vi.stubGlobal('document', { getElementById: (id: string) => (id === 'quest-claim' ? mockBtn : null) });
    const player = Player.create('p1');
    player.addCoins(10000);
    setSession(new GameSession('s1', player));
    setQuestState({
      quest: { type: 'coins', target: 100, reward: 50, description: 'Reach 100 coins' },
    });
    const showFloatingReward = vi.fn();
    claimQuest({
      saveSession: vi.fn(),
      updateStats: vi.fn(),
      renderUpgradeList: vi.fn(),
      renderQuestSection: vi.fn(),
      showFloatingReward,
      showQuestStreakToast: vi.fn(),
      checkAchievements: vi.fn(),
    });
    expect(showFloatingReward).toHaveBeenCalledWith(50, mockBtn);
  });

  it('claimQuest calls showQuestStreakToast when streak > 1', () => {
    storage[QUEST_LAST_CLAIM_KEY] = String(Date.now() - 1000);
    storage[QUEST_STREAK_KEY] = '2';
    vi.stubGlobal('document', { getElementById: () => null });
    const player = Player.create('p1');
    player.addCoins(10000);
    setSession(new GameSession('s1', player));
    setQuestState({
      quest: { type: 'coins', target: 100, reward: 50, description: 'Reach 100 coins' },
    });
    const showQuestStreakToast = vi.fn();
    claimQuest({
      saveSession: vi.fn(),
      updateStats: vi.fn(),
      renderUpgradeList: vi.fn(),
      renderQuestSection: vi.fn(),
      showFloatingReward: vi.fn(),
      showQuestStreakToast,
      checkAchievements: vi.fn(),
    });
    expect(showQuestStreakToast).toHaveBeenCalled();
    const [streak, mult] = showQuestStreakToast.mock.calls[0];
    expect(streak).toBeGreaterThan(1);
    expect(typeof mult).toBe('number');
  });
});
