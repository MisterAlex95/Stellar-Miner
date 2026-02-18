/**
 * Upgrade UI helpers: max buy count, install/uninstall progress state.
 * Used by Vue upgrade list and handlers.
 */
import { getSession } from './gameState.js';
import {
  UPGRADE_CATALOG,
  getUpgradeCost,
  type UpgradeDef,
} from './catalogs.js';
import { getEffectiveUpgradeUsesSlot, getEffectiveRequiredAstronauts } from './research.js';

export type InstallUninstallRange = { startAt: number; endsAt: number };

/** (startAt, endsAt) of all installations in progress for this upgrade across all planets. */
export function getInstallingRanges(upgradeId: string): InstallUninstallRange[] {
  const session = getSession();
  if (!session) return [];
  return session.player.planets.flatMap((p) =>
    p.installingUpgrades
      .filter((i) => i.upgrade.id === upgradeId)
      .map((i) => ({ startAt: i.startAt, endsAt: i.endsAt }))
  );
}

/** Per-planet count of installing upgrades (for cancel-all). */
export function getInstallingCountByPlanet(upgradeId: string): { planetId: string; count: number }[] {
  const session = getSession();
  if (!session) return [];
  return session.player.planets
    .map((p) => ({
      planetId: p.id,
      count: p.installingUpgrades.filter((i) => i.upgrade.id === upgradeId).length,
    }))
    .filter((x) => x.count > 0);
}

/** (startAt, endsAt) of all uninstallations in progress for this upgrade across all planets. */
export function getUninstallingRanges(upgradeId: string): InstallUninstallRange[] {
  const session = getSession();
  if (!session) return [];
  return session.player.planets.flatMap((p) =>
    p.uninstallingUpgrades
      .filter((u) => u.upgradeId === upgradeId)
      .map((u) => ({ startAt: u.startAt, endsAt: u.endsAt }))
  );
}

/** Per-planet uninstalling (for cancel; one entry per planet when present). */
export function getUninstallingByPlanet(upgradeId: string): { planetId: string }[] {
  const session = getSession();
  if (!session) return [];
  return session.player.planets
    .filter((p) => p.uninstallingUpgrades.some((u) => u.upgradeId === upgradeId))
    .map((p) => ({ planetId: p.id }));
}

/** Max number of this upgrade the player can buy in one go (slots, crew, coins). */
export function getMaxBuyCount(upgradeId: string): number {
  const session = getSession();
  if (!session) return 0;
  const def = UPGRADE_CATALOG.find((d) => d.id === upgradeId);
  if (!def) return 0;
  const player = session.player;
  const usesSlot = getEffectiveUpgradeUsesSlot(def.id);
  const freeSlots = usesSlot
    ? player.planets.reduce((s, p) => s + p.freeSlots, 0)
    : Number.MAX_SAFE_INTEGER;
  const effectiveCrew = getEffectiveRequiredAstronauts(def.id);
  const maxByCrew = effectiveCrew === 0 ? Number.MAX_SAFE_INTEGER : Math.floor(player.astronautCount / effectiveCrew);
  if (freeSlots <= 0 || maxByCrew <= 0) return 0;
  const installed = player.upgrades.filter((u) => u.id === upgradeId).length;
  const installing = player.planets.reduce(
    (s, p) => s + p.installingUpgrades.filter((i) => i.upgrade.id === upgradeId).length,
    0
  );
  const ownedCount = installed + installing;
  let count = 0;
  let remaining = player.coins.value;
  while (count < freeSlots && count < maxByCrew) {
    const nextCost = getUpgradeCost(def, ownedCount + count);
    if (remaining.lt(nextCost)) break;
    remaining = remaining.sub(nextCost);
    count++;
  }
  return count;
}
