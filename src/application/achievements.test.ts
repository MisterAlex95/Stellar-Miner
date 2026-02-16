import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getTotalClicksEver,
  incrementTotalClicksEver,
  getUnlockedAchievements,
  unlockAchievement,
  checkAchievements,
  ACHIEVEMENTS,
} from './achievements.js';
import { setSession } from './gameState.js';
import { GameSession } from '../domain/aggregates/GameSession.js';
import { Player } from '../domain/entities/Player.js';
import { TOTAL_CLICKS_KEY, ACHIEVEMENTS_KEY, COMBO_MASTER_KEY } from './catalogs.js';
import { setPresentationPort, getDefaultPresentationPort } from './uiBridge.js';

vi.mock('../data/achievements.json', async (importOriginal) => {
  const mod = await importOriginal() as { default: Array<{ id: string; name: string; type: string; value: number }> };
  const orig = Array.isArray(mod?.default) ? mod.default : [];
  return {
    default: [...orig, { id: 'def-unknown', name: 'Def', type: 'unknown', value: 0 }],
  };
});

describe('achievements', () => {
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

  it('getTotalClicksEver returns 0 when no localStorage', () => {
    const orig = globalThis.localStorage;
    vi.stubGlobal('localStorage', undefined);
    expect(getTotalClicksEver()).toBe(0);
    vi.stubGlobal('localStorage', orig);
  });

  it('getTotalClicksEver returns 0 on parse error', () => {
    storage[TOTAL_CLICKS_KEY] = 'not-a-number';
    expect(getTotalClicksEver()).toBe(0);
  });

  it('getTotalClicksEver returns 0 when getItem throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('storage error');
      },
      setItem: () => {},
    });
    expect(getTotalClicksEver()).toBe(0);
  });

  it('getTotalClicksEver returns stored value', () => {
    storage[TOTAL_CLICKS_KEY] = '42';
    expect(getTotalClicksEver()).toBe(42);
  });

  it('incrementTotalClicksEver increments', () => {
    storage[TOTAL_CLICKS_KEY] = '10';
    incrementTotalClicksEver();
    expect(storage[TOTAL_CLICKS_KEY]).toBe('11');
  });

  it('incrementTotalClicksEver catches setItem error', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => '0',
      setItem: () => {
        throw new Error('quota');
      },
    });
    incrementTotalClicksEver();
  });

  it('incrementTotalClicksEver does nothing when localStorage undefined', () => {
    const orig = globalThis.localStorage;
    vi.stubGlobal('localStorage', undefined);
    incrementTotalClicksEver();
    vi.stubGlobal('localStorage', orig);
  });

  it('getUnlockedAchievements returns empty on parse error', () => {
    storage[ACHIEVEMENTS_KEY] = 'invalid';
    expect(getUnlockedAchievements().size).toBe(0);
  });

  it('unlockAchievement does not double-unlock', () => {
    unlockAchievement('first-click');
    const before = getUnlockedAchievements().size;
    unlockAchievement('first-click');
    expect(getUnlockedAchievements().size).toBe(before);
  });

  it('getUnlockedAchievements returns empty when no storage', () => {
    expect(getUnlockedAchievements().size).toBe(0);
  });

  it('getUnlockedAchievements returns set from storage', () => {
    storage[ACHIEVEMENTS_KEY] = JSON.stringify(['first-click', 'clicks-100']);
    const set = getUnlockedAchievements();
    expect(set.has('first-click')).toBe(true);
    expect(set.has('clicks-100')).toBe(true);
  });

  it('unlockAchievement adds id and persists', () => {
    unlockAchievement('first-click');
    expect(getUnlockedAchievements().has('first-click')).toBe(true);
  });

  it('checkAchievements unlocks first matching', () => {
    storage[TOTAL_CLICKS_KEY] = '1';
    checkAchievements();
    expect(getUnlockedAchievements().has('first-click')).toBe(true);
  });

  it('checkAchievements does nothing when no achievement can unlock', () => {
    unlockAchievement('first-click');
    const before = getUnlockedAchievements().size;
    checkAchievements();
    expect(getUnlockedAchievements().size).toBe(before);
  });

  it('totalSlotsGreaterThan check uses session slots', () => {
    const player = Player.create('p1');
    player.planets[0].addSlot();
    player.planets[0].addSlot();
    setSession(new GameSession('s1', player));
    const expander = ACHIEVEMENTS.find((a) => a.id === 'first-slot');
    expect(expander?.check()).toBe(true);
  });

  it('unlockAchievement shows toast when achievement found', () => {
    const showAchievementToast = vi.fn();
    setPresentationPort({ ...getDefaultPresentationPort(), showAchievementToast });
    unlockAchievement('first-click');
    expect(showAchievementToast).toHaveBeenCalledWith('First steps');
  });

  it('buildCheck default returns false for unknown type', () => {
    const defUnknown = ACHIEVEMENTS.find((a) => a.id === 'def-unknown');
    expect(defUnknown).toBeDefined();
    expect(defUnknown!.check()).toBe(false);
  });

  it('combo-master check uses localStorage', () => {
    storage[COMBO_MASTER_KEY] = '1';
    const comboMaster = ACHIEVEMENTS.find((a) => a.id === 'combo-master');
    expect(comboMaster?.check()).toBe(true);
  });
});
