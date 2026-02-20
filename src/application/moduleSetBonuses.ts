/**
 * Module set bonuses: when N modules (single type or mix from a list) are on the same planet,
 * optionally restricted by planet type, a production bonus applies.
 * Config in data/moduleSetBonuses.json; applied as a global multiplier to effective production.
 */

import type { Planet } from '../domain/entities/Planet.js';
import type { Player } from '../domain/entities/Player.js';
import { UPGRADE_CATALOG } from './catalogs.js';
import { getPlanetType } from './planetAffinity.js';
import { getSession, getNarratorShown, addDiscoveredSetId } from './gameState.js';
import { tryShowNarrator } from './narrator.js';
import moduleSetBonusesData from '../data/moduleSetBonuses.json';

export type ModuleSetBonusDef = {
  /** Single module (use this or moduleIds, not both). */
  moduleId?: string;
  /** Multiple modules: combined count of any of these satisfies the set. */
  moduleIds?: string[];
  /** If set, bonus only applies on these planet types (e.g. ["rocky", "volcanic"]). Omit for any planet. */
  planetTypes?: string[];
  requiredCount: number;
  productionBonusPercent: number;
};

type NormalizedDef = {
  moduleIds: string[];
  planetTypes: string[] | null;
  requiredCount: number;
  productionBonusPercent: number;
};

export type ActiveSetBonus = {
  moduleId: string;
  moduleName: string;
  count: number;
  bonusPercent: number;
  /** When set, bonus only applies on these planet types (for UI hint). */
  planetTypes?: string[];
};

export type PotentialSetBonus = {
  moduleId: string;
  moduleName: string;
  current: number;
  required: number;
  bonusPercent: number;
  planetTypes?: string[];
};

function normalizeDef(raw: ModuleSetBonusDef): NormalizedDef | null {
  const ids = raw.moduleIds ?? (raw.moduleId ? [raw.moduleId] : []);
  if (ids.length === 0) return null;
  const planetTypes = raw.planetTypes && raw.planetTypes.length > 0 ? raw.planetTypes : null;
  return {
    moduleIds: ids,
    planetTypes,
    requiredCount: raw.requiredCount,
    productionBonusPercent: raw.productionBonusPercent,
  };
}

const CONFIG: NormalizedDef[] = (moduleSetBonusesData as ModuleSetBonusDef[])
  .map(normalizeDef)
  .filter((d): d is NormalizedDef => d !== null);

const SET_DEF_ID_PREFIX = 'set-';

function getConfig(): NormalizedDef[] {
  return CONFIG;
}

/** Stable id for a set bonus def (index-based). Used for persistence and Archive display. */
export function getSetDefId(index: number): string {
  return `${SET_DEF_ID_PREFIX}${index}`;
}

export type SetBonusCatalogEntry = NormalizedDef & { id: string; moduleName: string };

/** All set bonus defs with stable id and display name for UI. */
export function getSetBonusCatalog(): SetBonusCatalogEntry[] {
  return CONFIG.map((def, i) => ({
    ...def,
    id: getSetDefId(i),
    moduleName: getModuleDisplayName(def.moduleIds),
  }));
}

function getModuleName(moduleId: string): string {
  const def = UPGRADE_CATALOG.find((d) => d.id === moduleId);
  return def?.name ?? moduleId;
}

function getModuleDisplayName(moduleIds: string[]): string {
  return moduleIds.map(getModuleName).join(' / ');
}

/** Count installed copies of each module on a planet (only installed, not installing). */
function countModulesOnPlanet(planet: Planet): Map<string, number> {
  const counts = new Map<string, number>();
  for (const u of planet.upgrades) {
    counts.set(u.id, (counts.get(u.id) ?? 0) + 1);
  }
  return counts;
}

/** Combined count for a list of module ids on this planet. */
function getCombinedCount(counts: Map<string, number>, moduleIds: string[]): number {
  return moduleIds.reduce((sum, id) => sum + (counts.get(id) ?? 0), 0);
}

function planetMatchesType(planet: Planet, planetTypes: string[] | null): boolean {
  if (!planetTypes) return true;
  const type = getPlanetType(planet.name);
  return planetTypes.includes(type);
}

/** Completed set bonuses on this planet (active). */
export function getCompletedSetBonusesForPlanet(planet: Planet): ActiveSetBonus[] {
  const counts = countModulesOnPlanet(planet);
  const result: ActiveSetBonus[] = [];
  for (const def of getConfig()) {
    if (!planetMatchesType(planet, def.planetTypes)) continue;
    const count = getCombinedCount(counts, def.moduleIds);
    if (count >= def.requiredCount) {
      result.push({
        moduleId: def.moduleIds[0] ?? '',
        moduleName: getModuleDisplayName(def.moduleIds),
        count,
        bonusPercent: def.productionBonusPercent,
        planetTypes: def.planetTypes ?? undefined,
      });
    }
  }
  return result;
}

