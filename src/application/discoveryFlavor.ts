/**
 * Picks a deterministic first-contact flavor line for a planet by type and name.
 * Used when a new planet is discovered (expedition success).
 */
import discoveryFlavorData from '../data/discoveryFlavor.json';
import { getPlanetType } from './planetAffinity.js';

type DiscoveryFlavorByType = Record<string, string[]>;
const FLAVORS = discoveryFlavorData as DiscoveryFlavorByType;

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Returns a one-line first-contact flavor for the given planet type (and optionally name for variety).
 * Deterministic for the same planet name. Returns empty string if no flavors for type.
 */
export function getDiscoveryFlavor(planetType: string, planetName: string): string {
  const lines = FLAVORS[planetType];
  if (!lines || lines.length === 0) return '';
  const idx = hash(planetName) % lines.length;
  return lines[idx] ?? '';
}

/**
 * Convenience: get flavor for a planet by name (derives type from name).
 */
export function getDiscoveryFlavorForPlanetName(planetName: string): string {
  const planetType = getPlanetType(planetName);
  return getDiscoveryFlavor(planetType, planetName);
}
