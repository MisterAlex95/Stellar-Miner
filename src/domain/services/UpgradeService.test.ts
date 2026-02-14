import { describe, it, expect } from 'vitest';
import { UpgradeService } from './UpgradeService.js';
import { Player } from '../entities/Player.js';
import { Planet } from '../entities/Planet.js';
import { Upgrade } from '../entities/Upgrade.js';
import { UpgradeEffect } from '../value-objects/UpgradeEffect.js';

describe('UpgradeService', () => {
  it('purchaseUpgrade spends coins, adds upgrade, updates production rate, returns event', () => {
    const player = Player.create('p1');
    player.addCoins(200);
    const upgrade = new Upgrade('drill', 'Drill', 200, new UpgradeEffect(5));
    const service = new UpgradeService();

    const event = service.purchaseUpgrade(player, upgrade);

    expect(player.coins.value).toBe(0);
    expect(player.upgrades).toHaveLength(1);
    expect(player.upgrades[0].id).toBe('drill');
    expect(player.productionRate.value).toBe(5);
    expect(event).toEqual({
      type: 'UpgradePurchased',
      playerId: 'p1',
      upgradeId: 'drill',
    });
  });

  it('purchaseUpgrade returns null when player cannot afford', () => {
    const player = Player.create('p1');
    player.addCoins(50);
    const upgrade = new Upgrade('drill', 'Drill', 200, new UpgradeEffect(5));
    const service = new UpgradeService();

    const event = service.purchaseUpgrade(player, upgrade);

    expect(event).toBeNull();
    expect(player.coins.value).toBe(50);
    expect(player.upgrades).toHaveLength(0);
    expect(player.productionRate.value).toBe(0);
  });

  it('purchaseUpgrade stacks production when buying same upgrade twice', () => {
    const player = Player.create('p1');
    player.addCoins(400);
    const upgrade = new Upgrade('drill', 'Drill', 200, new UpgradeEffect(5));
    const service = new UpgradeService();

    service.purchaseUpgrade(player, upgrade);
    service.purchaseUpgrade(player, upgrade);

    expect(player.coins.value).toBe(0);
    expect(player.upgrades).toHaveLength(2);
    expect(player.productionRate.value).toBe(10);
  });

  it('purchaseUpgrade returns null when no planet has free slot', () => {
    const player = Player.create('p1');
    for (let i = 0; i < 5; i++) {
      player.planets[0].addUpgrade(new Upgrade('x', 'X', 0, new UpgradeEffect(0)));
    }
    player.addCoins(200);
    const upgrade = new Upgrade('drill', 'Drill', 200, new UpgradeEffect(5));
    const service = new UpgradeService();

    const event = service.purchaseUpgrade(player, upgrade);

    expect(event).toBeNull();
    expect(player.coins.value).toBe(200);
    expect(player.upgrades).toHaveLength(5);
  });
});
