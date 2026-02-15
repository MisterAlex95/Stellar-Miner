import { Decimal } from '../domain/bigNumber.js';
import type { GameSession } from '../domain/aggregates/GameSession.js';
import { getResearchProductionMultiplier } from './research.js';

export function getPlanetBaseProduction(planet: { upgrades: { effect: { coinsPerSecond: Decimal } }[] }): Decimal {
  return planet.upgrades.reduce((s, u) => s.add(u.effect.coinsPerSecond), new Decimal(0));
}

export function getPlanetEffectiveProduction(
  planet: { upgrades: { effect: { coinsPerSecond: Decimal } }[] },
  session: GameSession | null
): Decimal {
  if (!session) return new Decimal(0);
  const totalBase = session.player.productionRate.value;
  if (totalBase.lte(0)) return new Decimal(0);
  const planetBase = getPlanetBaseProduction(planet);
  const ratio = totalBase.gt(0) ? planetBase.div(totalBase) : new Decimal(0);
  const researchMult = getResearchProductionMultiplier();
  return session.player.effectiveProductionRate.mul(ratio).mul(researchMult);
}
