import { describe, it, expect } from 'vitest';
import { PlanetService } from './PlanetService.js';
import { Player } from '../entities/Player.js';
import { Planet } from '../entities/Planet.js';
import { Coins } from '../value-objects/Coins.js';
import { ProductionRate } from '../value-objects/ProductionRate.js';

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

  it('canBuyNewPlanet is true when player has enough coins', () => {
    const player = Player.create('p1');
    const cost = Math.floor(2500 * 2 * Math.pow(1.15, 1));
    player.addCoins(cost);
    const service = new PlanetService();
    expect(service.canBuyNewPlanet(player)).toBe(true);
  });

  it('canBuyNewPlanet is false when player cannot afford', () => {
    const player = Player.create('p1');
    player.addCoins(100);
    const service = new PlanetService();
    expect(service.canBuyNewPlanet(player)).toBe(false);
  });

  it('buyNewPlanet spends coins and adds planet', () => {
    const player = Player.create('p1');
    const cost = Math.floor(2500 * 2 * Math.pow(1.15, 1));
    player.addCoins(cost);
    const service = new PlanetService();
    const ok = service.buyNewPlanet(player);
    expect(ok).toBe(true);
    expect(player.coins.value).toBe(0);
    expect(player.planets).toHaveLength(2);
    expect(player.planets[1].id).toBe('planet-2');
    expect(player.planets[1].name).toBe('Nova Prime');
  });

  it('buyNewPlanet returns false when cannot afford', () => {
    const player = Player.create('p1');
    player.addCoins(100);
    const service = new PlanetService();
    const ok = service.buyNewPlanet(player);
    expect(ok).toBe(false);
    expect(player.coins.value).toBe(100);
    expect(player.planets).toHaveLength(1);
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
