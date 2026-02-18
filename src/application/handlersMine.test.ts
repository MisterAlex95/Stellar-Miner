import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setSession, getSession } from './gameState.js';
import { GameSession } from '../domain/aggregates/GameSession.js';
import { Player } from '../domain/entities/Player.js';
import { handleMineClick } from './handlersMine.js';
import { notifyRefresh } from './refreshSignal.js';
import { LAST_DAILY_BONUS_KEY } from './catalogs.js';

vi.mock('../presentation/upgradeList/upgradeList.js', () => ({ renderUpgradeList: vi.fn() }));
vi.mock('../presentation/toasts/toasts.js', () => ({
  showFloatingCoin: vi.fn(),
  showSuperLuckyToast: vi.fn(),
  showCriticalToast: vi.fn(),
  showDailyBonusToast: vi.fn(),
}));
vi.mock('./achievements.js', () => ({ checkAchievements: vi.fn(), incrementTotalClicksEver: vi.fn() }));
vi.mock('./milestones.js', () => ({ checkAndShowMilestones: vi.fn() }));
vi.mock('./refreshSignal.js', () => ({ notifyRefresh: vi.fn() }));
vi.mock('./research.js', () => ({ getResearchClickMultiplier: () => 1 }));
vi.mock('./quests.js', () => ({ getQuestProgress: () => null }));

describe('handlersMine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Math, 'random').mockReturnValue(1);
    const today = new Date().toISOString().slice(0, 10);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => (key === LAST_DAILY_BONUS_KEY ? today : null),
      setItem: () => {},
      removeItem: () => {},
    });
    const player = Player.create('p1');
    player.addCoins(0);
    setSession(new GameSession('s1', player));
  });

  const fakeEvent = { clientX: 0, clientY: 0 } as MouseEvent;

  it('handleMineClick increases player coins', () => {
    const session = getSession();
    const player = session.player;
    const before = player.coins.value.toNumber();

    handleMineClick(fakeEvent);

    expect(player.coins.value.toNumber()).toBeGreaterThan(before);
  });

  it('multiple mine clicks increase coins each time', () => {
    const session = getSession();
    const player = session.player;
    const before = player.coins.value.toNumber();

    handleMineClick(fakeEvent);
    handleMineClick(fakeEvent);
    handleMineClick(fakeEvent);

    expect(player.coins.value.toNumber()).toBeGreaterThan(before);
    expect(player.coins.value.toNumber()).toBeGreaterThanOrEqual(before + 3);
  });

  it('calls notifyRefresh after click', () => {
    handleMineClick(fakeEvent);
    expect(notifyRefresh).toHaveBeenCalled();
  });
});
