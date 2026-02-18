import { describe, it, expect, beforeEach, vi } from 'vitest';
import Decimal from 'break_infinity.js';
import { getReachedMilestones, markMilestoneReached, checkAndShowMilestones } from './milestones.js';
import { setSession } from './gameState.js';
import { GameSession } from '../domain/aggregates/GameSession.js';
import { Player } from '../domain/entities/Player.js';
import { MILESTONES_STORAGE_KEY } from './catalogs.js';

vi.mock('../presentation/toasts/toasts.js', () => ({ showMilestoneToast: vi.fn() }));

describe('milestones', () => {
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

  it('getReachedMilestones returns empty when no localStorage', () => {
    const orig = globalThis.localStorage;
    vi.stubGlobal('localStorage', undefined);
    expect(getReachedMilestones()).toEqual([]);
    vi.stubGlobal('localStorage', orig);
  });

  it('getReachedMilestones returns empty on parse error', () => {
    storage[MILESTONES_STORAGE_KEY] = 'not json';
    expect(getReachedMilestones()).toEqual([]);
  });

  it('getReachedMilestones returns stored array', () => {
    storage[MILESTONES_STORAGE_KEY] = JSON.stringify([100, 500]);
    expect(getReachedMilestones()).toEqual([100, 500]);
  });

  it('markMilestoneReached adds and sorts', () => {
    markMilestoneReached(500);
    markMilestoneReached(100);
    expect(getReachedMilestones()).toEqual([100, 500]);
  });

  it('checkAndShowMilestones does nothing when no session', () => {
    setSession(null!);
    checkAndShowMilestones();
    setSession(new GameSession('s1', Player.create('p1')));
  });

  it('checkAndShowMilestones marks and shows when threshold reached', () => {
    const player = Player.create('p1');
    (player as { totalCoinsEver: Decimal }).totalCoinsEver = new Decimal(500);
    setSession(new GameSession('s1', player));
    checkAndShowMilestones();
    expect(getReachedMilestones()).toContain(500);
  });
});
