import { Decimal } from './bigNumber.js';
import balance from '../data/balance.json';

/** All crew roles: generic (no job bonus) + jobs unlocked via research. */
export type CrewRole = 'astronaut' | 'miner' | 'scientist' | 'pilot' | 'medic' | 'engineer';

/** Roles that give production/research/expedition bonuses. Unlocked via research. */
export type CrewJobRole = 'miner' | 'scientist' | 'pilot' | 'medic' | 'engineer';

export const CREW_ROLES: CrewRole[] = ['astronaut', 'miner', 'scientist', 'pilot', 'medic', 'engineer'];

export const CREW_JOB_ROLES: CrewJobRole[] = ['miner', 'scientist', 'pilot', 'medic', 'engineer'];

export type CrewByRole = Record<CrewRole, number>;

export type ExpeditionComposition = Record<CrewRole, number>;

const B = balance as {
  newPlanetBaseCost: number;
  newPlanetCostGrowth: number;
  newSystemExpeditionCostMultiplier?: number;
  expeditionMinAstronauts: number;
  expeditionMaxAstronauts: number;
  expeditionDeathChance: number;
  expeditionMinDeathChance?: number;
  expeditionMedicDeathChanceReductionPerMedic?: number;
  pilotExpeditionDurationReductionPerPilot?: number;
  engineerProductionBonus?: number;
  expeditionDurationBaseMs?: number;
  expeditionDurationPerPlanetMs?: number;
  planetProductionBonus: number;
  prestigeBonusPerLevel: number;
  prestigePlanetBonusPerPlanet?: number;
  prestigeResearchBonusPerNode?: number;
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
  crewRetrainBaseCost?: number;
  expeditionTiers?: Array<{
    id: string;
    deathChanceMultiplier: number;
    durationMultiplier: number;
    extraSlot?: boolean;
  }>;
  researchPartialProgressPerFailure?: number;
  researchPartialProgressMaxChanceBonus?: number;
  researchPityFailures?: number;
  researchCostReductionPerFailure?: number;
  researchCostMinMultiplier?: number;
  researchDurationBaseMs?: number;
  researchDurationPerRowMs?: number;
  researchScientistDurationReductionPerScientist?: number;
  researchScientistDurationCap?: number;
  prestigeResearchPointsPerPrestige?: number;
  researchDataPerExpeditionSuccess?: number;
  researchBranchBonusProductionPercent?: number;
  researchBranchBonusClickPercent?: number;
  miningExpeditionBaseCost?: number;
  miningExpeditionCostGrowth?: number;
  miningDurationEasyMs?: number;
  miningDurationMediumMs?: number;
  miningDurationHardMs?: number;
  miningCoinMultiplier?: number;
  miningResearchData?: number;
  rescueExpeditionCostMultiplier?: number;
  rescueCrewMin?: number;
  rescueCrewMax?: number;
  rescueResearchData?: number;
};

export type ExpeditionTierId = 'easy' | 'medium' | 'hard';

const EXPEDITION_TIERS = (B.expeditionTiers ?? [
  { id: 'easy', deathChanceMultiplier: 0.7, durationMultiplier: 0.8 },
  { id: 'medium', deathChanceMultiplier: 1, durationMultiplier: 1 },
  { id: 'hard', deathChanceMultiplier: 1.25, durationMultiplier: 1.2, extraSlot: true },
]) as Array<{ id: string; deathChanceMultiplier: number; durationMultiplier: number; extraSlot?: boolean }>;

export function getExpeditionTiers(): Array<{ id: string; deathChanceMultiplier: number; durationMultiplier: number; extraSlot?: boolean }> {
  return EXPEDITION_TIERS;
}

export function getExpeditionTier(tierId: ExpeditionTierId | string): { id: string; deathChanceMultiplier: number; durationMultiplier: number; extraSlot?: boolean } | undefined {
  return EXPEDITION_TIERS.find((t) => t.id === tierId);
}

