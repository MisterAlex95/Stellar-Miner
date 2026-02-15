/** Planets per solar system (grouping for display and naming). Use this constant everywhere. */
export const PLANETS_PER_SOLAR_SYSTEM = 4;

/** Procedural system name parts (stellar/sector theme). Same index always yields same name. */
const SYSTEM_NAME_PARTS_A = [
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa',
  'Sol', 'Nova', 'Void', 'Stellar', 'Crimson', 'Azure', 'Umbra', 'Aether', 'Prime', 'Core',
  'Kel', 'Vor', 'Xan', 'Zeph', 'Nex', 'Pyre', 'Rime', 'Boreal', 'Cinder', 'Flux',
];
const SYSTEM_NAME_PARTS_B = [
  'Centauri', 'Ceti', 'Eridani', 'Sector', 'Reach', 'Nexus', 'Drift', 'Belt', 'Haven', 'Gate',
  'Minor', 'Major', 'Prime', 'Outer', 'Inner', 'Rim', 'Core', 'Void', 'Flux', 'Spur',
  'Dar', 'Mak', 'Vex', 'Tor', 'Nox', 'Thule', 'Ward', 'Ymir', 'Locus', 'Junction',
];

function hashNumber(n: number): number {
  let h = 5381;
  const s = String(n);
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

/**
 * Returns a deterministic procedural solar system name for the given system index (0-based).
 * Same index always yields the same name (e.g. 0 → "Alpha Centauri", 1 → "Beta Ceti").
 */
export function getSolarSystemName(systemIndex: number): string {
  const h = hashNumber(systemIndex);
  const a = SYSTEM_NAME_PARTS_A[h % SYSTEM_NAME_PARTS_A.length];
  const b = SYSTEM_NAME_PARTS_B[(h >> 16) % SYSTEM_NAME_PARTS_B.length];
  return `${a} ${b}`;
}

/**
 * Returns display name for a planet: "PlanetName (Solar System Name)".
 * planetIndex is the 0-based index of the planet in the player's planet list.
 */
export function getPlanetDisplayName(planetName: string, planetIndex: number): string {
  const systemIndex = Math.floor(planetIndex / PLANETS_PER_SOLAR_SYSTEM);
  const systemName = getSolarSystemName(systemIndex);
  return `${planetName} (${systemName})`;
}
