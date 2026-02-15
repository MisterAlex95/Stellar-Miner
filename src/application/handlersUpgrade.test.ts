import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setSession, getSession, upgradeService } from './gameState.js';
import { GameSession } from '../domain/aggregates/GameSession.js';
import { Player } from '../domain/entities/Player.js';
import { handleUpgradeBuy, handleUpgradeBuyMax } from './handlersUpgrade.js';
import { UPGRADE_CATALOG } from './catalogs.js';

vi.mock('../presentation/statsView.js', () => ({ updateStats: vi.fn() }));
vi.mock('../presentation/upgradeListView.js', () => ({
  renderUpgradeList: vi.fn(),
  flashUpgradeCard: vi.fn(),
}));
vi.mock('../presentation/planetListView.js', () => ({ renderPlanetList: vi.fn() }));
vi.mock('../presentation/crewView.js', () => ({ renderCrewSection: vi.fn() }));
vi.mock('../presentation/questView.js', () => ({ renderQuestSection: vi.fn() }));
vi.mock('../presentation/toasts.js', () => ({ showMiniMilestoneToast: vi.fn() }));
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

      expect(player.upgrades.filter((u) => u.id === 'mining-robot').length).toBe(beforeCount + 1);
      expect(player.coins.value.toNumber()).toBe(beforeCoins - 45);
    });

    it('purchases drill-mk1 when player has coins and crew and planet has slot', () => {
      const session = getSession();
      const player = session.player;
      player.addCoins(2000);
      player.addAstronauts(2);
      const beforeCount = player.upgrades.filter((u) => u.id === 'drill-mk1').length;

      handleUpgradeBuy('drill-mk1');

      expect(player.upgrades.filter((u) => u.id === 'drill-mk1').length).toBe(beforeCount + 1);
      expect(player.freeCrewCount).toBe(2);
      expect(player.crewAssignedToEquipment).toBe(1);
      expect(player.astronautCount).toBe(3);
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
      player.addCoins(2000);
      expect(player.astronautCount).toBe(0);

      handleUpgradeBuy('drill-mk1');

      expect(player.upgrades.filter((u) => u.id === 'drill-mk1').length).toBe(0);
      expect(player.coins.value.toNumber()).toBe(2000);
    });

    it('does not purchase when no free slot for slot-using upgrade', () => {
      const session = getSession();
      const player = session.player;
      const planet = player.planets[0];
      while (planet.usedSlots < planet.maxUpgrades) {
        player.addCoins(10000);
        player.addAstronauts(1);
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