/** Expedition mission type: Scout = new planet, Mining = timed mission for coins+data, Rescue = recover crew. */
export type ExpeditionTypeId = 'scout' | 'mining' | 'rescue';

export type ExpeditionOutcomeKind = 'planet' | 'coins' | 'crew';

export type ExpeditionTypeConfig = {
  id: ExpeditionTypeId;
  outcome: ExpeditionOutcomeKind;
  durationMultiplier: number;
  deathChanceMultiplier: number;
};

const EXPEDITION_TYPES: ExpeditionTypeConfig[] = [
  { id: 'scout', outcome: 'planet', durationMultiplier: 0.8, deathChanceMultiplier: 0.9 },
  { id: 'mining', outcome: 'coins', durationMultiplier: 1, deathChanceMultiplier: 1 },
  { id: 'rescue', outcome: 'crew', durationMultiplier: 1, deathChanceMultiplier: 0.85 },
];

export function getExpeditionTypes(): ExpeditionTypeConfig[] {
  return [...EXPEDITION_TYPES];
}

export function getExpeditionType(typeId: ExpeditionTypeId | string): ExpeditionTypeConfig | undefined {
  return EXPEDITION_TYPES.find((t) => t.id === typeId);
}

/** Cost in coins to launch an expedition. Depends on type: Scout = new planet cost, Mining/Rescue = type-specific. */
export function getExpeditionCost(planetCount: number, typeId: ExpeditionTypeId | string): Decimal {
  if (typeId === 'scout') return getNewPlanetCost(planetCount);
  if (typeId === 'mining') {
    const base = B.miningExpeditionBaseCost ?? 40000;
    const growth = B.miningExpeditionCostGrowth ?? 1.2;
    return new Decimal(base).mul(planetCount + 1).mul(Decimal.pow(growth, planetCount)).floor();
  }
  if (typeId === 'rescue') {
    const mult = B.rescueExpeditionCostMultiplier ?? 0.5;
    return getNewPlanetCost(planetCount).mul(mult).floor();
  }
  return getNewPlanetCost(planetCount);
}

/** Mining expedition duration is fixed by tier (no planet count). */
export function getMiningExpeditionDurationMs(tierId: ExpeditionTierId | string, pilotCount: number = 0, researchDurationPercent: number = 0): number {
  const tier = getExpeditionTier(tierId);
  const byTier: Record<string, number> = {
    easy: B.miningDurationEasyMs ?? 120000,
    medium: B.miningDurationMediumMs ?? 300000,
    hard: B.miningDurationHardMs ?? 600000,
  };
  const baseMs = tier ? (byTier[tier.id] ?? byTier.medium) : byTier.medium;
  const pilotReduction = Math.min(pilotCount * (B.pilotExpeditionDurationReductionPerPilot ?? 0.08), 0.5);
  const researchMult = 1 + researchDurationPercent / 100;
  return Math.max(1000, Math.round(baseMs * (1 - pilotReduction) * researchMult));
}

/** Research data on expedition success by type. */
export function getResearchDataForExpeditionSuccess(typeId: ExpeditionTypeId | string): number {
  if (typeId === 'mining') return B.miningResearchData ?? 1;
  if (typeId === 'scout') return B.researchDataPerExpeditionSuccess ?? 1;
  if (typeId === 'rescue') return B.rescueResearchData ?? 1;
  return 0;
}

/** Coins earned on successful Mining expedition: productionRate * durationSec * multiplier. */
export function getMiningExpeditionCoins(productionRateValue: Decimal, durationMs: number): Decimal {
  const mult = B.miningCoinMultiplier ?? 2.5;
  const sec = durationMs / 1000;
  return productionRateValue.mul(sec).mul(mult).floor();
}

/** Rescued crew count on successful Rescue expedition (random in [min, max]). */
export function getRescueCrewCount(roll: () => number): number {
  const min = B.rescueCrewMin ?? 1;
  const max = B.rescueCrewMax ?? 2;
  return min + Math.floor(roll() * (max - min + 1));
}

