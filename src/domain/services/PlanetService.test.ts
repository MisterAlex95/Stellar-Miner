import { describe, it, expect } from 'vitest';
import { PlanetService } from './PlanetService.js';
import { Player } from '../entities/Player.js';
import { Planet } from '../entities/Planet.js';
import { Coins } from '../value-objects/Coins.js';
import { ProductionRate } from '../value-objects/ProductionRate.js';
import { getAstronautCost, generatePlanetName } from '../constants.js';

describe('PlanetService', () => {
  it('getNewPlanetCost returns cost for next planet (scales with current count)', () => {
    const player = Player.create('p1');
    const service = new PlanetService();
    expect(service.getNewPlanetCost(player).toNumber()).toBe(307200);
    player.addPlanet(Planet.create('planet-2', 'Nova Prime'));
    expect(service.getNewPlanetCost(player).toNumber()).toBe(589824);
  });

  it('canLaunchExpedition is true when player has enough coins and astronauts', () => {
    const player = Player.create('p1');
    const service = new PlanetService();
    const cost = service.getNewPlanetCost(player);
    const required = service.getExpeditionAstronautsRequired(player);
    player.addCoins(cost.add(getAstronautCost(0)).add(getAstronautCost(1)));
    player.hireAstronaut(getAstronautCost(0));
    player.hireAstronaut(getAstronautCost(1));
    expect(service.canLaunchExpedition(player)).toBe(true);
  });

  it('canLaunchExpedition is false when player cannot afford coins', () => {
    const player = Player.create('p1');
    player.addCoins(100);
    const service = new PlanetService();
    expect(service.canLaunchExpedition(player)).toBe(false);
  });

  it('canLaunchExpedition is false when not enough astronauts', () => {
    const player = Player.create('p1');
    const service = new PlanetService();
    const cost = service.getNewPlanetCost(player);
    player.addCoins(cost);
    expect(service.canLaunchExpedition(player)).toBe(false);
  });

  it('canLaunchExpedition is true with valid composition', () => {
    const player = Player.create('p1');
    const service = new PlanetService();
    const cost = service.getNewPlanetCost(player);
    const required = service.getExpeditionAstronautsRequired(player);
    player.addCoins(cost.add(getAstronautCost(0)).add(getAstronautCost(1)));
    player.hireAstronaut(getAstronautCost(0));
    player.hireAstronaut(getAstronautCost(1));
    const composition = { astronaut: required, miner: 0, scientist: 0, pilot: 0, medic: 0, engineer: 0 };
    expect(service.canLaunchExpedition(player, composition)).toBe(true);
  });

  it('canLaunchExpedition is false when composition sum does not match required', () => {
    const player = Player.create('p1');
    const service = new PlanetService();
    const cost = service.getNewPlanetCost(player);
    const required = service.getExpeditionAstronautsRequired(player);
    player.addCoins(cost.add(getAstronautCost(0)).add(getAstronautCost(1)));
    player.hireAstronaut(getAstronautCost(0));
    player.hireAstronaut(getAstronautCost(1));
    expect(service.canLaunchExpedition(player, { astronaut: required - 1, miner: 0, scientist: 0, pilot: 0, medic: 0, engineer: 0 })).toBe(
      false
    );
  });

  it('canLaunchExpedition is false when crew in composition exceeds player crew', () => {
    const player = Player.create('p1');
    const service = new PlanetService();
    const cost = service.getNewPlanetCost(player);
    const required = service.getExpeditionAstronautsRequired(player);
    player.addCoins(cost.add(getAstronautCost(0)));
    player.hireAstronaut(getAstronautCost(0));
    expect(service.canLaunchExpedition(player, { astronaut: required, miner: 0, scientist: 0, pilot: 0, medic: 0, engineer: 0 })).toBe(false);
  });

  it('startExpedition spends coins and crew and returns composition on success', () => {
    const player = Player.create('p1');
    const service = new PlanetService();
    const cost = service.getNewPlanetCost(player);
    const required = service.getExpeditionAstronautsRequired(player);
    player.addCoins(cost.add(getAstronautCost(0)).add(getAstronautCost(1)));
    player.hireAstronaut(getAstronautCost(0));
    player.hireAstronaut(getAstronautCost(1));
    const result = service.startExpedition(player);
    expect(result.started).toBe(true);
    if (result.started) {
      const total =
        (result.composition.astronaut ?? 0) +
        result.composition.miner +
        result.composition.scientist +
        result.composition.pilot +
        (result.composition.medic ?? 0) +
        (result.composition.engineer ?? 0);
      expect(total).toBe(required);
    }
    expect(player.planets).toHaveLength(1);
  });

  it('startExpedition returns started false when cannot afford', () => {
    const player = Player.create('p1');
    const service = new PlanetService();
    const result = service.startExpedition(player);
    expect(result.started).toBe(false);
  });

  it('completeExpedition rolls deaths and adds planet and veterans on success', () => {
    const player = Player.create('p1');
    const service = new PlanetService();
    const cost = service.getNewPlanetCost(player);
    const required = service.getExpeditionAstronautsRequired(player);
    player.addCoins(cost.add(getAstronautCost(0)).add(getAstronautCost(1)));
    player.hireAstronaut(getAstronautCost(0));
    player.hireAstronaut(getAstronautCost(1));
    const startResult = service.startExpedition(player);
    expect(startResult.started).toBe(true);
    const composition = startResult.started
      ? startResult.composition
      : { astronaut: required, miner: 0, scientist: 0, pilot: 0, medic: 0, engineer: 0 };
    const outcome = service.completeExpedition(player, composition, 'medium', () => 1);
    expect(outcome.success).toBe(true);
    expect(outcome.survivors).toBe(required);
    expect(player.planets).toHaveLength(2);
    expect(player.veteranCount).toBe(required);
  });

  it('getExpeditionDurationMs is shorter with more pilots', () => {
    const player = Player.create('p1');
    const service = new PlanetService();
    const base = service.getExpeditionDurationMs(player, 'medium', 0);
    const withOnePilot = service.getExpeditionDurationMs(player, 'medium', 1);
    const withSixPilots = service.getExpeditionDurationMs(player, 'medium', 6);
    expect(withOnePilot).toBeLessThan(base);
    expect(withSixPilots).toBeLessThanOrEqual(withOnePilot);
    expect(withSixPilots).toBeGreaterThanOrEqual(1000);
  });

  it('launchExpedition with composition object uses given composition', () => {
    const player = Player.create('p1');
    const service = new PlanetService();
    const cost = service.getNewPlanetCost(player);
    const required = service.getExpeditionAstronautsRequired(player);
    player.addCoins(cost.add(getAstronautCost(0)).add(getAstronautCost(1)));
    player.hireAstronaut(getAstronautCost(0));
    player.hireAstronaut(getAstronautCost(1));
    const composition = { astronaut: required, miner: 0, scientist: 0, pilot: 0, medic: 0, engineer: 0 };
    const outcome = service.launchExpedition(player, composition, () => 1);
    expect(outcome.success).toBe(true);
    expect(player.planets).toHaveLength(2);
  });

  it('launchExpedition spends coins and astronauts; on success adds planet and returns survivors', () => {
    const player = Player.create('p1');
    const service = new PlanetService();
    const cost = service.getNewPlanetCost(player);
    const required = service.getExpeditionAstronautsRequired(player);
    player.addCoins(cost.add(getAstronautCost(0)).add(getAstronautCost(1)));
    player.hireAstronaut(getAstronautCost(0));
    player.hireAstronaut(getAstronautCost(1));
    const noDeathRoll = () => 1;
    const outcome = service.launchExpedition(player, noDeathRoll);
    expect(outcome.success).toBe(true);
    expect(outcome.survivors).toBe(required);
    expect(outcome.deaths).toBe(0);
    expect(player.coins.value.toNumber()).toBe(0);
    expect(player.planets).toHaveLength(2);
    expect(player.planets[1].name).toBe(generatePlanetName('planet-2'));
    expect(player.veteranCount).toBe(required);
    expect(player.astronautCount).toBe(0);
  });

  it('launchExpedition returns failure when not enough astronauts', () => {
    const player = Player.create('p1');
    const service = new PlanetService();
    const cost = service.getNewPlanetCost(player);
    player.addCoins(cost);
    const outcome = service.launchExpedition(player);
    expect(outcome.success).toBe(false);
    expect(outcome.survivors).toBe(0);
  });

  it('launchExpedition when all die: no planet, no astronauts back', () => {
    const player = Player.create('p1');
    const service = new PlanetService();
    const cost = service.getNewPlanetCost(player);
    const required = service.getExpeditionAstronautsRequired(player);
    player.addCoins(cost.add(getAstronautCost(0)).add(getAstronautCost(1)));
    player.hireAstronaut(getAstronautCost(0));
    player.hireAstronaut(getAstronautCost(1));
    const allDeathRoll = () => 0;
    const outcome = service.launchExpedition(player, allDeathRoll);
    expect(outcome.success).toBe(false);
    expect(outcome.survivors).toBe(0);
    expect(outcome.deaths).toBe(required);
    expect(player.planets).toHaveLength(1);
    expect(player.astronautCount).toBe(0);
  });

  it('canBuyNewPlanet (deprecated) matches canLaunchExpedition', () => {
    const player = Player.create('p1');
    const service = new PlanetService();
    expect(service.canBuyNewPlanet(player)).toBe(false);
    const cost = service.getNewPlanetCost(player);
    player.addCoins(cost.add(getAstronautCost(0)).add(getAstronautCost(1)));
    player.hireAstronaut(getAstronautCost(0));
    player.hireAstronaut(getAstronautCost(1));
    expect(service.canBuyNewPlanet(player)).toBe(true);
  });

  it('buyNewPlanet (deprecated) spends coins and adds planet when enough astronauts', () => {
    const player = Player.create('p1');
    const service = new PlanetService();
    const cost = service.getNewPlanetCost(player);
    player.addCoins(cost.add(getAstronautCost(0)).add(getAstronautCost(1)));
    player.hireAstronaut(getAstronautCost(0));
    player.hireAstronaut(getAstronautCost(1));
    const ok = service.buyNewPlanet(player);
    expect(ok).toBe(true);
    expect(player.planets).toHaveLength(2);
    expect(player.planets[1].id).toBe('planet-2');
    expect(player.planets[1].name).toBe(generatePlanetName('planet-2'));
  });

  it('getAddSlotCost returns cost for planet max slots', () => {
    const service = new PlanetService();
    const planet = Planet.create('p1', 'Titan', 6);
    const raw = Math.floor(25000 * Math.pow(6, 1.48));
    expect(service.getAddSlotCost(planet).toNumber()).toBe(Math.floor(raw * 0.82));
  });

  it('canAddSlot is true when player can afford', () => {
    const player = Player.create('p1');
    const planet = player.planets[0];
    const cost = new PlanetService().getAddSlotCost(planet);
    player.addCoins(cost);
    const service = new PlanetService();
    expect(service.canAddSlot(player, planet)).toBe(true);
  });

  it('addSlot spends coins and adds slot to planet', () => {
    const player = Player.create('p1');
    const planet = player.planets[0];
    const service = new PlanetService();
    const cost = service.getAddSlotCost(planet);
    player.addCoins(cost);
    const ok = service.addSlot(player, planet);
    expect(ok).toBe(true);
    expect(planet.maxUpgrades).toBe(7);
    expect(player.coins.value.toNumber()).toBe(0);
  });

  it('addSlot returns false when cannot afford', () => {
    const player = Player.create('p1');
    const planet = player.planets[0];
    const service = new PlanetService();
    const ok = service.addSlot(player, planet);
    expect(ok).toBe(false);
    expect(planet.maxUpgrades).toBe(6);
  });

  it('getHousingCost returns cost for planet housing count', () => {
    const service = new PlanetService();
    const planet = Planet.create('p1', 'Titan', 6);
    expect(service.getHousingCost(planet).toNumber()).toBe(12000);
    planet.addHousing();
    expect(service.getHousingCost(planet).toNumber()).toBe(15120);
  });

  it('canBuildHousing is true when planet has free slot and player can afford', () => {
    const player = Player.create('p1');
    const planet = player.planets[0];
    const service = new PlanetService();
    const cost = service.getHousingCost(planet);
    player.addCoins(cost);
    expect(service.canBuildHousing(player, planet)).toBe(true);
  });

  it('buildHousing spends coins and adds housing', () => {
    const player = Player.create('p1');
    const planet = player.planets[0];
    const service = new PlanetService();
    const cost = service.getHousingCost(planet);
    player.addCoins(cost);
    const ok = service.buildHousing(player, planet);
    expect(ok).toBe(true);
    expect(planet.housingCount).toBe(1);
    expect(player.coins.value.toNumber()).toBe(0);
  });

  it('buildHousing returns false when cannot afford', () => {
    const player = Player.create('p1');
    const planet = player.planets[0];
    const service = new PlanetService();
    const ok = service.buildHousing(player, planet);
    expect(ok).toBe(false);
    expect(planet.housingCount).toBe(0);
  });

  it('canBuildHousing uses hasFreeSlot callback when provided', () => {
    const player = Player.create('p1');
    const planet = player.planets[0];
    const service = new PlanetService();
    const cost = service.getHousingCost(planet);
    player.addCoins(cost);
    expect(service.canBuildHousing(player, planet, () => true)).toBe(true);
    expect(service.canBuildHousing(player, planet, () => false)).toBe(false);
  });

  it('buildHousing uses hasFreeSlot callback when provided', () => {
    const player = Player.create('p1');
    const planet = player.planets[0];
    const service = new PlanetService();
    const cost = service.getHousingCost(planet);
    player.addCoins(cost);
    const ok = service.buildHousing(player, planet, () => true);
    expect(ok).toBe(true);
    expect(planet.housingCount).toBe(1);
  });
});
