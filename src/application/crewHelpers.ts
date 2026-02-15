import type { GameSession } from '../domain/aggregates/GameSession.js';
import type { UpgradeDef } from './catalogs.js';
import { UPGRADE_CATALOG } from './catalogs.js';

export function getAssignedAstronauts(
  session: GameSession | null,
  catalog: UpgradeDef[] = UPGRADE_CATALOG
): number {
  if (!session) return 0;
  let assigned = 0;
  for (const def of catalog) {
    const count = session.player.upgrades.filter((u) => u.id === def.id).length;
    assigned += count * def.requiredAstronauts;
  }
  return assigned;
}
