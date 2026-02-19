import { describe, it, expect } from 'vitest';
import { getDiscoveryFlavor, getDiscoveryFlavorForPlanetName } from './discoveryFlavor.js';

describe('discoveryFlavor', () => {
  it('returns a flavor line for each planet type', () => {
    expect(getDiscoveryFlavor('rocky', 'Alpha')).toBeTruthy();
    expect(getDiscoveryFlavor('desert', 'Beta')).toBeTruthy();
    expect(getDiscoveryFlavor('ice', 'Gamma')).toBeTruthy();
    expect(getDiscoveryFlavor('volcanic', 'Delta')).toBeTruthy();
    expect(getDiscoveryFlavor('gas', 'Epsilon')).toBeTruthy();
  });

  it('is deterministic for the same planet name', () => {
    const a = getDiscoveryFlavor('rocky', 'Titan');
    const b = getDiscoveryFlavor('rocky', 'Titan');
    expect(a).toBe(b);
  });

  it('can return different lines for different names (same type)', () => {
    const flavors = new Set<string>();
    for (let i = 0; i < 20; i++) {
      flavors.add(getDiscoveryFlavor('rocky', `Planet-${i}`));
    }
    expect(flavors.size).toBeGreaterThan(1);
  });

  it('returns empty string for unknown type', () => {
    expect(getDiscoveryFlavor('unknown-type', 'X')).toBe('');
  });

  it('getDiscoveryFlavorForPlanetName derives type and returns flavor', () => {
    const flavor = getDiscoveryFlavorForPlanetName('Nova Prime');
    expect(typeof flavor).toBe('string');
    expect(flavor.length).toBeGreaterThan(0);
  });
});
