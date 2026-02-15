import type { GameSession } from '../domain/aggregates/GameSession.js';

/** Crew assigned to equipment (upgrades that cost crew). Taken from free pool when buying; miner/scientist/pilot counts stay unchanged. */
export function getAssignedAstronauts(session: GameSession | null): number {
  if (!session) return 0;
  return session.player.crewAssignedToEquipment;
}