/** Cost in coins to launch an expedition to discover a new planet. Scales with count. When current solar system is full (4 planets per system), next expedition costs more (new system). */
export const NEW_PLANET_BASE_COST = B.newPlanetBaseCost;

/** Planets per solar system; when planetCount is a multiple of this (and > 0), next expedition is to a new system and costs more. */
export const PLANETS_PER_SOLAR_SYSTEM = 4;

/** True when the next expedition will discover the first planet of a new solar system (current system is full). */
export function isNextExpeditionNewSystem(planetCount: number): boolean {
  return planetCount > 0 && planetCount % PLANETS_PER_SOLAR_SYSTEM === 0;
}

export function getNewPlanetCost(planetCount: number): Decimal {
  const base = new Decimal(B.newPlanetBaseCost)
    .mul(planetCount + 1)
    .mul(Decimal.pow(B.newPlanetCostGrowth, planetCount))
    .floor();
  const mult = isNextExpeditionNewSystem(planetCount) && (B.newSystemExpeditionCostMultiplier ?? 1) > 0
    ? (B.newSystemExpeditionCostMultiplier ?? 1.5)
    : 1;
  return base.mul(mult).floor();
}

/** Astronauts required to send on expedition (risk: some may die; if all die, planet not discovered). */
export function getExpeditionAstronautsRequired(planetCount: number): number {
  return Math.min(B.expeditionMinAstronauts + Math.floor(planetCount / 2), B.expeditionMaxAstronauts);
}

/** Expedition duration reduction per pilot (0–1). E.g. 0.08 = 8% shorter per pilot. Capped so duration is at least 50% of base. */
const PILOT_DURATION_REDUCTION = B.pilotExpeditionDurationReductionPerPilot ?? 0.08;
const PILOT_DURATION_MAX_REDUCTION = 0.5;

/** Expedition duration in ms. Mining uses fixed tier duration; Scout/Rescue use planet-based formula with tier+type multipliers. */
export function getExpeditionDurationMs(
  planetCount: number,
  tierId?: ExpeditionTierId | string,
  pilotCount: number = 0,
  researchDurationPercent: number = 0,
  typeId?: ExpeditionTypeId | string
): number {
  if (typeId === 'mining') return getMiningExpeditionDurationMs(tierId ?? 'medium', pilotCount, researchDurationPercent);
  const base = B.expeditionDurationBaseMs ?? 20000;
  const perPlanet = B.expeditionDurationPerPlanetMs ?? 8000;
  const raw = base + planetCount * perPlanet;
  const tier = tierId ? getExpeditionTier(tierId) : undefined;
  const tierMult = tier?.durationMultiplier ?? 1;
  const type = typeId ? getExpeditionType(typeId) : undefined;
  const typeMult = type?.durationMultiplier ?? 1;
  const pilotReduction = Math.min(pilotCount * PILOT_DURATION_REDUCTION, PILOT_DURATION_MAX_REDUCTION);
  const durationMult = 1 - pilotReduction;
  const researchMult = 1 + researchDurationPercent / 100;
  return Math.max(1000, Math.round(raw * tierMult * typeMult * durationMult * researchMult));
}

export const PILOT_EXPEDITION_DURATION_REDUCTION_PCT = Math.round(PILOT_DURATION_REDUCTION * 100);

/** Per-astronaut death chance during expedition (0–1). Each rolls independently. */
export const EXPEDITION_DEATH_CHANCE = B.expeditionDeathChance;

/** Minimum death chance (0–1). */
export const EXPEDITION_MIN_DEATH_CHANCE = B.expeditionMinDeathChance ?? 0.05;

/** Death chance reduction per medic in expedition (0–1). E.g. 0.02 = 2% less per medic. */
const MEDIC_DEATH_REDUCTION = B.expeditionMedicDeathChanceReductionPerMedic ?? 0.02;

