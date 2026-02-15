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
  if (totalBase.lte(0)) return 0;
  const totalBaseNum = totalBase.toNumber();
  const planetBase = getPlanetBaseProduction(planet);
  const ratio = Number.isFinite(totalBaseNum) && totalBaseNum > 0 ? planetBase / totalBaseNum : 0;
  const researchMult = getResearchProductionMultiplier();
  return session.player.effectiveProductionRate.mul(ratio).mul(researchMult).toNumber();
}
