import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getQuestSnapshot } from './questSnapshot.js';
import { setSession, setQuestState } from './gameState.js';
import { GameSession } from '../domain/aggregates/GameSession.js';
import { Player } from '../domain/entities/Player.js';
import { QUEST_STREAK_WINDOW_MS } from './catalogs.js';

describe('questSnapshot', () => {
  beforeEach(() => {
    const storage: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
    });
    vi.useFakeTimers();
  });

  it('exposes claimWindowEndMs when quest is complete and unclaimed, using QUEST_STREAK_WINDOW_MS', () => {
    const now = 10000;
    vi.setSystemTime(now);

    const player = Player.create('p1');
    player.addCoins(500);
    setSession(new GameSession('s1', player));
    setQuestState({
      quest: { type: 'coins', target: 100, reward: 50, description: 'Reach 100 coins' },
    });

    const snapshot = getQuestSnapshot();

    expect(snapshot.sectionComplete).toBe(true);
    expect(snapshot.claimWindowEndMs).toBeGreaterThan(now);
    expect(snapshot.claimWindowEndMs).toBeLessThanOrEqual(now + QUEST_STREAK_WINDOW_MS + 100);
  });

  it('returns claimWindowEndMs 0 when quest is not complete', () => {
    const player = Player.create('p1');
    setSession(new GameSession('s1', player));
    setQuestState({
      quest: { type: 'coins', target: 1000, reward: 50, description: 'Reach 1000 coins' },
    });

    const snapshot = getQuestSnapshot();

    expect(snapshot.sectionComplete).toBe(false);
    expect(snapshot.claimWindowEndMs).toBe(0);
  });
});
