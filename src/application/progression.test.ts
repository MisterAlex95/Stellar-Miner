import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getSeenModals,
  markModalSeen,
  clearProgression,
  getUnlockedBlocks,
  shouldShowWelcome,
  getNextMilestone,
  PROGRESSION_BLOCKS,
} from './progression.js';
import { GameSession } from '../domain/aggregates/GameSession.js';
import { Player } from '../domain/entities/Player.js';

describe('progression', () => {
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
  });

  it('getSeenModals returns empty when no storage', () => {
    expect(getSeenModals().size).toBe(0);
  });

  it('markModalSeen and getSeenModals persist', () => {
    markModalSeen('upgrades');
    expect(getSeenModals().has('upgrades')).toBe(true);
  });

  it('clearProgression removes key', () => {
    markModalSeen('welcome');
    clearProgression();
    expect(getSeenModals().size).toBe(0);
  });

  it('loadProgression handles invalid JSON', () => {
    storage['stellar-miner-progression'] = 'invalid';
    expect(getSeenModals().size).toBe(0);
  });

  it('getUnlockedBlocks returns only permanent when session null', () => {
    expect(getUnlockedBlocks(null).size).toBeGreaterThanOrEqual(0);
  });

  it('getUnlockedBlocks unlocks blocks by coin threshold', () => {
    const player = Player.create('p1');
    player.addCoins(100000);
    const session = new GameSession('s1', player);
    const unlocked = getUnlockedBlocks(session);
    expect(unlocked.has('upgrades')).toBe(true);
    expect(unlocked.has('planets')).toBe(true);
  });

  it('shouldShowWelcome is false when session has coins', () => {
    const player = Player.create('p1');
    player.addCoins(1);
    expect(shouldShowWelcome(new Set(), new GameSession('s1', player))).toBe(false);
  });

  it('shouldShowWelcome is true when no coins and welcome not seen', () => {
    const player = Player.create('p1');
    expect(shouldShowWelcome(new Set(), new GameSession('s1', player))).toBe(true);
  });

  it('shouldShowWelcome is false when welcome already seen', () => {
    const player = Player.create('p1');
    expect(shouldShowWelcome(new Set(['welcome']), new GameSession('s1', player))).toBe(false);
  });

  it('getNextMilestone returns first locked block', () => {
    const player = Player.create('p1');
    player.addCoins(0);
    const session = new GameSession('s1', player);
    const next = getNextMilestone(session);
    expect(next).not.toBeNull();
    expect(next!.block.coinsThreshold).toBe(PROGRESSION_BLOCKS.find((b) => b.id === 'upgrades')!.coinsThreshold);
  });

  it('getNextMilestone returns null when all unlocked', () => {
    const player = Player.create('p1');
    player.addCoins(1_000_000);
    const session = new GameSession('s1', player);
    getUnlockedBlocks(session);
    const next = getNextMilestone(session);
    expect(next).toBeNull();
  });
});