/** Effective expedition death chance given number of medics. Optional tierId and typeId apply multipliers. researchDeathChancePercent: from research (negative = safer). */
export function getExpeditionDeathChanceWithMedics(
  medicCount: number,
  tierId?: ExpeditionTierId | string,
  researchDeathChancePercent: number = 0,
  typeId?: ExpeditionTypeId | string
): number {
  const base = Math.max(
    EXPEDITION_MIN_DEATH_CHANCE,
    EXPEDITION_DEATH_CHANCE - medicCount * MEDIC_DEATH_REDUCTION
  );
  const tier = tierId ? getExpeditionTier(tierId) : undefined;
  const tierMult = tier?.deathChanceMultiplier ?? 1;
  const type = typeId ? getExpeditionType(typeId) : undefined;
  const typeMult = type?.deathChanceMultiplier ?? 1;
  const researchMult = 1 + researchDeathChancePercent / 100;
  return Math.min(1, Math.max(EXPEDITION_MIN_DEATH_CHANCE, base * tierMult * typeMult * researchMult));
}

/** Production bonus per planet (e.g. 0.05 = +5% per extra planet). First planet is base, each additional adds this. */
export const PLANET_PRODUCTION_BONUS = B.planetProductionBonus;

/** Production bonus per prestige level (e.g. 0.07 = +7% per level). Applied after planet bonus. */
export const PRESTIGE_BONUS_PER_LEVEL = B.prestigeBonusPerLevel;

/** Production bonus per planet discovered (banked at prestige). E.g. 0.01 = +1% per planet. */
export const PRESTIGE_PLANET_BONUS_PER_PLANET = B.prestigePlanetBonusPerPlanet ?? 0.01;

/** Production bonus per research node completed (banked at prestige). E.g. 0.005 = +0.5% per node. */
export const PRESTIGE_RESEARCH_BONUS_PER_NODE = B.prestigeResearchBonusPerNode ?? 0.005;

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
  return PLANET_NAMES[index] ?? generatePlanetName(`planet-${index + 1}`);
}

/** Syllables for procedural planet names (sci-fi sounding, CV/CVC style). */
const SYLLABLES = [
  'ti', 'ta', 'to', 'te', 'nu', 'na', 'no', 'ne', 'kel', 'kor', 'vor', 'vex', 'xan', 'zeph', 'nex',
  'orb', 'pyre', 'rime', 'dra', 'dro', 'kri', 'frost', 'sol', 'void', 'stel', 'las', 'pri', 'mak',
  'dar', 'tor', 'nox', 'ris', 'thu', 'ward', 'ymir', 'bel', 'cor', 'dawn', 'fal', 'gate', 'hol',
  'isle', 'jun', 'keep', 'lo', 'cus', 'hav', 'en', 'vein', 'drift', 'ring', 'forge', 'edge', 'rest',
  'light', 'reach', 'aes', 'ther', 'bor', 'cin', 'der', 'em', 'ber', 'flux', 'gla', 'ion', 'jade',
  'umb', 'ra', 'qui', 'zar', 'vel', 'wyn', 'ox', 'yr', 'ath', 'mor', 'syl', 'vek', 'ryn', 'zel',
];

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
  return h >>> 0;
}

/** Picks a deterministic syllable index from a seed (0..n-1). */
function pickSyllable(seed: number, n: number): number {
  return ((seed >>> 0) % n + n) % n;
}

