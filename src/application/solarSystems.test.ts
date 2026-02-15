import { describe, it, expect } from 'vitest';
import {
  getSolarSystemName,
  getPlanetDisplayName,
  PLANETS_PER_SOLAR_SYSTEM,
} from './solarSystems.js';

describe('solarSystems', () => {
  it('PLANETS_PER_SOLAR_SYSTEM is 4', () => {
    expect(PLANETS_PER_SOLAR_SYSTEM).toBe(4);
  });

  it('getSolarSystemName is deterministic', () => {
    expect(getSolarSystemName(0)).toBe(getSolarSystemName(0));
    expect(getSolarSystemName(1)).toBe(getSolarSystemName(1));
    expect(getSolarSystemName(100)).toBe(getSolarSystemName(100));
  });

  it('getSolarSystemName returns two-word procedural name', () => {
    const name = getSolarSystemName(0);
    const parts = name.split(' ');
    expect(parts.length).toBe(2);
    expect(parts[0].length).toBeGreaterThan(0);
    expect(parts[1].length).toBeGreaterThan(0);
  });

  it('getSolarSystemName varies with index', () => {
    const names = new Set([0, 1, 2, 3, 4, 5].map(getSolarSystemName));
    expect(names.size).toBeGreaterThan(1);
  });

  it('getPlanetDisplayName formats as "PlanetName (SystemName)"', () => {
    const display = getPlanetDisplayName('Kel Drift', 0);
    expect(display).toMatch(/^Kel Drift \([A-Za-z]+ [A-Za-z]+\)$/);
  });

  it('getPlanetDisplayName uses same system for planets 0-3, next for 4-7', () => {
    const system0 = getPlanetDisplayName('A', 0).match(/\(([^)]+)\)/)?.[1];
    const system3 = getPlanetDisplayName('B', 3).match(/\(([^)]+)\)/)?.[1];
    const system4 = getPlanetDisplayName('C', 4).match(/\(([^)]+)\)/)?.[1];
    expect(system0).toBe(system3);
    expect(system0).not.toBe(system4);
  });
});
