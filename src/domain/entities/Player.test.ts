import { describe, it, expect } from 'vitest';
import { Player } from './Player.js';
import { Planet } from './Planet.js';
import { Coins } from '../value-objects/Coins.js';
import { ProductionRate } from '../value-objects/ProductionRate.js';
import { Upgrade } from './Upgrade.js';
import { UpgradeEffect } from '../value-objects/UpgradeEffect.js';
import { Artifact } from './Artifact.js';

describe('Player', () => {
  it('create returns new player with default state', () => {
    const p = Player.create('player-1');
    expect(p.id).toBe('player-1');
    expect(p.coins.value.toNumber()).toBe(0);
    expect(p.productionRate.value.toNumber()).toBe(0);
    expect(p.upgrades).toEqual([]);
    expect(p.planets).toHaveLength(1);
    expect(p.planets[0].name).toMatch(/^\S+ \S+$/);
    expect(p.planets[0].id).toBe('planet-1');
    expect(p.artifacts).toEqual([]);
    expect(p.prestigeLevel).toBe(0);
    expect(p.totalCoinsEver.toNumber()).toBe(0);
  });

  it('addCoins mutates coins', () => {
    const p = Player.create('player-1');
    p.addCoins(50);
    expect(p.coins.value.toNumber()).toBe(50);
    p.addCoins(25);
    expect(p.coins.value.toNumber()).toBe(75);
  });

  it('spendCoins subtracts from coins', () => {
    const p = Player.create('player-1');
    p.addCoins(100);
    p.spendCoins(30);
    expect(p.coins.value.toNumber()).toBe(70);
  });

  it('spendCoins throws when insufficient', () => {
    const p = Player.create('player-1');
    p.addCoins(10);
    expect(() => p.spendCoins(20)).toThrow('Insufficient coins');
  });

  it('setProductionRate updates rate', () => {
    const p = Player.create('player-1');
    p.setProductionRate(new ProductionRate(5));
    expect(p.productionRate.value.toNumber()).toBe(5);
  });

  it('addUpgrade on planet pushes upgrade to list', () => {
    const p = Player.create('player-1');
    const u = new Upgrade('drill', 'Drill', 100, new UpgradeEffect(5));
    p.planets[0].addUpgrade(u);
    expect(p.upgrades).toHaveLength(1);
    expect(p.upgrades[0].id).toBe('drill');
    p.planets[0].addUpgrade(new Upgrade('drill2', 'Drill 2', 100, new UpgradeEffect(5)));
    expect(p.upgrades).toHaveLength(2);
  });

  it('getPlanetWithFreeSlot returns planet with free slot', () => {
    const p = Player.create('player-1');
    expect(p.getPlanetWithFreeSlot()).toBe(p.planets[0]);
    const slots = p.planets[0].maxUpgrades;
    for (let i = 0; i < slots; i++) {
      p.planets[0].addUpgrade(new Upgrade(`u${i}`, `U${i}`, 1, new UpgradeEffect(0)));
    }
    expect(p.getPlanetWithFreeSlot()).toBeNull();
  });

  it('constructor copies planets array', () => {
    const planet = new Planet('p1', 'Planet 1', 6, [new Upgrade('a', 'A', 1, new UpgradeEffect(1))]);
    const planets = [planet];
    const p = new Player(
      'id',
      new Coins(0),
      new ProductionRate(0),
      planets,
      [],
      0,
      0
    );
    expect(p.upgrades).toHaveLength(1);
    planets.push(new Planet('p2', 'Planet 2', 5, []));
    expect(p.planets).toHaveLength(1);
  });

  it('constructor uses empty planets when given null or undefined', () => {
    const p = new Player(
      'id',
      new Coins(0),
      new ProductionRate(0),
      undefined as unknown as Planet[],
      [],
      0,
      0
    );
    expect(p.planets).toEqual([]);
    expect(p.upgrades).toEqual([]);
  });

  it('addPlanet appends planet', () => {
    const p = Player.create('p1');
    const second = Planet.create('planet-2', 'Nova Prime');
    expect(p.planets).toHaveLength(1);
    p.addPlanet(second);
    expect(p.planets).toHaveLength(2);
    expect(p.planets[1]).toBe(second);
  });

  it('getPlanetsWithFreeSlot returns all planets with free slot', () => {
    const p = Player.create('p1');
    p.addPlanet(Planet.create('planet-2', 'Nova Prime', 4));
    const withSlots = p.getPlanetsWithFreeSlot();
    expect(withSlots).toHaveLength(2);
    expect(withSlots).toContain(p.planets[0]);
    expect(withSlots).toContain(p.planets[1]);
  });

  it('getPlanetsWithFreeSlot returns empty when no planet has free slot', () => {
    const p = Player.create('p1');
    const slots = p.planets[0].maxUpgrades;
    for (let i = 0; i < slots; i++) {
      p.planets[0].addUpgrade(new Upgrade(`u${i}`, `U${i}`, 1, new UpgradeEffect(0)));
    }
    expect(p.getPlanetsWithFreeSlot()).toEqual([]);
  });

  it('effectiveProductionRate applies planet bonus for multiple planets', () => {
    const p = Player.create('p1');
    p.setProductionRate(new ProductionRate(100));
    expect(p.effectiveProductionRate.toNumber()).toBe(100);
    p.addPlanet(Planet.create('planet-2', 'Nova Prime'));
    expect(p.effectiveProductionRate.toNumber()).toBe(104);
    p.addPlanet(Planet.create('planet-3', 'Dust Haven'));
    expect(p.effectiveProductionRate.toNumber()).toBeCloseTo(108, 10);
  });

  it('effectiveProductionRate applies prestige bonus', () => {
    const p = new Player(
      'p1',
      new Coins(0),
      new ProductionRate(100),
      [Planet.create('planet-1', 'Titan')],
      [],
      2,
      0
    );
    expect(p.effectiveProductionRate.toNumber()).toBeCloseTo(100 * (1 + 2 * 0.07), 10);
  });

  it('createAfterPrestige resets to one empty planet and increments prestige', () => {
    const p = Player.create('p1');
    p.addCoins(500);
    p.setProductionRate(new ProductionRate(10));
    p.planets[0].addUpgrade(new Upgrade('u', 'U', 1, new UpgradeEffect(1)));
    const after = Player.createAfterPrestige(p, p.planets.length, 0);
    expect(after.coins.value.toNumber()).toBe(0);
    expect(after.productionRate.value.toNumber()).toBe(0);
    expect(after.planets).toHaveLength(1);
    expect(after.planets[0].upgrades).toHaveLength(0);
    expect(after.prestigeLevel).toBe(1);
    expect(after.totalCoinsEver.eq(p.totalCoinsEver)).toBe(true);
  });

  it('effectiveProductionRate applies overcrowding malus when crew exceeds cap', () => {
    const p = new Player(
      'p1',
      new Coins(0),
      new ProductionRate(100),
      [Planet.create('planet-1', 'Titan')],
      [],
      0,
      0,
      { astronaut: 20, miner: 0, scientist: 0, pilot: 0, medic: 0, engineer: 0 },
      0,
      0
    );
    const rate = p.effectiveProductionRate.toNumber();
    expect(rate).toBeLessThan(100);
  });

  it('effectiveProductionRate applies crew (miner) bonus', () => {
    const p = new Player(
      'p1',
      new Coins(0),
      new ProductionRate(100),
      [Planet.create('planet-1', 'Titan')],
      [],
      0,
      0,
      { astronaut: 0, miner: 10, scientist: 0, pilot: 0, medic: 0, engineer: 0 },
      0
    );
    expect(p.effectiveProductionRate.toNumber()).toBeCloseTo(110.92, 2);
  });

  it('hireAstronaut returns false when not enough coins', () => {
    const p = Player.create('p1');
    p.addCoins(50);
    const ok = p.hireAstronaut(100);
    expect(ok).toBe(false);
    expect(p.coins.value.toNumber()).toBe(50);
    expect(p.astronautCount).toBe(0);
  });

  it('hireAstronaut spends coins and increments astronautCount when affordable', () => {
    const p = Player.create('p1');
    p.addCoins(200);
    const ok = p.hireAstronaut(100);
    expect(ok).toBe(true);
    expect(p.coins.value.toNumber()).toBe(100);
    expect(p.astronautCount).toBe(1);
    p.hireAstronaut(50);
    expect(p.astronautCount).toBe(2);
  });

  it('spendAstronauts returns true when count is 0 or negative', () => {
    const p = Player.create('p1');
    expect(p.spendAstronauts(0)).toBe(true);
    expect(p.spendAstronauts(-1)).toBe(true);
  });

  it('spendAstronauts returns false when not enough crew', () => {
    const p = new Player(
      'p1',
      new Coins(0),
      new ProductionRate(0),
      [Planet.create('planet-1', 'Titan')],
      [],
      0,
      0,
      2
    );
    expect(p.spendAstronauts(3)).toBe(false);
    expect(p.astronautCount).toBe(2);
  });

  it('spendAstronauts decrements astronautCount when enough crew', () => {
    const p = new Player(
      'p1',
      new Coins(0),
      new ProductionRate(0),
      [Planet.create('planet-1', 'Titan')],
      [],
      0,
      0,
      5
    );
    expect(p.spendAstronauts(2)).toBe(true);
    expect(p.astronautCount).toBe(3);
    expect(p.spendAstronauts(3)).toBe(true);
    expect(p.astronautCount).toBe(0);
  });

  it('addAstronauts adds count (e.g. expedition survivors)', () => {
    const p = new Player(
      'p1',
      new Coins(0),
      new ProductionRate(0),
      [Planet.create('planet-1', 'Titan')],
      [],
      0,
      0,
      2
    );
    p.addAstronauts(3);
    expect(p.astronautCount).toBe(5);
    p.addAstronauts(0);
    expect(p.astronautCount).toBe(5);
  });

  it('assignCrewToEquipment uses only astronauts and deducts from astronaut pool', () => {
    const p = new Player(
      'p1',
      new Coins(0),
      new ProductionRate(0),
      [Planet.create('planet-1', 'Titan')],
      [],
      0,
      0,
      3
    );
    expect(p.freeAstronautCount).toBe(3);
    expect(p.assignCrewToEquipment(0)).toBe(true);
    expect(p.assignCrewToEquipment(2)).toBe(true);
    expect(p.crewAssignedToEquipment).toBe(2);
    expect(p.freeAstronautCount).toBe(1);
    expect(p.crewByRole.astronaut).toBe(1);
    expect(p.assignCrewToEquipment(5)).toBe(false);
  });

  it('unassignCrewFromEquipment decreases assigned and by default returns crew to astronaut pool', () => {
    const p = new Player(
      'p1',
      new Coins(0),
      new ProductionRate(0),
      [Planet.create('planet-1', 'Titan')],
      [],
      0,
      0,
      { astronaut: 0, miner: 0, scientist: 0, pilot: 0, medic: 0, engineer: 0 },
      0,
      4
    );
    p.unassignCrewFromEquipment(0);
    expect(p.crewAssignedToEquipment).toBe(4);
    p.unassignCrewFromEquipment(2);
    expect(p.crewAssignedToEquipment).toBe(2);
    expect(p.freeAstronautCount).toBe(2);
    p.unassignCrewFromEquipment(10);
    expect(p.crewAssignedToEquipment).toBe(0);
    expect(p.freeAstronautCount).toBe(4);
  });

  it('unassignCrewFromEquipment with returnToAstronautPool false does not add back to astronaut', () => {
    const p = new Player(
      'p1',
      new Coins(0),
      new ProductionRate(0),
      [Planet.create('planet-1', 'Titan')],
      [],
      0,
      0,
      { astronaut: 0, miner: 0, scientist: 0, pilot: 0, medic: 0, engineer: 0 },
      0,
      3
    );
    p.unassignCrewFromEquipment(2, false);
    expect(p.crewAssignedToEquipment).toBe(1);
    expect(p.freeAstronautCount).toBe(0);
  });
});