/** Builds one word from 2–3 syllables, capitalized. */
function wordFromSyllables(h: number, len: 2 | 3): string {
  const n = SYLLABLES.length;
  const s1 = SYLLABLES[pickSyllable(h, n)];
  const s2 = SYLLABLES[pickSyllable(h >> 8, n)];
  const raw = len === 3 ? s1 + s2 + SYLLABLES[pickSyllable(h >> 16, n)] : s1 + s2;
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Deterministic planet name from id: same id always yields the same name. Generated by syllables (e.g. "planet-3" → "Kelvor Noxris"). */
export function generatePlanetName(planetId: string): string {
  const id = typeof planetId === 'string' ? planetId : String(planetId ?? '');
  const h = hash(id);
  const word1 = wordFromSyllables(h, (h & 1) === 0 ? 2 : 3);
  const word2 = wordFromSyllables(h >>> 16, ((h >> 17) & 1) === 0 ? 2 : 3);
  return `${word1} ${word2}`;
}

/** Crew: astronauts. Production bonus per astronaut (e.g. 0.02 = +2% each). Legacy / fallback. */
export const ASTRONAUT_PRODUCTION_BONUS = B.astronautProductionBonus;

/** Production bonus per miner (e.g. 0.02 = +2% each). */
export const MINER_PRODUCTION_BONUS = B.minerProductionBonus ?? 0.02;

/** Production bonus per non-miner, non-engineer crew (scientist, pilot, medic). */
export const OTHER_CREW_PRODUCTION_BONUS = B.otherCrewProductionBonus ?? 0.01;

/** Production bonus per engineer (e.g. 0.012 = +1.2% each). */
export const ENGINEER_PRODUCTION_BONUS = B.engineerProductionBonus ?? 0.012;

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

/** Partial progress: +this much to success chance per failed attempt (capped by researchPartialProgressMaxChanceBonus). */
export const RESEARCH_PARTIAL_PROGRESS_PER_FAILURE = B.researchPartialProgressPerFailure ?? 0.12;
export const RESEARCH_PARTIAL_PROGRESS_MAX_CHANCE_BONUS = B.researchPartialProgressMaxChanceBonus ?? 0.15;
/** After this many failures on same node, next attempt is guaranteed success. */
export const RESEARCH_PITY_FAILURES = B.researchPityFailures ?? 4;
/** Cost multiplier reduction per failure (e.g. 0.1 = 10% cheaper next try). */
export const RESEARCH_COST_REDUCTION_PER_FAILURE = B.researchCostReductionPerFailure ?? 0.1;
export const RESEARCH_COST_MIN_MULTIPLIER = B.researchCostMinMultiplier ?? 0.5;
/** Research progress bar: base duration (ms). */
export const RESEARCH_DURATION_BASE_MS = B.researchDurationBaseMs ?? 2500;
export const RESEARCH_DURATION_PER_ROW_MS = B.researchDurationPerRowMs ?? 200;
export const RESEARCH_SCIENTIST_DURATION_REDUCTION_PER_SCIENTIST = B.researchScientistDurationReductionPerScientist ?? 0.05;
export const RESEARCH_SCIENTIST_DURATION_CAP = B.researchScientistDurationCap ?? 0.5;
/** Prestige research points gained per prestige (spend for guaranteed success). */
export const PRESTIGE_RESEARCH_POINTS_PER_PRESTIGE = B.prestigeResearchPointsPerPrestige ?? 1;
/** Research data granted per successful expedition. */
export const RESEARCH_DATA_PER_EXPEDITION_SUCCESS = B.researchDataPerExpeditionSuccess ?? 1;
export const RESEARCH_BRANCH_BONUS_PRODUCTION_PERCENT = B.researchBranchBonusProductionPercent ?? 2;
export const RESEARCH_BRANCH_BONUS_CLICK_PERCENT = B.researchBranchBonusClickPercent ?? 1;

/** Crew capacity added per housing module built on any planet. */
export const HOUSING_ASTRONAUT_CAPACITY = B.housingAstronautCapacity;

/** Max total astronauts (free + assigned) from planets and housing. researchCapacityBonus: extra from research. */
export function getMaxAstronauts(planetCount: number, housingCount: number = 0, researchCapacityBonus: number = 0): number {
  const base = Math.max(B.maxAstronautsBase, B.maxAstronautsBase * planetCount);
  return base + housingCount * B.housingAstronautCapacity + researchCapacityBonus;
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

/** Flat coin cost to retrain one crew from one role to another. */
export function getRetrainCost(): Decimal {
  return new Decimal(B.crewRetrainBaseCost ?? 1500).floor();
}
