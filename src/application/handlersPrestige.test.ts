import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setSession, getSession } from './gameState.js';
import { GameSession } from '../domain/aggregates/GameSession.js';
import { Player } from '../domain/entities/Player.js';
import { confirmPrestige } from './handlersPrestige.js';
import { notifyRefresh } from './refreshSignal.js';
import { PRESTIGE_COIN_THRESHOLD } from '../domain/constants.js';

vi.mock('../presentation/upgradeList/upgradeList.js', () => ({ renderUpgradeList: vi.fn() }));
vi.mock('../presentation/toasts/toasts.js', () => ({
  showPrestigeMilestoneToast: vi.fn(),
  showMiniMilestoneToast: vi.fn(),
}));
vi.mock('../presentation/components/overlay.js', () => ({
  closeOverlay: vi.fn(),
}));
vi.mock('./achievements.js', () => ({ checkAchievements: vi.fn() }));
vi.mock('./eventBus.js', () => ({ emit: vi.fn() }));
vi.mock('./refreshSignal.js', () => ({ notifyRefresh: vi.fn() }));
vi.mock('./quests.js', () => ({ generateQuest: () => ({ type: 'coins', target: 100, reward: 50, description: 'test' }) }));
vi.mock('./questState.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./questState.js')>();
  return { ...actual, saveQuestState: vi.fn() };
});
vi.mock('./research.js', () => ({ clearResearch: vi.fn(), addPrestigeResearchPoints: vi.fn() }));

describe('handlersPrestige', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} });
    const player = Player.create('p1');
    player.addCoins(PRESTIGE_COIN_THRESHOLD.toNumber() + 10000);
    player.addAstronauts(2);
    setSession(new GameSession('s1', player));
  });

  it('resets to one planet, zero coins, and increments prestige level', () => {
    const session = getSession();
    const levelBefore = session.player.prestigeLevel;

    confirmPrestige();

    const sessionAfter = getSession();
    expect(sessionAfter.player.planets.length).toBe(1);
    expect(sessionAfter.player.coins.value.toNumber()).toBe(0);
    expect(sessionAfter.player.prestigeLevel).toBe(levelBefore + 1);
  });

  it('does not reset when coins below threshold', () => {
    const player = Player.create('p2');
    player.addCoins(PRESTIGE_COIN_THRESHOLD.toNumber() - 1000);
    player.addAstronauts(1);
    setSession(new GameSession('s2', player));
    const session = getSession();
    const levelBefore = session.player.prestigeLevel;
    const coinsBefore = session.player.coins.value.toNumber();

    confirmPrestige();

    const sessionAfter = getSession();
    expect(sessionAfter.player.prestigeLevel).toBe(levelBefore);
    expect(sessionAfter.player.coins.value.toNumber()).toBe(coinsBefore);
  });

  it('clears crew and veterans after prestige', () => {
    const session = getSession();
    expect(session.player.astronautCount).toBe(2);

    confirmPrestige();

    const sessionAfter = getSession();
    expect(sessionAfter.player.astronautCount).toBe(0);
    expect(sessionAfter.player.veteranCount).toBe(0);
  });

  it('calls notifyRefresh after prestige', () => {
    confirmPrestige();
    expect(notifyRefresh).toHaveBeenCalled();
  });
});
