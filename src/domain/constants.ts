import { Decimal } from './bigNumber.js';
import balance from '../data/balance.json';

export type CrewRole = 'miner' | 'scientist' | 'pilot';

export const CREW_ROLES: CrewRole[] = ['miner', 'scientist', 'pilot'];

export type CrewByRole = Record<CrewRole, number>;

export type ExpeditionComposition = Record<CrewRole, number>;

const B = balance as {
  newPlanetBaseCost: number;
  newPlanetCostGrowth: number;
  expeditionMinAstronauts: number;
  expeditionMaxAstronauts: number;
  expeditionDeathChance: number;
  expeditionMinDeathChance?: number;
  planetProductionBonus: number;
  prestigeBonusPerLevel: number;
  prestigeClickBonusPercentPerLevel: number;
  prestigeCoinThreshold: number;
  defaultBaseSlots: number;
  addSlotBaseMultiplier: number;
  addSlotExponent: number;
  addSlotFirstExpansionDiscount: number;
  planetNames: string[];
  astronautProductionBonus: number;
  minerProductionBonus?: number;
  otherCrewProductionBonus?: number;
  veteranProductionBonus?: number;
  moraleBonusWhenComfortable?: number;
  moraleMalusWhenOvercrowded?: number;
  scientistResearchSuccessPerScientist?: number;
  scientistResearchSuccessCap?: number;
  housingAstronautCapacity: number;
  maxAstronautsBase: number;
  housingBaseCost: number;
  housingCostGrowth: number;
  astronautBaseCost: number;
  astronautCostGrowth: number;
};

/** Cost in coins to launch an expedition to discover a new planet. Scales with count. Supports unbounded values. */
export const NEW_PLANET_BASE_COST = B.newPlanetBaseCost;

export function getNewPlanetCost(planetCount: number): Decimal {
  return new Decimal(B.newPlanetBaseCost)
    .mul(planetCount + 1)
    .mul(Decimal.pow(B.newPlanetCostGrowth, planetCount))
    .floor();
}

/** Astronauts required to send on expedition (risk: some may die; if all die, planet not discovered). */
export function getExpeditionAstronautsRequired(planetCount: number): number {
  return Math.min(B.expeditionMinAstronauts + Math.floor(planetCount / 2), B.expeditionMaxAstronauts);
}

/** Per-astronaut death chance during expedition (0–1). Each rolls independently. */
export const EXPEDITION_DEATH_CHANCE = B.expeditionDeathChance;

/** Minimum death chance (0–1). */
export const EXPEDITION_MIN_DEATH_CHANCE = B.expeditionMinDeathChance ?? 0.05;

/** Production bonus per planet (e.g. 0.05 = +5% per extra planet). First planet is base, each additional adds this. */
export const PLANET_PRODUCTION_BONUS = B.planetProductionBonus;

/** Production bonus per prestige level (e.g. 0.05 = +5% per level). Applied after planet bonus. */
export const PRESTIGE_BONUS_PER_LEVEL = B.prestigeBonusPerLevel;

/** Click bonus per prestige level (from prestige 2 onward). Prestige 1 unlocks research click; each further level adds this % to click reward. */
export const PRESTIGE_CLICK_BONUS_PERCENT_PER_LEVEL = B.prestigeClickBonusPercentPerLevel;

/** Coins required to unlock the Prestige button. Resets run; keeps prestige level. */
export const PRESTIGE_COIN_THRESHOLD = new Decimal(B.prestigeCoinThreshold);

/** Base slot count (from Planet.UPGRADES_PER_PLANET) for "first expansion" discount. */
const DEFAULT_BASE_SLOTS = B.defaultBaseSlots;

/** Cost to add one upgrade slot. Steeper curve so expanding slots is a real milestone. Supports unbounded values. */
export function getAddSlotCost(currentMaxSlots: number, baseSlots: number = DEFAULT_BASE_SLOTS): Decimal {
  const raw = new Decimal(B.addSlotBaseMultiplier).mul(Decimal.pow(currentMaxSlots, B.addSlotExponent)).floor();
  const isFirstExpansion = currentMaxSlots === baseSlots;
  return isFirstExpansion ? raw.mul(B.addSlotFirstExpansionDiscount).floor() : raw;
}

/** Themed names for planets (index 0 = first planet). Falls back to "Planet N" if index >= length. */
export const PLANET_NAMES = B.planetNames;

