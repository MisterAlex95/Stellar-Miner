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
    const slots = player.planets[0].maxUpgrades;
    for (let i = 0; i < slots; i++) {
      player.planets[0].addUpgrade(new Upgrade('x', 'X', 0, new UpgradeEffect(0)));
    }
    player.addCoins(200);
    const upgrade = new Upgrade('drill', 'Drill', 200, new UpgradeEffect(5));
    const service = new UpgradeService();

    const event = service.purchaseUpgrade(player, upgrade);

    expect(event).toBeNull();
    expect(player.coins.value).toBe(200);
    expect(player.upgrades).toHaveLength(slots);
  });

  it('purchaseUpgrade with targetPlanet uses that planet when it has free slot', () => {
    const player = Player.create('p1');
    player.addPlanet(Planet.create('planet-2', 'Nova Prime'));
    player.addCoins(200);
    const upgrade = new Upgrade('drill', 'Drill', 200, new UpgradeEffect(5));
    const service = new UpgradeService();

    const event = service.purchaseUpgrade(player, upgrade, player.planets[1]);

    expect(event).not.toBeNull();
    expect(player.planets[1].upgrades).toHaveLength(1);
    expect(player.planets[1].upgrades[0].id).toBe('drill');
    expect(player.planets[0].upgrades).toHaveLength(0);
  });

  it('purchaseUpgrade with targetPlanet returns null when planet has no free slot', () => {
    const player = Player.create('p1');
    const fullPlanet = player.planets[0];
    for (let i = 0; i < fullPlanet.maxUpgrades; i++) {
      fullPlanet.addUpgrade(new Upgrade(`u${i}`, `U${i}`, 0, new UpgradeEffect(0)));
    }
    player.addPlanet(Planet.create('planet-2', 'Nova Prime'));
    player.addCoins(200);
    const upgrade = new Upgrade('drill', 'Drill', 200, new UpgradeEffect(5));
    const service = new UpgradeService();

    const event = service.purchaseUpgrade(player, upgrade, fullPlanet);

    expect(event).toBeNull();
    expect(player.coins.value).toBe(200);
  });

  it('purchaseUpgrade with targetPlanet not in player.planets returns null', () => {
    const player = Player.create('p1');
    player.addCoins(200);
    const upgrade = new Upgrade('drill', 'Drill', 200, new UpgradeEffect(5));
    const service = new UpgradeService();
    const otherPlanet = Planet.create('other', 'Other');

    const event = service.purchaseUpgrade(player, upgrade, otherPlanet);

    expect(event).toBeNull();
    expect(player.coins.value).toBe(200);
    expect(player.upgrades).toHaveLength(0);
  });
});
