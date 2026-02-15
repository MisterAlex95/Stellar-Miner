import { describe, it, expect } from 'vitest';
import { PlanetService } from './PlanetService.js';
import { Player } from '../entities/Player.js';
import { Planet } from '../entities/Planet.js';
import { Coins } from '../value-objects/Coins.js';
import { ProductionRate } from '../value-objects/ProductionRate.js';
import { getAstronautCost } from '../constants.js';

describe('PlanetService', () => {
  it('getNewPlanetCost returns cost for next planet (scales with current count)', () => {
    const player = Player.create('p1');
    const service = new PlanetService();
    const cost1 = Math.floor(2500 * 2 * Math.pow(1.15, 1));
    expect(service.getNewPlanetCost(player)).toBe(cost1);
    player.addPlanet(Planet.create('planet-2', 'Nova Prime'));
    const cost2 = Math.floor(2500 * 3 * Math.pow(1.15, 2));
    expect(service.getNewPlanetCost(player)).toBe(cost2);
  });

  it('canLaunchExpedition is true when player has enough coins and astronauts', () => {
    const player = Player.create('p1');
    const service = new PlanetService();
    const cost = service.getNewPlanetCost(player);
    const required = service.getExpeditionAstronautsRequired(player);
    player.addCoins(cost + getAstronautCost(0) + getAstronautCost(1));
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
    player.addCoins(cost + getAstronautCost(0) + getAstronautCost(1));
    player.hireAstronaut(getAstronautCost(0));
    player.hireAstronaut(getAstronautCost(1));
    const noDeathRoll = () => 1;
    const outcome = service.launchExpedition(player, noDeathRoll);
    expect(outcome.success).toBe(true);
    expect(outcome.survivors).toBe(required);
    expect(outcome.deaths).toBe(0);
    expect(player.coins.value).toBe(0);
    expect(player.planets).toHaveLength(2);
    expect(player.planets[1].name).toBe('Nova Prime');
    expect(player.astronautCount).toBe(required);
  });

  it('launchExpedition when all die: no planet, no astronauts back', () => {
    const player = Player.create('p1');
    const service = new PlanetService();
    const cost = service.getNewPlanetCost(player);
    const required = service.getExpeditionAstronautsRequired(player);
    player.addCoins(cost + getAstronautCost(0) + getAstronautCost(1));
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

  it('buyNewPlanet (deprecated) spends coins and adds planet when enough astronauts', () => {
    const player = Player.create('p1');
    const service = new PlanetService();
    const cost = service.getNewPlanetCost(player);
    player.addCoins(cost + getAstronautCost(0) + getAstronautCost(1));
    player.hireAstronaut(getAstronautCost(0));
    player.hireAstronaut(getAstronautCost(1));
    const ok = service.buyNewPlanet(player);
    expect(ok).toBe(true);
    expect(player.planets).toHaveLength(2);
    expect(player.planets[1].id).toBe('planet-2');
    expect(player.planets[1].name).toBe('Nova Prime');
  });

  it('getAddSlotCost returns cost for planet max slots', () => {
    const service = new PlanetService();
    const planet = Planet.create('p1', 'Titan', 6);
    const raw = Math.floor(150 * Math.pow(6, 1.25));
    expect(service.getAddSlotCost(planet)).toBe(Math.floor(raw * 0.85));
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
    expect(player.coins.value).toBe(0);
  });

  it('addSlot returns false when cannot afford', () => {
    const player = Player.create('p1');
    const planet = player.planets[0];
    const service = new PlanetService();
    const ok = service.addSlot(player, planet);
    expect(ok).toBe(false);
    expect(planet.maxUpgrades).toBe(6);
  });
});