export function getPlanetName(index: number): string {
  return PLANET_NAMES[index] ?? `Planet ${index + 1}`;
}

/** Deterministic planet name from id: same id always yields the same name. */
const PLANET_NAME_PARTS_A = [
  'Titan', 'Nova', 'Dust', 'Iron', 'Crimson', 'Frost', 'Solar', 'Void', 'Stellar', 'Last',
  'Kel', 'Vor', 'Xan', 'Zeph', 'Nex', 'Orb', 'Pyre', 'Rime', 'Umbra', 'Aether',
  'Boreal', 'Cinder', 'Drift', 'Ember', 'Flux', 'Glacier', 'Haven', 'Ion', 'Jade', 'Kor',
];
const PLANET_NAME_PARTS_B = [
  'Prime', 'Haven', 'Vein', 'Drift', 'Ring', 'Forge', 'Edge', 'Rest', 'Light', 'Reach',
  'Dar', 'Mak', 'Vex', 'Tor', 'Nox', 'Ris', 'Kor', 'Thule', 'Ward', 'Ymir',
  'Belt', 'Core', 'Dawn', 'Fall', 'Gate', 'Hollow', 'Isle', 'Junction', 'Keep', 'Locus',
];

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
  return h >>> 0;
}

/** Generates a deterministic, varied planet name from planetId (e.g. "planet-3" → "Kel Drift"). */
export function generatePlanetName(planetId: string): string {
  const h = hash(planetId);
  const a = PLANET_NAME_PARTS_A[h % PLANET_NAME_PARTS_A.length];
  const b = PLANET_NAME_PARTS_B[(h >> 16) % PLANET_NAME_PARTS_B.length];
  return `${a} ${b}`;
}

/** Crew: astronauts. Production bonus per astronaut (e.g. 0.02 = +2% each). Legacy / fallback. */
export const ASTRONAUT_PRODUCTION_BONUS = B.astronautProductionBonus;

/** Production bonus per miner (e.g. 0.02 = +2% each). */
export const MINER_PRODUCTION_BONUS = B.minerProductionBonus ?? 0.02;

/** Production bonus per non-miner crew (scientist, pilot). */
export const OTHER_CREW_PRODUCTION_BONUS = B.otherCrewProductionBonus ?? 0.01;

/** Production bonus per veteran (expedition survivor). */
export const VETERAN_PRODUCTION_BONUS = B.veteranProductionBonus ?? 0.005;

/** Morale: +% production when crew ≤ capacity. */
export const MORALE_BONUS_WHEN_COMFORTABLE = B.moraleBonusWhenComfortable ?? 0.05;

/** Morale: -% production when crew > capacity (overcrowded). */
export const MORALE_MALUS_WHEN_OVERCROWDED = B.moraleMalusWhenOvercrowded ?? 0.05;

/** Research success chance bonus per scientist (additive, 0–1). */
export const SCIENTIST_RESEARCH_SUCCESS_PER_SCIENTIST = B.scientistResearchSuccessPerScientist ?? 0.02;

/** Cap for scientist research success bonus (e.g. 0.2 = max +20%). */
export const SCIENTIST_RESEARCH_SUCCESS_CAP = B.scientistResearchSuccessCap ?? 0.2;

/** Crew capacity added per housing module built on any planet. */
export const HOUSING_ASTRONAUT_CAPACITY = B.housingAstronautCapacity;

/** Max total astronauts (free + assigned) from planets and housing. housingCount = sum of housing on all planets. */
export function getMaxAstronauts(planetCount: number, housingCount: number = 0): number {
  const base = Math.max(B.maxAstronautsBase, B.maxAstronautsBase * planetCount);
  return base + housingCount * B.housingAstronautCapacity;
}

/** Base cost for first housing on a planet. Each additional housing on that planet costs more. */
export const HOUSING_BASE_COST = B.housingBaseCost;

export function getHousingCost(planetHousingCount: number): Decimal {
  return new Decimal(B.housingBaseCost).mul(Decimal.pow(B.housingCostGrowth, planetHousingCount)).floor();
}

/** Base cost to hire the first astronaut. Each additional costs more. */
export const ASTRONAUT_BASE_COST = B.astronautBaseCost;

export function getAstronautCost(currentCount: number): Decimal {
  return new Decimal(B.astronautBaseCost).mul(Decimal.pow(B.astronautCostGrowth, currentCount)).floor();
}
