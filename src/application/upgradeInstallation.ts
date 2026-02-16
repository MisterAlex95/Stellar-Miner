import { Decimal } from '../domain/bigNumber.js';
import type { GameSession } from '../domain/aggregates/GameSession.js';
import { notifyRefresh } from './refreshSignal.js';

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
