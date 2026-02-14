import { describe, it, expect } from 'vitest';
import { Player } from './Player.js';
import { Coins } from '../value-objects/Coins.js';
import { ProductionRate } from '../value-objects/ProductionRate.js';
import { Upgrade } from './Upgrade.js';
import { UpgradeEffect } from '../value-objects/UpgradeEffect.js';
import { Artifact } from './Artifact.js';

describe('Player', () => {
  it('create returns new player with default state', () => {
    const p = Player.create('player-1');
    expect(p.id).toBe('player-1');
    expect(p.coins.value).toBe(0);
    expect(p.productionRate.value).toBe(0);
    expect(p.upgrades).toEqual([]);
    expect(p.artifacts).toEqual([]);
    expect(p.prestigeLevel).toBe(0);
    expect(p.totalCoinsEver).toBe(0);
  });

  it('addCoins mutates coins', () => {
    const p = Player.create('player-1');
    p.addCoins(50);
    expect(p.coins.value).toBe(50);
    p.addCoins(25);
    expect(p.coins.value).toBe(75);
  });

  it('spendCoins subtracts from coins', () => {
    const p = Player.create('player-1');
    p.addCoins(100);
    p.spendCoins(30);
    expect(p.coins.value).toBe(70);
  });

  it('spendCoins throws when insufficient', () => {
    const p = Player.create('player-1');
    p.addCoins(10);
    expect(() => p.spendCoins(20)).toThrow('Insufficient coins');
  });

  it('setProductionRate updates rate', () => {
    const p = Player.create('player-1');
    p.setProductionRate(new ProductionRate(5));
    expect(p.productionRate.value).toBe(5);
  });

  it('addUpgrade pushes upgrade to list', () => {
    const p = Player.create('player-1');
    const u = new Upgrade('drill', 'Drill', 100, new UpgradeEffect(5));
    p.addUpgrade(u);
    expect(p.upgrades).toHaveLength(1);
    expect(p.upgrades[0].id).toBe('drill');
    p.addUpgrade(u);
    expect(p.upgrades).toHaveLength(2);
  });

  it('constructor copies upgrades array', () => {
    const upgrades = [new Upgrade('a', 'A', 1, new UpgradeEffect(1))];
    const p = new Player(
      'id',
      new Coins(0),
      new ProductionRate(0),
      upgrades,
      [],
      0,
      0
    );
    expect(p.upgrades).toHaveLength(1);
    upgrades.push(new Upgrade('b', 'B', 2, new UpgradeEffect(2)));
    expect(p.upgrades).toHaveLength(1);
  });

  it('constructor uses empty upgrades when given null or undefined', () => {
    const p = new Player(
      'id',
      new Coins(0),
      new ProductionRate(0),
      undefined as unknown as Upgrade[],
      [],
      0,
      0
    );
    expect(p.upgrades).toEqual([]);
  });
});
