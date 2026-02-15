import type { GameSession } from '../domain/aggregates/GameSession.js';
import { getResearchProductionMultiplier } from './research.js';

export function getPlanetBaseProduction(planet: { upgrades: { effect: { coinsPerSecond: number } }[] }): number {
  return planet.upgrades.reduce((s, u) => s + u.effect.coinsPerSecond, 0);
}

export function getPlanetEffectiveProduction(
  planet: { upgrades: { effect: { coinsPerSecond: number } }[] },
  session: GameSession | null
): number {
  if (!session) return 0;
  const totalBase = session.player.productionRate.value;
  if (totalBase <= 0) return 0;
  const planetBase = getPlanetBaseProduction(planet);
  const researchMult = getResearchProductionMultiplier();
  return (planetBase / totalBase) * session.player.effectiveProductionRate * researchMult;
}
