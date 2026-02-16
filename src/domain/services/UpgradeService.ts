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
   * installDurationMs: if > 0, the upgrade is added as "installing" and will contribute production after this many ms; nowMs is used as start time.
   */
  purchaseUpgrade(
    player: Player,
    upgrade: Upgrade,
    targetPlanet?: Planet | null,
    productionMultiplier: number = 1,
    hasFreeSlot?: (planet: Planet) => boolean,
    installDurationMs: number = 0,
    nowMs: number = 0
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
    const rate = upgrade.effect.coinsPerSecond.mul(productionMultiplier);
    if (installDurationMs > 0 && nowMs >= 0) {
      const sameType = planet.installingUpgrades.filter((i) => i.upgrade.id === upgrade.id);
      const lastEndsAt =
        sameType.length > 0 ? Math.max(...sameType.map((i) => i.endsAt)) : 0;
      const startAt = Math.max(nowMs, lastEndsAt);
      const endsAt = startAt + installDurationMs;
      planet.addInstallingUpgrade(upgrade, startAt, endsAt, rate);
    } else {
      planet.addUpgrade(upgrade);
      player.setProductionRate(player.productionRate.add(rate));
    }
    return createUpgradePurchased(player.id, upgrade.id);
  }

  /**
   * Remove one installed upgrade from the planet and subtract its production from the player.
   * productionMultiplier must match what was used when the upgrade was installed (e.g. planet type multiplier).
   * Returns the removed upgrade or null if none found. Caller is responsible for refunding coins and unassigning crew.
   */
  uninstallUpgrade(
    player: Player,
    planet: Planet,
    upgradeId: string,
    productionMultiplier: number = 1
  ): Upgrade | null {
    if (!player.planets.includes(planet)) return null;
    const removed = planet.removeUpgrade(upgradeId);
    if (!removed) return null;
    const rate = removed.effect.coinsPerSecond.mul(productionMultiplier);
    player.setProductionRate(player.productionRate.subtract(rate));
    return removed;
  }
}
