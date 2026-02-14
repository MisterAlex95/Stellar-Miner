import type { Player } from '../entities/Player.js';
import type { Upgrade } from '../entities/Upgrade.js';
import { createUpgradePurchased } from '../events/UpgradePurchased.js';
import type { DomainEvent } from '../events/index.js';

/** Domain service: purchase and apply upgrades. Upgrades are placed on a planet with a free slot. */
export class UpgradeService {
  purchaseUpgrade(player: Player, upgrade: Upgrade): DomainEvent | null {
    if (!player.coins.gte(upgrade.cost)) return null;
    const planet = player.getPlanetWithFreeSlot();
    if (!planet) return null;
    player.spendCoins(upgrade.cost);
    planet.addUpgrade(upgrade);
    player.setProductionRate(
      player.productionRate.add(upgrade.effect.coinsPerSecond)
    );
    return createUpgradePurchased(player.id, upgrade.id);
  }
}
