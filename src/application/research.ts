/**
 * Scientific Research: skill tree (Skyrim/PoE style). Spend coins to attempt unlocking nodes;
 * each attempt has a success chance; on failure coins are lost. Nodes grant modifiers (+% production, +% click, slot-free upgrades).
 */
import researchData from '../data/research.json';
import researchIconMappingData from '../data/researchIconMapping.json';
import { getUpgradeUsesSlot, UPGRADE_CATALOG } from './catalogs.js';
import {
  SCIENTIST_RESEARCH_SUCCESS_PER_SCIENTIST,
  SCIENTIST_RESEARCH_SUCCESS_CAP,
  PRESTIGE_CLICK_BONUS_PERCENT_PER_LEVEL,
  RESEARCH_PARTIAL_PROGRESS_PER_FAILURE,
  RESEARCH_PARTIAL_PROGRESS_MAX_CHANCE_BONUS,
  RESEARCH_PITY_FAILURES,
  RESEARCH_COST_REDUCTION_PER_FAILURE,
  RESEARCH_COST_MIN_MULTIPLIER,
  RESEARCH_DURATION_BASE_MS,
  RESEARCH_DURATION_PER_ROW_MS,
  RESEARCH_SCIENTIST_DURATION_REDUCTION_PER_SCIENTIST,
  RESEARCH_SCIENTIST_DURATION_CAP,
  RESEARCH_BRANCH_BONUS_PRODUCTION_PERCENT,
  RESEARCH_BRANCH_BONUS_CLICK_PERCENT,
  type CrewJobRole,
  CREW_JOB_ROLES,
} from '../domain/constants.js';
import type { Planet } from '../domain/entities/Planet.js';
import type { Player } from '../domain/entities/Player.js';
import { t, tParam } from './strings.js';
import type { StringKey } from './strings.js';

export const RESEARCH_STORAGE_KEY = 'stellar-miner-research';
export const RESEARCH_PROGRESS_STORAGE_KEY = 'stellar-miner-research-progress';
export const PRESTIGE_RESEARCH_POINTS_KEY = 'stellar-miner-prestige-research-points';
export const RESEARCH_TIER_COLLAPSED_KEY = 'stellar-miner-research-tier-collapsed';

export function loadCollapsedTiers(): Set<number> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(RESEARCH_TIER_COLLAPSED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    return new Set(Array.isArray(arr) ? arr.filter((x): x is number => typeof x === 'number') : []);
  } catch {
    return new Set();
  }
}

export function saveCollapsedTiers(collapsed: Set<number>): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(RESEARCH_TIER_COLLAPSED_KEY, JSON.stringify([...collapsed]));
}

export type ResearchModifiers = {
  /** Additive percent applied to production (e.g. 5 => +5%). */
  productionPercent?: number;
  /** Additive percent applied to click reward (e.g. 3 => +3%). */
  clickPercent?: number;
  /** Upgrade ids that no longer use a planet slot when this node is unlocked (reduction of 1). */
  slotFreeUpgrades?: string[];
  /** Per-upgrade slot cost reduction from this node (e.g. { "drill-mk2": 1 } => uses 1 fewer slot). */
  slotReduction?: Record<string, number>;
  /** Upgrade ids that no longer require crew when this node is unlocked (full reduction to 0). */
  crewFreeUpgrades?: string[];
  /** Per-upgrade crew requirement reduction from this node (e.g. { "orbital-station": 1 } => 1 fewer crew). */
  crewReduction?: Record<string, number>;
  /** Crew job role unlocked when this node is unlocked (e.g. "miner" → can hire Miners). */
  unlocksCrewRole?: CrewJobRole;
  /** When true, unlocks crew retrain (spend coins to change one crew role to another). */
  unlocksCrewRetrain?: boolean;
  /** Expedition duration modifier: negative = faster (e.g. -5 => 5% shorter). */
  expeditionDurationPercent?: number;
  /** Expedition death chance modifier: negative = safer (e.g. -3 => 3% less). */
  expeditionDeathChancePercent?: number;
  /** Extra crew capacity from housing (flat +N). */
  housingCapacityBonus?: number;
};

