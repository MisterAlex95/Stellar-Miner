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
    expect(service.getNewPlanetCost(player).toNumber()).toBe(120000);
    player.addPlanet(Planet.create('planet-2', 'Nova Prime'));
    expect(service.getNewPlanetCost(player).toNumber()).toBe(216000);
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
    const raw = Math.floor(10000 * Math.pow(6, 1.3));
    expect(service.getAddSlotCost(planet).toNumber()).toBe(Math.floor(raw * 0.85));
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
    expect(service.getHousingCost(planet).toNumber()).toBe(5000);
    planet.addHousing();
    expect(service.getHousingCost(planet).toNumber()).toBe(6000);
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
});
