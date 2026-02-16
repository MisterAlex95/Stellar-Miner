import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setSession, getSession, getQuestState, setQuestState } from './gameState.js';
import { GameSession } from '../domain/aggregates/GameSession.js';
import { Player } from '../domain/entities/Player.js';
import { handleClaimQuest } from './handlersQuest.js';
import { notifyRefresh } from './refreshSignal.js';

vi.mock('../presentation/statsView.js', () => ({ updateStats: vi.fn() }));
vi.mock('../presentation/upgradeListView.js', () => ({ renderUpgradeList: vi.fn() }));
vi.mock('../presentation/questView.js', () => ({ renderQuestSection: vi.fn() }));
vi.mock('../presentation/toasts.js', () => ({
  showFloatingReward: vi.fn(),
  showQuestStreakToast: vi.fn(),
}));
vi.mock('./achievements.js', () => ({ checkAchievements: vi.fn() }));
vi.mock('./refreshSignal.js', () => ({ notifyRefresh: vi.fn() }));
vi.mock('./eventBus.js', () => ({ emit: vi.fn() }));

describe('handlersQuest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('document', { getElementById: () => null });
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    });
    const player = Player.create('p1');
    player.addCoins(200);
    setSession(new GameSession('s1', player));
  });

  it('claims quest when done and updates coins and quest state', () => {
    setQuestState({
      quest: { type: 'coins', target: 100, reward: 500, description: 'Reach 100 coins' },
    });
    const session = getSession();
    const player = session.player;
    const coinsBefore = player.coins.value.toNumber();

    handleClaimQuest();

    expect(player.coins.value.toNumber()).toBe(coinsBefore + 500);
    const state = getQuestState();
    expect(state.quest).not.toBeNull();
    expect(state.quest!.type).toBeDefined();
  });

  it('does not claim when quest is not done', () => {
    setQuestState({
      quest: { type: 'coins', target: 1_000_000, reward: 500, description: 'Reach 1M coins' },
    });
    const session = getSession();
    const player = session.player;
    const coinsBefore = player.coins.value.toNumber();

    handleClaimQuest();

    expect(player.coins.value.toNumber()).toBe(coinsBefore);
  });

  it('does not claim when no quest in state', () => {
    setQuestState({ quest: null });
    const session = getSession();
    const player = session.player;
    const coinsBefore = player.coins.value.toNumber();

    handleClaimQuest();

    expect(player.coins.value.toNumber()).toBe(coinsBefore);
  });

  it('claims production-type quest when target reached', () => {
    const session = getSession();
    const player = session.player;
    player.setProductionRate(player.productionRate.add(10));
    setQuestState({
      quest: { type: 'production', target: 5, reward: 200, description: 'Reach 5/s' },
    });
    const coinsBefore = player.coins.value.toNumber();

    handleClaimQuest();

    expect(player.coins.value.toNumber()).toBe(coinsBefore + 200);
    expect(getQuestState().quest).not.toBeNull();
  });

  it('calls notifyRefresh when claim succeeds', () => {
    setQuestState({
      quest: { type: 'coins', target: 100, reward: 500, description: 'Reach 100 coins' },
    });
    handleClaimQuest();
    expect(notifyRefresh).toHaveBeenCalled();
  });
});
