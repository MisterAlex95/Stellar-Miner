import type { Player } from '../entities/Player.js';
import type { Planet } from '../entities/Planet.js';
import type { Upgrade } from '../entities/Upgrade.js';
import { createUpgradePurchased } from '../events/UpgradePurchased.js';
import type { DomainEvent } from '../events/index.js';

/** Domain service: purchase and apply upgrades. Upgrades are placed on a planet (slot-using ones require a free slot). */
export class UpgradeService {
  /**
   * If targetPlanet is provided, it must belong to the player and (if upgrade uses a slot) have a free slot.
   * productionMultiplier: optional planet-type multiplier (default 1) applied to base coinsPerSecond when adding to production.
   * hasFreeSlot: optional predicate to determine if a planet has a free slot (e.g. effective slots when research grants slot-free upgrades).
   */
  purchaseUpgrade(
    player: Player,
    upgrade: Upgrade,
    targetPlanet?: Planet | null,
    productionMultiplier: number = 1,
    hasFreeSlot?: (planet: Planet) => boolean
  ): DomainEvent | null {
    if (!player.coins.gte(upgrade.cost)) return null;
    if (targetPlanet != null && !player.planets.includes(targetPlanet)) return null;
    const slotCheck = hasFreeSlot ?? ((p: Planet) => p.hasFreeSlot());
    let planet: Planet | null;
    if (targetPlanet != null && player.planets.includes(targetPlanet)) {
      planet = upgrade.usesSlot ? (slotCheck(targetPlanet) ? targetPlanet : null) : targetPlanet;
    } else {
      planet = upgrade.usesSlot ? (player.planets.find((p) => slotCheck(p)) ?? null) : (player.planets[0] ?? null);
    }
    if (!planet) return null;
    player.spendCoins(upgrade.cost);
    planet.addUpgrade(upgrade);
    const rate = upgrade.effect.coinsPerSecond.mul(productionMultiplier);
    player.setProductionRate(player.productionRate.add(rate));
    return createUpgradePurchased(player.id, upgrade.id);
  }
}