export type ResearchNode = {
  id: string;
  name: string;
  description: string;
  cost: number;
  /** 0–1. On failure, coins are lost and player can retry. */
  successChance: number;
  /** Required research ids (all must be unlocked first). Enables tree branching. */
  prerequisites: string[];
  /** Bonuses granted when this node is unlocked. */
  modifiers: ResearchModifiers;
  /** Row in the tree (0 = root). Used for layout. */
  row: number;
  /** Column index in the row (left to right). */
  col: number;
  /** Logical branch for progression: core (root), crew, modules, expeditions. Used for branch completion bonuses. */
  branch?: 'core' | 'crew' | 'modules' | 'expeditions';
  /** Optional: research data cost (from expeditions) in addition to coins. */
  researchDataCost?: number;
  /** Optional: hidden until prerequisites are visible (side branch). */
  secret?: boolean;
  /** Optional: short lore or flavour line (en/fr via i18n). */
  lore?: string;
};

export const RESEARCH_CATALOG: ResearchNode[] = researchData as ResearchNode[];

function loadUnlocked(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RESEARCH_STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveUnlocked(ids: string[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(RESEARCH_STORAGE_KEY, JSON.stringify(ids));
}

export type ResearchProgressState = {
  researchData: number;
  nodeProgress: Record<string, { failures: number }>;
};

function loadResearchProgress(): ResearchProgressState {
  if (typeof localStorage === 'undefined') return { researchData: 0, nodeProgress: {} };
  try {
    const raw = localStorage.getItem(RESEARCH_PROGRESS_STORAGE_KEY);
    if (!raw) return { researchData: 0, nodeProgress: {} };
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return { researchData: 0, nodeProgress: {} };
    const o = parsed as Record<string, unknown>;
    const researchData = typeof o.researchData === 'number' && o.researchData >= 0 ? o.researchData : 0;
    const nodeProgress: Record<string, { failures: number }> = {};
    if (o.nodeProgress && typeof o.nodeProgress === 'object') {
      for (const [id, v] of Object.entries(o.nodeProgress)) {
        if (v && typeof v === 'object' && typeof (v as { failures?: number }).failures === 'number') {
          const f = (v as { failures: number }).failures;
          if (f >= 0) nodeProgress[id] = { failures: f };
        }
      }
    }
    return { researchData, nodeProgress };
  } catch {
    return { researchData: 0, nodeProgress: {} };
  }
}

function saveResearchProgress(state: ResearchProgressState): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(RESEARCH_PROGRESS_STORAGE_KEY, JSON.stringify(state));
}

/** Current progress state (for save/load). */
export function getResearchProgressState(): ResearchProgressState {
  return loadResearchProgress();
}

/** Restore progress state (on import). */
export function setResearchProgressState(state: ResearchProgressState): void {
  saveResearchProgress(state);
}

export function getResearchData(): number {
  return loadResearchProgress().researchData;
}

export function addResearchData(amount: number): void {
  const state = loadResearchProgress();
  state.researchData = Math.max(0, state.researchData + amount);
  saveResearchProgress(state);
}

function getFailureCount(nodeId: string): number {
  return loadResearchProgress().nodeProgress[nodeId]?.failures ?? 0;
}

function incrementFailureCount(nodeId: string): void {
  const state = loadResearchProgress();
  const current = state.nodeProgress[nodeId]?.failures ?? 0;
  state.nodeProgress[nodeId] = { failures: current + 1 };
  saveResearchProgress(state);
}

function clearFailureCount(nodeId: string): void {
  const state = loadResearchProgress();
  delete state.nodeProgress[nodeId];
  saveResearchProgress(state);
}

export function getPrestigeResearchPoints(): number {
  if (typeof localStorage === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(PRESTIGE_RESEARCH_POINTS_KEY);
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function addPrestigeResearchPoints(amount: number): void {
  if (typeof localStorage === 'undefined') return;
  const n = Math.max(0, getPrestigeResearchPoints() + amount);
  localStorage.setItem(PRESTIGE_RESEARCH_POINTS_KEY, String(n));
}

export function spendPrestigeResearchPoint(): boolean {
  const current = getPrestigeResearchPoints();
  if (current < 1) return false;
  if (typeof localStorage === 'undefined') return false;
  localStorage.setItem(PRESTIGE_RESEARCH_POINTS_KEY, String(current - 1));
  return true;
}

export function getUnlockedResearch(): string[] {
  return loadUnlocked();
}

/** Crew job roles unlockable via research (miner, scientist, pilot). Astronaut is always available when Crew section is unlocked. */
export function getUnlockedCrewRoles(): CrewJobRole[] {
  const unlocked = loadUnlocked();
  const roles: CrewJobRole[] = [];
  for (const node of RESEARCH_CATALOG) {
    if (unlocked.includes(node.id)) {
      const role = node.modifiers.unlocksCrewRole;
      if (role && CREW_JOB_ROLES.includes(role) && !roles.includes(role)) roles.push(role);
    }
  }
  return roles;
}

/** True when any unlocked research node has unlocksCrewRetrain (enables retrain crew UI and handler). */
export function isCrewRetrainUnlocked(): boolean {
  const unlocked = loadUnlocked();
  return RESEARCH_CATALOG.some(
    (node) => unlocked.includes(node.id) && node.modifiers.unlocksCrewRetrain === true
  );
}

/** Branches: when all node ids in a branch are unlocked, grant bonus. Crew/Modules/Expeditions align with research node branch field. */
const RESEARCH_BRANCHES: Array<{ nodeIds: string[]; productionPercent?: number; clickPercent?: number }> = [
  { nodeIds: ['basic-refining', 'crew-quarters', 'orbital-engineering', 'efficiency', 'precision-drilling', 'crew-retraining', 'veteran-protocols'], productionPercent: RESEARCH_BRANCH_BONUS_PRODUCTION_PERCENT },
  { nodeIds: ['survey-systems', 'faster-probes', 'survival-training', 'long-range-comms', 'field-medics', 'expedition-ai'], productionPercent: RESEARCH_BRANCH_BONUS_PRODUCTION_PERCENT },
  { nodeIds: ['automation', 'ai-assist', 'neural-boost'], productionPercent: RESEARCH_BRANCH_BONUS_PRODUCTION_PERCENT, clickPercent: RESEARCH_BRANCH_BONUS_CLICK_PERCENT },
  { nodeIds: ['heavy-equipment', 'deep-extraction', 'quantum-mining'], productionPercent: RESEARCH_BRANCH_BONUS_PRODUCTION_PERCENT },
  { nodeIds: ['catalytic-cracking', 'plasma-smelting', 'plasma-catalysis'], productionPercent: RESEARCH_BRANCH_BONUS_PRODUCTION_PERCENT },
];

function getBranchBonusProductionPercent(): number {
  const unlocked = loadUnlocked();
  let total = 0;
  for (const branch of RESEARCH_BRANCHES) {
    if (branch.nodeIds.every((id) => unlocked.includes(id)) && branch.productionPercent != null) {
      total += branch.productionPercent;
    }
  }
  return total;
}

function getBranchBonusClickPercent(): number {
  const unlocked = loadUnlocked();
  let total = 0;
  for (const branch of RESEARCH_BRANCHES) {
    if (branch.nodeIds.every((id) => unlocked.includes(id)) && branch.clickPercent != null) {
      total += branch.clickPercent;
    }
  }
  return total;
}

/** Sum of a percent modifier from all unlocked nodes (e.g. productionPercent or clickPercent) plus branch bonuses. */
function sumUnlockedModifierPercent(key: 'productionPercent' | 'clickPercent'): number {
  const unlocked = loadUnlocked();
  let total = 0;
  for (const node of RESEARCH_CATALOG) {
    if (unlocked.includes(node.id)) {
      const value = node.modifiers[key];
      if (value != null) total += value;
    }
  }
  if (key === 'productionPercent') total += getBranchBonusProductionPercent();
  if (key === 'clickPercent') total += getBranchBonusClickPercent();
  return total;
}

/** Production multiplier from all unlocked research (1 + sum of productionPercent / 100). */
export function getResearchProductionMultiplier(): number {
  return 1 + sumUnlockedModifierPercent('productionPercent') / 100;
}

/** Click reward multiplier from all unlocked research (1 + sum of clickPercent / 100). */
export function getResearchClickMultiplier(): number {
  return 1 + sumUnlockedModifierPercent('clickPercent') / 100;
}

/** Total +% production from research (e.g. 15 for +15%). Rounded for display. */
export function getResearchProductionPercent(): number {
  return Math.round((getResearchProductionMultiplier() - 1) * 100);
}

/** Total +% click from research (e.g. 12 for +12%). Rounded for display. */
export function getResearchClickPercent(): number {
  return Math.round((getResearchClickMultiplier() - 1) * 100);
}

/** Expected coins per normal click (base 1 × research × prestige). Used for rate display and stats. Research always applied for display; prestige bonus only from level 2. */
export function getExpectedCoinsPerClick(prestigeLevel: number): number {
  const researchMult = getResearchClickMultiplier();
  const prestigeMult =
    prestigeLevel >= 2 ? 1 + (prestigeLevel - 1) * (PRESTIGE_CLICK_BONUS_PERCENT_PER_LEVEL / 100) : 1;
  return Math.max(1, 1 * researchMult * prestigeMult);
}

/** Research success chance multiplier from scientists (1 + scientistBonus, capped). Used in attemptResearch. */
export function getResearchSuccessChanceMultiplier(scientistCount: number): number {
  const bonus = Math.min(
    SCIENTIST_RESEARCH_SUCCESS_CAP,
    scientistCount * SCIENTIST_RESEARCH_SUCCESS_PER_SCIENTIST
  );
  return 1 + bonus;
}

/** Effective coin cost for attempting this node (reduced by previous failures; min 50% of base). */
export function getEffectiveCost(nodeId: string): number {
  const node = RESEARCH_CATALOG.find((n) => n.id === nodeId);
  if (!node) return 0;
  const failures = getFailureCount(nodeId);
  const mult = Math.max(RESEARCH_COST_MIN_MULTIPLIER, 1 - RESEARCH_COST_REDUCTION_PER_FAILURE * failures);
  return Math.max(1, Math.round(node.cost * mult));
}

/** Effective success chance (0–1) for this node: base × scientist + partial progress from failures; 1 if pity. */
export function getEffectiveSuccessChance(nodeId: string, scientistCount: number): number {
  const node = RESEARCH_CATALOG.find((n) => n.id === nodeId);
  if (!node) return 0;
  const failures = getFailureCount(nodeId);
  if (failures >= RESEARCH_PITY_FAILURES) return 1;
  const baseChance = node.successChance * getResearchSuccessChanceMultiplier(scientistCount);
  const partialBonus = Math.min(
    RESEARCH_PARTIAL_PROGRESS_MAX_CHANCE_BONUS,
    failures * RESEARCH_PARTIAL_PROGRESS_PER_FAILURE
  );
  return Math.min(1, baseChance + partialBonus);
}

/** Expected coins to unlock (effective cost / effective chance). For display. */
export function getExpectedCoinsToUnlock(nodeId: string, scientistCount: number): number {
  const chance = getEffectiveSuccessChance(nodeId, scientistCount);
  if (chance <= 0) return Infinity;
  return Math.round(getEffectiveCost(nodeId) / chance);
}

/** Research progress bar duration (ms). Base + per row, reduced by scientists (capped). */
export function getResearchDurationMs(nodeId: string, scientistCount: number): number {
  const node = RESEARCH_CATALOG.find((n) => n.id === nodeId);
  const row = node?.row ?? 0;
  const base = RESEARCH_DURATION_BASE_MS + row * RESEARCH_DURATION_PER_ROW_MS;
  const scientistReduction = Math.min(
    RESEARCH_SCIENTIST_DURATION_CAP,
    scientistCount * RESEARCH_SCIENTIST_DURATION_REDUCTION_PER_SCIENTIST
  );
  return Math.max(500, Math.round(base * (1 - scientistReduction)));
}

/** Failure count for this node (for UI / pity display). */
export function getResearchFailureCount(nodeId: string): number {
  return getFailureCount(nodeId);
}

/** Up to 3 node ids that can be attempted, sorted by expected cost (cheapest first). For "recommended" path highlight. */
export function getRecommendedResearchNodeIds(scientistCount: number): string[] {
  const attemptable = RESEARCH_CATALOG.filter((n) => canAttemptResearch(n.id))
    .map((n) => ({ id: n.id, expected: getExpectedCoinsToUnlock(n.id, scientistCount) }))
    .sort((a, b) => a.expected - b.expected);
  return attemptable.slice(0, 3).map((x) => x.id);
}

/** Sum of expedition duration percent from research (negative = faster). */
export function getResearchExpeditionDurationPercent(): number {
  const unlocked = loadUnlocked();
  let total = 0;
  for (const node of RESEARCH_CATALOG) {
    if (unlocked.includes(node.id) && node.modifiers.expeditionDurationPercent != null) {
      total += node.modifiers.expeditionDurationPercent;
    }
  }
  return total;
}

/** Sum of expedition death chance percent from research (negative = safer). */
export function getResearchExpeditionDeathChancePercent(): number {
  const unlocked = loadUnlocked();
  let total = 0;
  for (const node of RESEARCH_CATALOG) {
    if (unlocked.includes(node.id) && node.modifiers.expeditionDeathChancePercent != null) {
      total += node.modifiers.expeditionDeathChancePercent;
    }
  }
  return total;
}

/** Extra crew capacity from research (flat bonus). */
export function getResearchHousingCapacityBonus(): number {
  const unlocked = loadUnlocked();
  let total = 0;
  for (const node of RESEARCH_CATALOG) {
    if (unlocked.includes(node.id) && node.modifiers.housingCapacityBonus != null) {
      total += node.modifiers.housingCapacityBonus;
    }
  }
  return total;
}

/** All upgrade ids that no longer use a slot thanks to unlocked research. */
export function getSlotFreeUpgradeIdsFromResearch(): string[] {
  const unlocked = loadUnlocked();
  const ids: string[] = [];
  for (const node of RESEARCH_CATALOG) {
    if (unlocked.includes(node.id) && node.modifiers.slotFreeUpgrades?.length) {
      ids.push(...node.modifiers.slotFreeUpgrades);
    }
  }
  return ids;
}

/** All upgrade ids that no longer require crew thanks to unlocked research. */
export function getCrewFreeUpgradeIdsFromResearch(): string[] {
  const unlocked = loadUnlocked();
  const ids: string[] = [];
  for (const node of RESEARCH_CATALOG) {
    if (unlocked.includes(node.id) && node.modifiers.crewFreeUpgrades?.length) {
      ids.push(...node.modifiers.crewFreeUpgrades);
    }
  }
  return ids;
}

/** Total slot cost reduction from all unlocked research for this upgrade (slotFreeUpgrades count as 1 each). */
export function getSlotReductionFromResearch(upgradeId: string): number {
  const unlocked = loadUnlocked();
  let total = 0;
  for (const node of RESEARCH_CATALOG) {
    if (!unlocked.includes(node.id)) continue;
    if (node.modifiers.slotFreeUpgrades?.includes(upgradeId)) total += 1;
    total += node.modifiers.slotReduction?.[upgradeId] ?? 0;
  }
  return total;
}

/** Total crew requirement reduction from all unlocked research (crewFree = full base once, crewReduction sums). */
export function getCrewReductionFromResearch(upgradeId: string): number {
  const def = UPGRADE_CATALOG.find((d) => d.id === upgradeId);
  const base = def?.requiredAstronauts ?? 0;
  const crewFree = getCrewFreeUpgradeIdsFromResearch().includes(upgradeId);
  let total = crewFree ? base : 0;
  const unlocked = loadUnlocked();
  for (const node of RESEARCH_CATALOG) {
    if (!unlocked.includes(node.id)) continue;
    total += node.modifiers.crewReduction?.[upgradeId] ?? 0;
  }
  return total;
}

/** Effective slot cost for this upgrade (0 or 1). Research can reduce base 1 to 0. */
export function getEffectiveSlotCost(upgradeId: string): number {
  if (!getUpgradeUsesSlot(upgradeId)) return 0;
  const base = 1;
  return Math.max(0, base - getSlotReductionFromResearch(upgradeId));
}

/** Whether this upgrade type uses a slot after research (false = no slot, e.g. Mining Robot or research-granted). */
export function getEffectiveUpgradeUsesSlot(upgradeId: string): boolean {
  return getEffectiveSlotCost(upgradeId) > 0;
}

/** Crew (astronauts) required to buy this upgrade after research. */
export function getEffectiveRequiredAstronauts(upgradeId: string): number {
  const def = UPGRADE_CATALOG.find((d) => d.id === upgradeId);
  if (!def) return 0;
  return Math.max(0, def.requiredAstronauts - getCrewReductionFromResearch(upgradeId));
}

/** Used slots on a planet (effective slot cost per upgrade + installing + housing). */
export function getEffectiveUsedSlots(planet: Planet): number {
  const fromUpgrades = planet.upgrades.reduce((sum, u) => sum + getEffectiveSlotCost(u.id), 0);
  const fromInstalling = planet.installingUpgrades.reduce((sum, i) => sum + getEffectiveSlotCost(i.upgrade.id), 0);
  return fromUpgrades + fromInstalling + planet.housingCount;
}

/** Whether the planet has at least one free slot (effective count). */
export function hasEffectiveFreeSlot(planet: Planet): boolean {
  return getEffectiveUsedSlots(planet) < planet.maxUpgrades;
}

/** All planets that have at least one effective free slot. */
export function getPlanetsWithEffectiveFreeSlot(player: Player): Planet[] {
  return player.planets.filter(hasEffectiveFreeSlot);
}

/** First planet with an effective free slot, or null. */
export function getPlanetWithEffectiveFreeSlot(player: Player): Planet | null {
  return getPlanetsWithEffectiveFreeSlot(player)[0] ?? null;
}

/** Rows for tree layout: each element is an array of nodes in that row (left to right). */
/** Max research nodes per stage (row) in the tree. */
const MAX_NODES_PER_STAGE = 4;

export function getResearchTreeRows(): ResearchNode[][] {
  const byRow = new Map<number, ResearchNode[]>();
  for (const node of RESEARCH_CATALOG) {
    const list = byRow.get(node.row) ?? [];
    list.push(node);
    byRow.set(node.row, list);
  }
  const rows: ResearchNode[][] = [];
  const maxRow = Math.max(...byRow.keys(), 0);
  for (let r = 0; r <= maxRow; r++) {
    const list = byRow.get(r) ?? [];
    list.sort((a, b) => a.col - b.col);
    for (let i = 0; i < list.length; i += MAX_NODES_PER_STAGE) {
      rows.push(list.slice(i, i + MAX_NODES_PER_STAGE));
    }
  }
  return rows;
}

/** Research grouped by tier (tier = catalog row + 1). Each tier has display rows (chunks of up to MAX_NODES_PER_STAGE). */
export type ResearchTierGroup = { tier: number; rows: ResearchNode[][] };

export function getResearchTiers(): ResearchTierGroup[] {
  const byRow = new Map<number, ResearchNode[]>();
  for (const node of RESEARCH_CATALOG) {
    const list = byRow.get(node.row) ?? [];
    list.push(node);
    byRow.set(node.row, list);
  }
  const result: ResearchTierGroup[] = [];
  const maxRow = Math.max(...byRow.keys(), 0);
  for (let r = 0; r <= maxRow; r++) {
    const list = byRow.get(r) ?? [];
    list.sort((a, b) => a.col - b.col);
    const rows: ResearchNode[][] = [];
    for (let i = 0; i < list.length; i += MAX_NODES_PER_STAGE) {
      rows.push(list.slice(i, i + MAX_NODES_PER_STAGE));
    }
    if (rows.length > 0) result.push({ tier: r + 1, rows });
  }
  return result;
}

const RESEARCH_ICON_MAPPING: Record<string, number> =
  researchIconMappingData && typeof researchIconMappingData === 'object' && 'mapping' in researchIconMappingData
    ? (researchIconMappingData as { mapping: Record<string, number> }).mapping
    : {};

/** Sprite index for research node. Uses src/data/researchIconMapping.json if present, else catalog order. Same for list, 3D tree and hover. */
export function getResearchSpriteIndexById(nodeId: string): number {
  const fromMapping = RESEARCH_ICON_MAPPING[nodeId];
  if (typeof fromMapping === 'number' && fromMapping >= 0) return fromMapping;
  const idx = RESEARCH_CATALOG.findIndex((n) => n.id === nodeId);
  return idx >= 0 ? idx : 0;
}

/** One segment: from (fromRow, fromIdx) to (toRow, toIdx). Used so every prerequisite gets a line even across multiple rows. */
export type ResearchBranchSegment = { fromRow: number; fromIdx: number; toRow: number; toIdx: number };

/** All segments to draw: each prerequisite → child gets a segment, no matter how many rows apart. */
export function getResearchBranchSegments(): ResearchBranchSegment[] {
  const rows = getResearchTreeRows();
  const out: ResearchBranchSegment[] = [];
  for (let toRow = 1; toRow < rows.length; toRow++) {
    const childRow = rows[toRow];
    childRow.forEach((child, toIdx) => {
      for (const prereqId of child.prerequisites) {
        for (let fromRow = 0; fromRow < toRow; fromRow++) {
          const fromIdx = rows[fromRow].findIndex((n) => n.id === prereqId);
          if (fromIdx >= 0) {
            out.push({ fromRow, fromIdx, toRow, toIdx });
            break;
          }
        }
      }
    });
  }
  return out;
}

/** Ordered list of research names that must be unlocked before this one (prerequisites in row order). */
export function getUnlockPath(nodeId: string): string[] {
  const ids = getUnlockPathIds(nodeId);
  return ids.map((id) => RESEARCH_CATALOG.find((n) => n.id === id)?.name ?? id);
}

/** Ordered list of research IDs in the unlock path (prerequisites only, row order). Use with nodeId for full path. */
export function getUnlockPathIds(nodeId: string): string[] {
  const node = RESEARCH_CATALOG.find((n) => n.id === nodeId);
  if (!node || node.prerequisites.length === 0) return [];
  const seen = new Set<string>();
  function collect(id: string): void {
    const n = RESEARCH_CATALOG.find((r) => r.id === id);
    if (!n || seen.has(id)) return;
    seen.add(id);
    n.prerequisites.forEach(collect);
  }
  node.prerequisites.forEach(collect);
  return RESEARCH_CATALOG.filter((n) => seen.has(n.id))
    .sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col)
    .map((n) => n.id);
}

export function isResearchUnlocked(id: string): boolean {
  return loadUnlocked().includes(id);
}

export function canAttemptResearch(
  id: string,
  options?: { coinsAvailable?: number; researchDataAvailable?: number }
): boolean {
  const unlocked = loadUnlocked();
  const node = RESEARCH_CATALOG.find((n) => n.id === id);
  if (!node) return false;
  if (unlocked.includes(id)) return false;
  for (const prereq of node.prerequisites) {
    if (!unlocked.includes(prereq)) return false;
  }
  const cost = getEffectiveCost(id);
  if (options?.coinsAvailable != null && options.coinsAvailable < cost) return false;
  const dataCost = node.researchDataCost ?? 0;
  if (dataCost > 0 && (options?.researchDataAvailable ?? getResearchData()) < dataCost) return false;
  return true;
}

/** Slot modifier entries for a node: upgrade id and reduction amount (e.g. "uses N less slot"). */
export function getModifierSlotEntries(node: ResearchNode): { id: string; n: number }[] {
  const fromFree = (node.modifiers.slotFreeUpgrades ?? []).map((id) => ({ id, n: 1 }));
  const fromReduction = Object.entries(node.modifiers.slotReduction ?? {}).map(([id, n]) => ({ id, n }));
  return [...fromFree, ...fromReduction];
}

/** Crew modifier entries for a node: upgrade id and reduction amount (e.g. "requires N less crew"). */
export function getModifierCrewEntries(node: ResearchNode): { id: string; n: number }[] {
  const fromFree = (node.modifiers.crewFreeUpgrades ?? []).map((id) => {
    const base = UPGRADE_CATALOG.find((d) => d.id === id)?.requiredAstronauts ?? 0;
    return { id, n: base };
  });
  const fromReduction = Object.entries(node.modifiers.crewReduction ?? {}).map(([id, n]) => ({ id, n }));
  return [...fromFree, ...fromReduction];
}

/** Crew that can be unassigned from equipment when this node is unlocked (player already has the node's crew modifiers applied after save). */
export function getCrewFreedByUnlockingNode(
  node: ResearchNode,
  ownedUpgrades: { id: string }[]
): number {
  const entries = getModifierCrewEntries(node);
  let freed = 0;
  for (const { id: upgradeId, n } of entries) {
    const count = ownedUpgrades.filter((u) => u.id === upgradeId).length;
    freed += n * count;
  }
  return freed;
}

/** Optional: (upgradeId, kind, reduction amount) => display line for success message. */
export type GetUpgradeDisplayLine = (upgradeId: string, kind: 'slot' | 'crew', n: number) => string;

export function attemptResearch(
  id: string,
  spendCoins: (amount: number) => boolean,
  getUpgradeDisplayLine?: GetUpgradeDisplayLine,
  scientistCount: number = 0
): { success: boolean; message: string } {
  const node = RESEARCH_CATALOG.find((n) => n.id === id);
  if (!node) return { success: false, message: 'Unknown research.' };
  if (!canAttemptResearch(id)) return { success: false, message: 'Prerequisites not met or already unlocked.' };
  const effectiveCost = getEffectiveCost(id);
  const dataCost = node.researchDataCost ?? 0;
  if (dataCost > 0) {
    const state = loadResearchProgress();
    if (state.researchData < dataCost) return { success: false, message: 'Not enough research data.' };
    state.researchData -= dataCost;
    saveResearchProgress(state);
  }
  if (!spendCoins(effectiveCost)) return { success: false, message: 'Not enough coins.' };
  const effectiveChance = getEffectiveSuccessChance(id, scientistCount);
  const success = Math.random() < effectiveChance;
  if (success) {
    clearFailureCount(id);
    const unlocked = loadUnlocked();
    unlocked.push(id);
    saveUnlocked(unlocked);
    const mods: string[] = [];
    if (node.modifiers.productionPercent) mods.push(`+${node.modifiers.productionPercent}% production`);
    if (node.modifiers.clickPercent) mods.push(`+${node.modifiers.clickPercent}% click`);
    if (node.modifiers.unlocksCrewRole) {
      const roleKeys: Record<CrewJobRole, StringKey> = {
        miner: 'crewRoleMiner',
        scientist: 'crewRoleScientist',
        pilot: 'crewRolePilot',
        medic: 'crewRoleMedic',
        engineer: 'crewRoleEngineer',
      };
      mods.push(tParam('researchUnlocksJob', { role: t(roleKeys[node.modifiers.unlocksCrewRole]) }));
    }
    if (node.modifiers.unlocksCrewRetrain) mods.push(t('researchUnlocksCrewRetrain'));
    const slotEntries = getModifierSlotEntries(node);
    if (slotEntries.length) {
      mods.push(
        getUpgradeDisplayLine
          ? slotEntries.map(({ id: upgradeId, n }) => getUpgradeDisplayLine(upgradeId, 'slot', n)).join(', ')
          : `${slotEntries.length} upgrade(s) use fewer slot(s)`
      );
    }
    const crewEntries = getModifierCrewEntries(node);
    if (crewEntries.length) {
      mods.push(
        getUpgradeDisplayLine
          ? crewEntries.map(({ id: upgradeId, n }) => getUpgradeDisplayLine(upgradeId, 'crew', n)).join(', ')
          : `${crewEntries.length} upgrade(s) require less crew`
      );
    }
    return { success: true, message: `${node.name} complete! ${mods.join(', ')}.` };
  }
  incrementFailureCount(id);
  return { success: false, message: 'Research failed. Coins spent. Try again.' };
}

export function clearResearch(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(RESEARCH_STORAGE_KEY);
  localStorage.removeItem(RESEARCH_PROGRESS_STORAGE_KEY);
}

/** Research IDs currently running the "construction" progress bar. Enables parallel research. */
const researchInProgressIds = new Set<string>();

/** Whether any research is in progress (no arg) or this specific one (with id). */
export function isResearchInProgress(id?: string): boolean {
  if (id !== undefined) return researchInProgressIds.has(id);
  return researchInProgressIds.size > 0;
}

export function addResearchInProgress(id: string): void {
  researchInProgressIds.add(id);
}

export function removeResearchInProgress(id: string): void {
  researchInProgressIds.delete(id);
}

/** IDs of researches currently in progress (for restoring progress bars after re-render). */
export function getResearchInProgressIds(): string[] {
  return Array.from(researchInProgressIds);
}