/** Potential set bonuses on this planet (current < required). */
export function getPotentialSetBonusesForPlanet(planet: Planet): PotentialSetBonus[] {
  const counts = countModulesOnPlanet(planet);
  const result: PotentialSetBonus[] = [];
  for (const def of getConfig()) {
    if (!planetMatchesType(planet, def.planetTypes)) continue;
    const count = getCombinedCount(counts, def.moduleIds);
    if (count > 0 && count < def.requiredCount) {
      result.push({
        moduleId: def.moduleIds[0] ?? '',
        moduleName: getModuleDisplayName(def.moduleIds),
        current: count,
        required: def.requiredCount,
        bonusPercent: def.productionBonusPercent,
        planetTypes: def.planetTypes ?? undefined,
      });
    }
  }
  return result;
}

/** Global multiplier from all completed set bonuses across all planets (1 + sum of bonus/100). */
export function getSetBonusMultiplier(player: Player): number {
  let factor = 0;
  for (const planet of player.planets) {
    for (const active of getCompletedSetBonusesForPlanet(planet)) {
      factor += active.bonusPercent / 100;
    }
  }
  return 1 + factor;
}

/** Total number of active set bonuses across all planets (each completed set on each planet counts). */
export function getTotalActiveSetCount(player: Player): number {
  let count = 0;
  for (const planet of player.planets) {
    count += getCompletedSetBonusesForPlanet(planet).length;
  }
  return count;
}

/** Total set bonus factor as decimal (e.g. 0.15 for +15%). */
export function getSetBonusFactor(player: Player): number {
  const mult = getSetBonusMultiplier(player);
  return mult <= 1 ? 0 : mult - 1;
}

const SET_BONUS_NARRATOR_THRESHOLDS: { trigger: string; countMin: number }[] = [
  { trigger: 'first_set_bonus', countMin: 1 },
  { trigger: 'set_bonus_3', countMin: 3 },
  { trigger: 'set_bonus_5', countMin: 5 },
  { trigger: 'set_bonus_10', countMin: 10 },
];

const SET_BONUS_PCT_NARRATOR_THRESHOLDS: { trigger: string; pctMin: number }[] = [
  { trigger: 'set_bonus_15pct', pctMin: 15 },
  { trigger: 'set_bonus_30pct', pctMin: 30 },
  { trigger: 'set_bonus_50pct', pctMin: 50 },
];

/** Set def ids that are currently completed on at least one planet. */
export function getActiveSetDefIds(player: Player): string[] {
  const ids: string[] = [];
  for (let i = 0; i < CONFIG.length; i++) {
    const def = CONFIG[i];
    for (const planet of player.planets) {
      if (!planetMatchesType(planet, def.planetTypes)) continue;
      const counts = countModulesOnPlanet(planet);
      const count = getCombinedCount(counts, def.moduleIds);
      if (count >= def.requiredCount) {
        ids.push(getSetDefId(i));
        break;
      }
    }
  }
  return ids;
}

/** Merge currently active set bonuses into discovered set ids (persisted). Call from game loop. */
export function mergeDiscoveredSetBonuses(player: Player): void {
  for (const id of getActiveSetDefIds(player)) {
    addDiscoveredSetId(id);
  }
}

export type DiscoveredSetDisplay = {
  id: string;
  moduleName: string;
  bonusPercent: number;
  requiredCount: number;
  planetTypes: string[] | null;
};

/** Display list for discovered set ids (for Archive → Sets). Preserves discovery order. */
export function getDiscoveredSetsDisplay(discoveredIds: string[]): DiscoveredSetDisplay[] {
  const catalog = getSetBonusCatalog();
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const result: DiscoveredSetDisplay[] = [];
  for (const id of discoveredIds) {
    const entry = byId.get(id);
    if (!entry) continue;
    result.push({
      id: entry.id,
      moduleName: entry.moduleName,
      bonusPercent: entry.productionBonusPercent,
      requiredCount: entry.requiredCount,
      planetTypes: entry.planetTypes,
    });
  }
  return result;
}

/** If set bonuses are active, show one narrator toast per call for first-time and count/percent milestones. Call from game loop. */
export function checkSetBonusNarrator(): void {
  const session = getSession();
  if (!session) return;
  const player = session.player;
  if (getSetBonusMultiplier(player) <= 1) return;
  const shown = getNarratorShown();
  const totalCount = getTotalActiveSetCount(player);
  const totalPct = getSetBonusFactor(player) * 100;
  for (const { trigger, countMin } of SET_BONUS_NARRATOR_THRESHOLDS) {
    if (totalCount >= countMin && !shown.includes(trigger)) {
      tryShowNarrator(trigger);
      return;
    }
  }
  for (const { trigger, pctMin } of SET_BONUS_PCT_NARRATOR_THRESHOLDS) {
    if (totalPct >= pctMin && !shown.includes(trigger)) {
      tryShowNarrator(trigger);
      return;
    }
  }
}
