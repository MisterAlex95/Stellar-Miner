import { describe, it, expect } from 'vitest';
import { Planet, UPGRADES_PER_PLANET } from './Planet.js';
import { Upgrade } from './Upgrade.js';
import { UpgradeEffect } from '../value-objects/UpgradeEffect.js';

describe('Planet', () => {
  it('create returns planet with default max upgrades', () => {
    const p = Planet.create('p1', 'Titan');
    expect(p.id).toBe('p1');
    expect(p.name).toBe('Titan');
    expect(p.maxUpgrades).toBe(UPGRADES_PER_PLANET);
    expect(p.usedSlots).toBe(0);
    expect(p.freeSlots).toBe(UPGRADES_PER_PLANET);
    expect(p.hasFreeSlot()).toBe(true);
  });

  it('create accepts custom maxUpgrades', () => {
    const p = Planet.create('p2', 'Nova', 8);
    expect(p.maxUpgrades).toBe(8);
  });

  it('usedSlots and freeSlots reflect upgrades', () => {
    const p = Planet.create('p1', 'Titan', 3);
    expect(p.usedSlots).toBe(0);
    expect(p.freeSlots).toBe(3);
    p.addUpgrade(new Upgrade('u1', 'U1', 1, new UpgradeEffect(1)));
    expect(p.usedSlots).toBe(1);
    expect(p.freeSlots).toBe(2);
    p.addUpgrade(new Upgrade('u2', 'U2', 1, new UpgradeEffect(1)));
    p.addUpgrade(new Upgrade('u3', 'U3', 1, new UpgradeEffect(1)));
    expect(p.usedSlots).toBe(3);
    expect(p.freeSlots).toBe(0);
    expect(p.hasFreeSlot()).toBe(false);
  });

  it('addUpgrade throws when no free slot', () => {
    const p = Planet.create('p1', 'Titan', 1);
    p.addUpgrade(new Upgrade('u1', 'U1', 1, new UpgradeEffect(1)));
    expect(() => p.addUpgrade(new Upgrade('u2', 'U2', 1, new UpgradeEffect(1)))).toThrow(
      'Planet has no free upgrade slot'
    );
  });

  it('addSlot increases maxUpgrades', () => {
    const p = Planet.create('p1', 'Titan', 6);
    expect(p.maxUpgrades).toBe(6);
    p.addSlot();
    expect(p.maxUpgrades).toBe(7);
    p.addSlot();
    expect(p.maxUpgrades).toBe(8);
  });

  it('addHousing increases housing count', () => {
    const p = Planet.create('p1', 'Titan', 6);
    expect(p.housingCount).toBe(0);
    p.addHousing();
    expect(p.housingCount).toBe(1);
    p.addHousing();
    expect(p.housingCount).toBe(2);
  });

  it('addHousing throws when no free slot', () => {
    const p = Planet.create('p1', 'Titan', 1);
    p.addUpgrade(new Upgrade('u1', 'U1', 1, new UpgradeEffect(1)));
    expect(() => p.addHousing()).toThrow('Planet has no free slot for housing');
  });

  it('constructor copies upgrades array', () => {
    const u = new Upgrade('u1', 'U1', 1, new UpgradeEffect(1));
    const p = new Planet('p1', 'Titan', 6, [u]);
    expect(p.upgrades).toHaveLength(1);
    p.upgrades.push(new Upgrade('u2', 'U2', 1, new UpgradeEffect(1)));
    expect(p.upgrades).toHaveLength(2);
  });

  it('constructor with empty upgrades uses empty array', () => {
    const p = new Planet('p1', 'Titan', 6);
    expect(p.upgrades).toEqual([]);
  });

  it('constructor with null upgrades uses empty array', () => {
    const p = new Planet('p1', 'Titan', 6, null as unknown as Upgrade[]);
    expect(p.upgrades).toEqual([]);
  });
});
