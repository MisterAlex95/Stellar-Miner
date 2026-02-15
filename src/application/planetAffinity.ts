import { Decimal } from '../domain/bigNumber.js';
import type { Planet } from '../domain/entities/Planet.js';
import planetAffinityData from '../data/planetAffinity.json';

const PLANET_TYPES = (planetAffinityData as { planetTypes: string[] }).planetTypes;
const AFFINITY = (planetAffinityData as { affinity: Record<string, Record<string, number>> }).affinity;

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Deterministic planet type from planet name (stats and MineZoneCanvas visual both use this). */
export function getPlanetType(planetName: string): string {
  const idx = hash(planetName) % PLANET_TYPES.length;
  return PLANET_TYPES[idx] ?? 'rocky';
}

/** Production multiplier for an upgrade on a given planet type. Default 1 if not defined. */
export function getPlanetTypeMultiplier(upgradeId: string, planetType: string): number {
  const byUpgrade = AFFINITY[upgradeId];
  if (!byUpgrade) return 1;
  const mult = byUpgrade[planetType];
  return typeof mult === 'number' ? mult : 1;
}

/** Sum of (base coinsPerSecond × planet-type multiplier) for all upgrades on all planets. Used when loading save. */
export function getBaseProductionRateFromPlanets(planets: Planet[]): Decimal {
  let total = new Decimal(0);
  for (const planet of planets) {
    const planetType = getPlanetType(planet.name);
    for (const upgrade of planet.upgrades) {
      const mult = getPlanetTypeMultiplier(upgrade.id, planetType);
      total = total.add(upgrade.effect.coinsPerSecond.mul(mult));
    }
  }
  return total;
}

export const PLANET_TYPE_NAMES = PLANET_TYPES;

/** Human-readable affinity line for tooltip, e.g. "Rocky: +20%, Ice: -20%" */
export function getPlanetAffinityDescription(upgradeId: string): string {
  const byUpgrade = AFFINITY[upgradeId];
  if (!byUpgrade) return '';
  const parts = PLANET_TYPES.map((type) => {
    const mult = byUpgrade[type];
    if (typeof mult !== 'number') return null;
    const pct = Math.round((mult - 1) * 100);
    const sign = pct >= 0 ? '+' : '';
    const name = type.charAt(0).toUpperCase() + type.slice(1);
    return `${name}: ${sign}${pct}%`;
  }).filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(', ') : '';
}
