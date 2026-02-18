import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setSession, getSession } from './gameState.js';
import { GameSession } from '../domain/aggregates/GameSession.js';
import { Player } from '../domain/entities/Player.js';
import { handleUpgradeBuy, handleUpgradeBuyMax } from './handlersUpgrade.js';
import { completeUpgradeInstallations } from './upgradeInstallation.js';
/** Generous delay so all upgrades (variable duration by tier/cost) finish in tests. Must exceed gameConfig install formula (e.g. drill-mk1 ~25s). */
const INSTALL_WAIT_MS = 60_000;

vi.mock('../presentation/lib/upgradeList.js', () => ({
  renderUpgradeList: vi.fn(),
}));
vi.mock('../presentation/toasts/index.js', () => ({ showMiniMilestoneToast: vi.fn() }));
vi.mock('./achievements.js', () => ({ checkAchievements: vi.fn() }));
vi.mock('./handlersSave.js', () => ({ saveSession: vi.fn() }));
vi.mock('./eventBus.js', () => ({ emit: vi.fn() }));

describe('handlersUpgrade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const player = Player.create('p1');
    setSession(new GameSession('s1', player));
  });

  describe('handleUpgradeBuy', () => {
    it('purchases mining-robot (no slot, no crew) and updates player', () => {
      const session = getSession();
      const player = session.player;
      player.addCoins(100);
      const beforeCoins = player.coins.value.toNumber();
      const beforeCount = player.upgrades.filter((u) => u.id === 'mining-robot').length;

      handleUpgradeBuy('mining-robot');
      completeUpgradeInstallations(session, Date.now() + INSTALL_WAIT_MS);

      expect(player.upgrades.filter((u) => u.id === 'mining-robot').length).toBe(beforeCount + 1);
      expect(player.coins.value.toNumber()).toBe(beforeCoins - 60);
    });

    it('purchases drill-mk1 when player has coins and planet has slot (tier 2 needs no crew)', () => {
      const session = getSession();
      const player = session.player;
      player.addCoins(2000);
      const beforeCount = player.upgrades.filter((u) => u.id === 'drill-mk1').length;

      handleUpgradeBuy('drill-mk1');
      completeUpgradeInstallations(session, Date.now() + INSTALL_WAIT_MS);

      expect(player.upgrades.filter((u) => u.id === 'drill-mk1').length).toBe(beforeCount + 1);
      expect(player.crewAssignedToEquipment).toBe(0);
    });

    it('does not purchase when insufficient coins', () => {
      const session = getSession();
      const player = session.player;
      player.addCoins(10);
      const beforeCount = player.upgrades.length;

      handleUpgradeBuy('mining-robot');

      expect(player.upgrades.length).toBe(beforeCount);
      expect(player.coins.value.toNumber()).toBe(10);
    });

    it('does not purchase when no crew for upgrade that requires it', () => {
      const session = getSession();
      const player = session.player;
      player.addCoins(50000);
      expect(player.astronautCount).toBe(0);

      handleUpgradeBuy('drill-mk2');

      expect(player.upgrades.filter((u) => u.id === 'drill-mk2').length).toBe(0);
      expect(player.coins.value.toNumber()).toBe(50000);
    });

    it('does not purchase when no free slot for slot-using upgrade', () => {
      const session = getSession();
      const player = session.player;
      const planet = player.planets[0];
      while (planet.usedSlots < planet.maxUpgrades) {
        player.addCoins(10000);
        handleUpgradeBuy('drill-mk1');
      }
      const coinsBefore = player.coins.value.toNumber();
      player.addCoins(10000);

      handleUpgradeBuy('drill-mk1');

      expect(player.coins.value.toNumber()).toBe(coinsBefore + 10000);
    });
  });

  describe('handleUpgradeBuyMax', () => {
    it('buys multiple mining-robots when coins allow', () => {
      const session = getSession();
      const player = session.player;
      player.addCoins(500);
      const beforeCount = player.upgrades.filter((u) => u.id === 'mining-robot').length;

      handleUpgradeBuyMax('mining-robot');
      completeUpgradeInstallations(session, Date.now() + INSTALL_WAIT_MS);

      const afterCount = player.upgrades.filter((u) => u.id === 'mining-robot').length;
      expect(afterCount).toBeGreaterThan(beforeCount);
      expect(afterCount).toBeGreaterThanOrEqual(2);
    });

    it('buys up to slot limit for slot-using upgrade', () => {
      const session = getSession();
      const player = session.player;
      const slots = player.planets[0].maxUpgrades;
      player.addCoins(1_000_000);
      player.addAstronauts(slots * 2);

      handleUpgradeBuyMax('drill-mk1');
      completeUpgradeInstallations(session, Date.now() + INSTALL_WAIT_MS);

      const drillCount = player.upgrades.filter((u) => u.id === 'drill-mk1').length;
      expect(drillCount).toBeGreaterThan(0);
      expect(drillCount).toBeLessThanOrEqual(slots);
    });

    it('buys zero when cannot afford first', () => {
      const session = getSession();
      const player = session.player;
      player.addCoins(10);
      const beforeCount = player.upgrades.filter((u) => u.id === 'mining-robot').length;

      handleUpgradeBuyMax('mining-robot');

      expect(player.upgrades.filter((u) => u.id === 'mining-robot').length).toBe(beforeCount);
    });
  });
});
