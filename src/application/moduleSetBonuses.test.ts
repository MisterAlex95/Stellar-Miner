import { describe, it, expect } from 'vitest';
import {
  getCompletedSetBonusesForPlanet,
  getPotentialSetBonusesForPlanet,
  getSetBonusMultiplier,
  getSetDefId,
  getSetBonusCatalog,
  getActiveSetDefIds,
  getDiscoveredSetsDisplay,
} from './moduleSetBonuses.js';
import { Planet } from '../domain/entities/Planet.js';
import { Player } from '../domain/entities/Player.js';
import { Upgrade } from '../domain/entities/Upgrade.js';
import { UpgradeEffect } from '../domain/value-objects/UpgradeEffect.js';
import { Decimal } from '../domain/bigNumber.js';

describe('moduleSetBonuses', () => {
  it('getCompletedSetBonusesForPlanet returns empty when no config match', () => {
    const planet = Planet.create('p1', 'Test');
    expect(getCompletedSetBonusesForPlanet(planet)).toEqual([]);
  });

  it('getCompletedSetBonusesForPlanet returns bonus when required count reached', () => {
    const planet = Planet.create('p1', 'Test');
    const upgrade = new Upgrade('mining-robot', 'Mining Robot', new Decimal(0), new UpgradeEffect(1), false);
    planet.addUpgrade(upgrade);
    planet.addUpgrade(new Upgrade('mining-robot', 'Mining Robot', new Decimal(0), new UpgradeEffect(1), false));
    planet.addUpgrade(new Upgrade('mining-robot', 'Mining Robot', new Decimal(0), new UpgradeEffect(1), false));
    const active = getCompletedSetBonusesForPlanet(planet);
    expect(active.length).toBeGreaterThanOrEqual(1);
    const mining = active.find((b) => b.moduleId === 'mining-robot');
    expect(mining).toBeDefined();
    expect(mining?.count).toBe(3);
    expect(mining?.bonusPercent).toBe(5);
  });

  it('getPotentialSetBonusesForPlanet returns in-progress sets', () => {
    const planet = Planet.create('p1', 'Test');
    planet.addUpgrade(new Upgrade('mining-robot', 'Mining Robot', new Decimal(0), new UpgradeEffect(1), false));
    planet.addUpgrade(new Upgrade('mining-robot', 'Mining Robot', new Decimal(0), new UpgradeEffect(1), false));
    const potential = getPotentialSetBonusesForPlanet(planet);
    expect(potential.length).toBeGreaterThanOrEqual(1);
    const mining = potential.find((b) => b.moduleId === 'mining-robot');
    expect(mining).toBeDefined();
    expect(mining?.current).toBe(2);
    expect(mining?.required).toBe(3);
  });

  it('getSetBonusMultiplier returns 1 when no completed sets', () => {
    const player = Player.create('p1');
    expect(getSetBonusMultiplier(player)).toBe(1);
  });

  it('getSetBonusMultiplier returns 1 + bonus when one set completed', () => {
    const player = Player.create('p1');
    const planet = player.planets[0];
    for (let i = 0; i < 3; i++) {
      planet.addUpgrade(new Upgrade('mining-robot', 'Mining Robot', new Decimal(0), new UpgradeEffect(1), false));
    }
    expect(getSetBonusMultiplier(player)).toBe(1 + 5 / 100);
  });

  it('getCompletedSetBonusesForPlanet uses combined count for moduleIds set', () => {
    const planet = Planet.create('p1', 'Test');
    planet.addUpgrade(new Upgrade('drill-mk1', 'Drill Mk.I', new Decimal(0), new UpgradeEffect(1), false));
    planet.addUpgrade(new Upgrade('drill-mk1', 'Drill Mk.I', new Decimal(0), new UpgradeEffect(1), false));
    planet.addUpgrade(new Upgrade('drill-mk2', 'Drill Mk.II', new Decimal(0), new UpgradeEffect(1), false));
    const active = getCompletedSetBonusesForPlanet(planet);
    const drillSet = active.find((b) => b.moduleName.includes('Drill'));
    expect(drillSet).toBeDefined();
    expect(drillSet?.count).toBe(3);
    expect(drillSet?.bonusPercent).toBe(8);
  });

  it('getPotentialSetBonusesForPlanet uses combined count for moduleIds', () => {
    const planet = Planet.create('p1', 'Test');
    planet.addUpgrade(new Upgrade('drill-mk1', 'Drill Mk.I', new Decimal(0), new UpgradeEffect(1), false));
    planet.addUpgrade(new Upgrade('drill-mk2', 'Drill Mk.II', new Decimal(0), new UpgradeEffect(1), false));
    const potential = getPotentialSetBonusesForPlanet(planet);
    const drillSet = potential.find((b) => b.moduleName.includes('Drill Mk.I') && b.moduleName.includes('Drill Mk.II') && b.required === 3);
    expect(drillSet).toBeDefined();
    expect(drillSet?.current).toBe(2);
    expect(drillSet?.required).toBe(3);
  });

  it('getSetDefId returns stable ids', () => {
    expect(getSetDefId(0)).toBe('set-0');
    expect(getSetDefId(5)).toBe('set-5');
  });

  it('getSetBonusCatalog returns entries with id and moduleName', () => {
    const catalog = getSetBonusCatalog();
    expect(catalog.length).toBeGreaterThan(0);
    expect(catalog[0]).toHaveProperty('id', 'set-0');
    expect(catalog[0]).toHaveProperty('moduleName');
    expect(catalog[0]).toHaveProperty('productionBonusPercent');
  });

  it('getActiveSetDefIds returns ids for completed sets on any planet', () => {
    const player = Player.create('p1');
    const planet = player.planets[0];
    for (let i = 0; i < 3; i++) {
      planet.addUpgrade(new Upgrade('mining-robot', 'Mining Robot', new Decimal(0), new UpgradeEffect(1), false));
    }
    const ids = getActiveSetDefIds(player);
    expect(ids.length).toBeGreaterThanOrEqual(1);
    expect(ids[0]).toMatch(/^set-\d+$/);
  });

  it('getDiscoveredSetsDisplay returns display list for discovered ids', () => {
    const catalog = getSetBonusCatalog();
    const ids = [catalog[0].id, catalog[2]?.id].filter(Boolean);
    const display = getDiscoveredSetsDisplay(ids);
    expect(display.length).toBe(ids.length);
    expect(display[0]).toMatchObject({ id: ids[0], bonusPercent: expect.any(Number), moduleName: expect.any(String) });
  });
});
