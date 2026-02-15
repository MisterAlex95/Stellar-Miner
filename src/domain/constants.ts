/** Cost in coins to launch an expedition to discover a new planet. Scales with count. */
export const NEW_PLANET_BASE_COST = 2500;

export function getNewPlanetCost(planetCount: number): number {
  return Math.floor(NEW_PLANET_BASE_COST * (planetCount + 1) * Math.pow(1.15, planetCount));
}

/** Astronauts required to send on expedition (risk: some may die; if all die, planet not discovered). */
export function getExpeditionAstronautsRequired(planetCount: number): number {
  return Math.min(2 + Math.floor(planetCount / 2), 6);
}

/** Per-astronaut death chance during expedition (0–1). Each rolls independently. */
export const EXPEDITION_DEATH_CHANCE = 0.25;

/** Production bonus per planet (e.g. 0.05 = +5% per extra planet). First planet is base, each additional adds this. */
export const PLANET_PRODUCTION_BONUS = 0.05;

/** Production bonus per prestige level (e.g. 0.05 = +5% per level). Applied after planet bonus. */
export const PRESTIGE_BONUS_PER_LEVEL = 0.05;

/** Coins required to unlock the Prestige button. Resets run; keeps prestige level. */
export const PRESTIGE_COIN_THRESHOLD = 50_000;

/** Base slot count (from Planet.UPGRADES_PER_PLANET) for "first expansion" discount. */
const DEFAULT_BASE_SLOTS = 6;

/** Cost to add one upgrade slot. Steeper curve so expanding slots is a real milestone. */
export function getAddSlotCost(currentMaxSlots: number, baseSlots: number = DEFAULT_BASE_SLOTS): number {
  const raw = Math.floor(150 * Math.pow(currentMaxSlots, 1.25));
  const isFirstExpansion = currentMaxSlots === baseSlots;
  return isFirstExpansion ? Math.floor(raw * 0.85) : raw;
}

/** Themed names for planets (index 0 = first planet). Falls back to "Planet N" if index >= length. */
export const PLANET_NAMES = [
  'Titan', 'Nova Prime', 'Dust Haven', 'Iron Vein', 'Crimson Drift',
  'Frost Ring', 'Solar Forge', "Void's Edge", 'Stellar Rest', 'Last Light',
];

export function getPlanetName(index: number): string {
  return PLANET_NAMES[index] ?? `Planet ${index + 1}`;
}

/** Crew: astronauts. Production bonus per astronaut (e.g. 0.02 = +2% each). */
export const ASTRONAUT_PRODUCTION_BONUS = 0.02;

/** Max total astronauts (free + assigned) based on planet count. More planets = more crew capacity. */
export function getMaxAstronauts(planetCount: number): number {
  return Math.max(2, 2 * planetCount);
}

/** Base cost to hire the first astronaut. Each additional costs more. */
export const ASTRONAUT_BASE_COST = 75;

export function getAstronautCost(currentCount: number): number {
  return Math.floor(ASTRONAUT_BASE_COST * Math.pow(1.12, currentCount));
}
