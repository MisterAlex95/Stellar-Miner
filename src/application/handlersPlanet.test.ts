import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  setSession,
  getSession,
  getExpeditionEndsAt,
  getExpeditionComposition,
  setExpeditionInProgress,
  clearExpedition,
  planetService,
} from './gameState.js';
import { GameSession } from '../domain/aggregates/GameSession.js';
import { Player } from '../domain/entities/Player.js';
import {
  handleBuyNewPlanet,
  completeExpeditionIfDue,
  handleAddSlot,
  handleHireAstronaut,
  handleBuildHousing,
} from './handlersPlanet.js';
import { getNewPlanetCost } from '../domain/constants.js';

vi.mock('../presentation/statsView.js', () => ({ updateStats: vi.fn() }));
vi.mock('../presentation/upgradeListView.js', () => ({ renderUpgradeList: vi.fn() }));
vi.mock('../presentation/planetListView.js', () => ({ renderPlanetList: vi.fn() }));
vi.mock('../presentation/crewView.js', () => ({ renderCrewSection: vi.fn() }));
vi.mock('../presentation/toasts.js', () => ({ showMiniMilestoneToast: vi.fn() }));
vi.mock('./achievements.js', () => ({ checkAchievements: vi.fn() }));
vi.mock('./handlersSave.js', () => ({ saveSession: vi.fn() }));
vi.mock('./eventBus.js', () => ({ emit: vi.fn() }));
vi.mock('./research.js', () => ({ hasEffectiveFreeSlot: (p: { hasFreeSlot: () => boolean }) => p.hasFreeSlot() }));

describe('handlersPlanet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearExpedition();
    const player = Player.create('p1');
    setSession(new GameSession('s1', player));
  });

  describe('handleBuyNewPlanet', () => {
    it('does not start expedition when insufficient crew', () => {
      const session = getSession();
      const player = session.player;
      const cost = getNewPlanetCost(player.planets.length);
      player.addCoins(cost.toNumber() + 10000);
      player.addAstronauts(1, 'miner');

      handleBuyNewPlanet();

      expect(getExpeditionEndsAt()).toBeNull();
    });

    it('starts expedition when player has enough coins and crew', () => {
      const session = getSession();
      const player = session.player;
      const cost = getNewPlanetCost(player.planets.length);
      player.addCoins(cost.toNumber() + 1000);
      player.addAstronauts(2, 'miner');
      expect(getExpeditionEndsAt()).toBeNull();

      handleBuyNewPlanet();

      expect(getExpeditionEndsAt()).not.toBeNull();
    });

    it('does not start expedition when insufficient coins', () => {
      const session = getSession();
      const player = session.player;
      const cost = getNewPlanetCost(player.planets.length);
      player.addCoins(cost.toNumber() - 1000);
      player.addAstronauts(2, 'miner');

      handleBuyNewPlanet();

      expect(getExpeditionEndsAt()).toBeNull();
    });
  });

  describe('completeExpeditionIfDue', () => {
    it('adds planet when expedition time has elapsed and roll allows success', () => {
      const session = getSession();
      const player = session.player;
      const cost = getNewPlanetCost(player.planets.length);
      player.addCoins(cost.toNumber() + 10000);
      player.addAstronauts(3, 'miner');
      handleBuyNewPlanet();
      const composition = getExpeditionComposition();
      expect(composition).not.toBeNull();
      setExpeditionInProgress(Date.now() - 1, composition!, 1);
      vi.spyOn(Math, 'random').mockReturnValue(1);

      completeExpeditionIfDue();

      expect(player.planets.length).toBe(2);
      expect(getExpeditionEndsAt()).toBeNull();
    });

    it('does nothing when expedition not yet due', () => {
      const session = getSession();
      const player = session.player;
      const cost = getNewPlanetCost(player.planets.length);
      player.addCoins(cost.toNumber() + 10000);
      player.addAstronauts(3, 'miner');
      handleBuyNewPlanet();
      expect(getExpeditionEndsAt()).not.toBeNull();
      const planetCountBefore = player.planets.length;

      completeExpeditionIfDue();

      expect(player.planets.length).toBe(planetCountBefore);
    });
  });

  describe('handleAddSlot', () => {
    it('does nothing when planet id does not exist', () => {
      const session = getSession();
      const player = session.player;
      const planet = player.planets[0];
      player.addCoins(100000);
      const beforeSlots = planet.maxUpgrades;

      handleAddSlot('nonexistent-planet');

      expect(planet.maxUpgrades).toBe(beforeSlots);
    });

    it('adds slot and spends coins when player can afford it', () => {
      const session = getSession();
      const player = session.player;
      const planet = player.planets[0];
      const cost = planetService.getAddSlotCost(planet);
      player.addCoins(cost.toNumber() + 5000);
      const beforeSlots = planet.maxUpgrades;

      handleAddSlot(planet.id);

      expect(planet.maxUpgrades).toBe(beforeSlots + 1);
      expect(player.coins.value.toNumber()).toBeLessThanOrEqual(5000);
    });
  });

  describe('handleHireAstronaut', () => {
    it('does not hire when at max crew capacity', () => {
      const session = getSession();
      const player = session.player;
      player.addCoins(100000);
      const maxCrew = 2;
      for (let i = 0; i < maxCrew; i++) handleHireAstronaut('miner');
      expect(player.astronautCount).toBe(maxCrew);

      handleHireAstronaut('miner');

      expect(player.astronautCount).toBe(maxCrew);
    });

    it('increases astronaut count when player can afford and has capacity', () => {
      const session = getSession();
      const player = session.player;
      player.addCoins(2000);
      expect(player.astronautCount).toBe(0);

      handleHireAstronaut('miner');

      expect(player.astronautCount).toBe(1);
    });

    it('does not hire when insufficient coins', () => {
      const session = getSession();
      const player = session.player;
      player.addCoins(100);

      handleHireAstronaut('miner');

      expect(player.astronautCount).toBe(0);
    });
  });

  describe('handleBuildHousing', () => {
    it('does nothing when planet id does not exist', () => {
      const session = getSession();
      const player = session.player;
      const planet = player.planets[0];
      player.addCoins(100000);
      const before = planet.housingCount;

      handleBuildHousing('nonexistent');

      expect(planet.housingCount).toBe(before);
    });

    it('builds housing when planet has free slot and player can afford', () => {
      const session = getSession();
      const player = session.player;
      const planet = player.planets[0];
      const cost = planetService.getHousingCost(planet);
      player.addCoins(cost.toNumber() + 5000);
      const beforeHousing = planet.housingCount;

      handleBuildHousing(planet.id);

      expect(planet.housingCount).toBe(beforeHousing + 1);
    });
  });
});
