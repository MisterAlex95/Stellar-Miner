import { Decimal } from '../domain/bigNumber.js';
import type { GameSession } from '../domain/aggregates/GameSession.js';
import { getResearchProductionMultiplier } from './research.js';
import { getPlanetType, getPlanetTypeMultiplier } from './planetAffinity.js';
import { getCurrentComboMultiplier } from './catalogs.js';
import { getExpectedCoinsPerClick } from './research.js';

/** Estimated click-derived production rate. Used by stats, production display, and charts. */
export function getEstimatedClickRate(params: {
  clickTimestamps: number[];
  now: number;
  sessionClicks: number;
  sessionCoinsFromClicks: number;
  prestigeLevel: number;
}): { avgCoinsPerClick: number; clicksLastSecond: number; coinsPerSecondFromClicks: number } {
  const { clickTimestamps, now, sessionClicks, sessionCoinsFromClicks, prestigeLevel } = params;
  const clicksLastSecond = clickTimestamps.filter((t) => t > now - 1000).length;
  const baseExpected = getExpectedCoinsPerClick(prestigeLevel);
  const comboMult = getCurrentComboMultiplier(clickTimestamps, now);
  const avgCoinsPerClick =
    sessionClicks > 0
      ? Math.max(sessionCoinsFromClicks / sessionClicks, baseExpected * comboMult)
      : baseExpected * comboMult;
  return {
    avgCoinsPerClick,
    clicksLastSecond,
    coinsPerSecondFromClicks: clicksLastSecond * avgCoinsPerClick,
  };
}

export function getPlanetBaseProduction(planet: {
  id: string;
  upgrades: { id: string; effect: { coinsPerSecond: Decimal } }[];
}): Decimal {
  const planetType = getPlanetType(planet.id);
  return planet.upgrades.reduce(
    (s, u) => s.add(u.effect.coinsPerSecond.mul(getPlanetTypeMultiplier(u.id, planetType))),
    new Decimal(0)
  );
}

export function getPlanetEffectiveProduction(
  planet: { id: string; upgrades: { id: string; effect: { coinsPerSecond: Decimal } }[] },
  session: GameSession | null
): Decimal {
  if (!session) return new Decimal(0);
  const totalBase = session.player.productionRate.value;
  if (totalBase.lte(0)) return new Decimal(0);
  const planetBase = getPlanetBaseProduction(planet);
  const ratio = planetBase.div(totalBase);
  const researchMult = getResearchProductionMultiplier();
  return session.player.effectiveProductionRate.mul(ratio).mul(researchMult);
}
