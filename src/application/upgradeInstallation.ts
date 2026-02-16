import { Decimal } from '../domain/bigNumber.js';
import type { GameSession } from '../domain/aggregates/GameSession.js';
import { notifyRefresh } from './refreshSignal.js';
import { getEffectiveRequiredAstronauts } from './research.js';
import { getPlanetType, getPlanetTypeMultiplier } from './planetAffinity.js';
import { emit } from './eventBus.js';

/** Run installation ticks on all planets; add completed upgrade rates to player production. Call from game loop. */
export function completeUpgradeInstallations(session: GameSession, nowMs: number): void {
  let totalAdded = new Decimal(0);
  for (const planet of session.player.planets) {
    const rates = planet.tickInstallations(nowMs);
    for (const r of rates) totalAdded = totalAdded.add(r);
  }
  if (totalAdded.gt(0)) {
    session.player.setProductionRate(session.player.productionRate.add(totalAdded));
    notifyRefresh();
  }
}

/** Run uninstallation ticks on all planets; remove upgrade, subtract production, refund and unassign crew when timer ends. */
export function completeUpgradeUninstallations(session: GameSession, nowMs: number): void {
  const player = session.player;
  let didComplete = false;
  for (const planet of player.planets) {
    const removed = planet.tickUninstallations(nowMs);
    for (const upgrade of removed) {
      const mult = getPlanetTypeMultiplier(upgrade.id, getPlanetType(planet.name));
      const rate = upgrade.effect.coinsPerSecond.mul(mult);
      player.setProductionRate(player.productionRate.subtract(rate));
      player.addCoins(upgrade.cost);
      const crewRequired = getEffectiveRequiredAstronauts(upgrade.id);
      if (crewRequired > 0) player.unassignCrewFromEquipment(crewRequired);
      emit('upgrade_uninstalled', { upgradeId: upgrade.id, planetId: planet.id });
      didComplete = true;
    }
  }
  if (didComplete) notifyRefresh();
}
