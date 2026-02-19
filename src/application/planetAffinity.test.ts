import { describe, it, expect } from 'vitest';
import {
  getPlanetType,
  getPlanetTypeMultiplier,
  getBaseProductionRateFromPlanets,
  getPlanetAffinityDescription,
  getBestPlanetTypes,
  PLANET_TYPE_NAMES,
} from './planetAffinity.js';
import { Planet } from '../domain/entities/Planet.js';
import { Upgrade } from '../domain/entities/Upgrade.js';
import { UpgradeEffect } from '../domain/value-objects/UpgradeEffect.js';
import { Decimal } from '../domain/bigNumber.js';

describe('planetAffinity', () => {
  it('getPlanetType returns deterministic type from planet name', () => {
    const t = getPlanetType('Titan Prime');
    expect(PLANET_TYPE_NAMES).toContain(t);
    expect(getPlanetType('Titan Prime')).toBe(t);
  });

  it('getPlanetTypeMultiplier returns 1 for unknown upgrade', () => {
    expect(getPlanetTypeMultiplier('unknown-upgrade', 'rocky')).toBe(1);
  });

  it('getPlanetTypeMultiplier returns value from affinity', () => {
    const rocky = getPlanetTypeMultiplier('mining-robot', 'rocky');
    const desert = getPlanetTypeMultiplier('mining-robot', 'desert');
    expect(rocky).toBeGreaterThan(1);
    expect(desert).toBeLessThan(1);
    expect(rocky).toBeGreaterThan(desert);
  });

  it('getBaseProductionRateFromPlanets sums coinsPerSecond with planet multipliers', () => {
    const planet = Planet.create('planet-1', 'P1');
    const upgrade = new Upgrade('mining-robot', 'Robot', 0, new UpgradeEffect(10));
    planet.addUpgrade(upgrade);
    const total = getBaseProductionRateFromPlanets([planet]);
    expect(total.toNumber()).toBeGreaterThan(0);
  });

  it('getPlanetAffinityDescription returns empty for unknown upgrade', () => {
    expect(getPlanetAffinityDescription('unknown-upgrade')).toBe('');
  });

  it('getPlanetAffinityDescription returns human-readable affinity line', () => {
    const desc = getPlanetAffinityDescription('mining-robot');
    expect(desc).toContain('Rocky');
    expect(desc).toContain('%');
    expect(desc.length).toBeGreaterThan(0);
  });

  it('getBestPlanetTypes returns types with mult > 1.05 sorted by multiplier desc', () => {
    const best = getBestPlanetTypes('mining-robot');
    expect(best).toContain('Rocky');
    expect(best[0]).toBe('Rocky');
    expect(getBestPlanetTypes('solar-collector')).toContain('Desert');
    expect(getBestPlanetTypes('unknown')).toEqual([]);
  });
});
