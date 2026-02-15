/**
 * Scientific Research: skill tree (Skyrim/PoE style). Spend coins to attempt unlocking nodes;
 * each attempt has a success chance; on failure coins are lost. Nodes grant modifiers (+% production, +% click, slot-free upgrades).
 */
import researchData from '../data/research.json';
import { getUpgradeUsesSlot, UPGRADE_CATALOG } from './catalogs.js';
import type { Planet } from '../domain/entities/Planet.js';
import type { Player } from '../domain/entities/Player.js';

export const RESEARCH_STORAGE_KEY = 'stellar-miner-research';

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

export function getUnlockedResearch(): string[] {
  return loadUnlocked();
}

/** Production multiplier from all unlocked research (1 + sum of productionPercent / 100). */
export function getResearchProductionMultiplier(): number {
  const unlocked = loadUnlocked();
  let total = 0;
  for (const node of RESEARCH_CATALOG) {
    if (unlocked.includes(node.id) && node.modifiers.productionPercent != null) {
      total += node.modifiers.productionPercent;
    }
  }
  return 1 + total / 100;
}

/** Click reward multiplier from all unlocked research (1 + sum of clickPercent / 100). */
export function getResearchClickMultiplier(): number {
  const unlocked = loadUnlocked();
  let total = 0;
  for (const node of RESEARCH_CATALOG) {
    if (unlocked.includes(node.id) && node.modifiers.clickPercent != null) {
      total += node.modifiers.clickPercent;
    }
  }
  return 1 + total / 100;
}

/** Total +% production from research (e.g. 15 for +15%). */
export function getResearchProductionPercent(): number {
  return (getResearchProductionMultiplier() - 1) * 100;
}

/** Total +% click from research (e.g. 12 for +12%). */
export function getResearchClickPercent(): number {
  return (getResearchClickMultiplier() - 1) * 100;
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

/** Used slots on a planet (effective slot cost per upgrade + housing). */
export function getEffectiveUsedSlots(planet: Planet): number {
  const slotCost = planet.upgrades.reduce((sum, u) => sum + getEffectiveSlotCost(u.id), 0);
  return slotCost + planet.housingCount;
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

/** For each gap between rows, returns segments to draw: parent index in row above, child index in row below. */
export function getResearchBranchSegments(): { fromIdx: number; toIdx: number }[][] {
  const rows = getResearchTreeRows();
  const out: { fromIdx: number; toIdx: number }[][] = [];
  for (let r = 0; r < rows.length - 1; r++) {
    const parentRow = rows[r];
    const childRow = rows[r + 1];
    const segments: { fromIdx: number; toIdx: number }[] = [];
    childRow.forEach((child, toIdx) => {
      for (const prereqId of child.prerequisites) {
        const fromIdx = parentRow.findIndex((n) => n.id === prereqId);
        if (fromIdx >= 0) segments.push({ fromIdx, toIdx });
      }
    });
    out.push(segments);
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

export function canAttemptResearch(id: string): boolean {
  const unlocked = loadUnlocked();
  const node = RESEARCH_CATALOG.find((n) => n.id === id);
  if (!node) return false;
  if (unlocked.includes(id)) return false;
  for (const prereq of node.prerequisites) {
    if (!unlocked.includes(prereq)) return false;
  }
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

/** Optional: (upgradeId, kind, reduction amount) => display line for success message. */
export type GetUpgradeDisplayLine = (upgradeId: string, kind: 'slot' | 'crew', n: number) => string;

export function attemptResearch(
  id: string,
  spendCoins: (amount: number) => boolean,
  getUpgradeDisplayLine?: GetUpgradeDisplayLine
): { success: boolean; message: string } {
  const node = RESEARCH_CATALOG.find((n) => n.id === id);
  if (!node) return { success: false, message: 'Unknown research.' };
  if (!canAttemptResearch(id)) return { success: false, message: 'Prerequisites not met or already unlocked.' };
  if (!spendCoins(node.cost)) return { success: false, message: 'Not enough coins.' };
  const success = Math.random() < node.successChance;
  if (success) {
    const unlocked = loadUnlocked();
    unlocked.push(id);
    saveUnlocked(unlocked);
    const mods: string[] = [];
    if (node.modifiers.productionPercent) mods.push(`+${node.modifiers.productionPercent}% production`);
    if (node.modifiers.clickPercent) mods.push(`+${node.modifiers.clickPercent}% click`);
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
  return { success: false, message: 'Research failed. Coins spent. Try again.' };
}

export function clearResearch(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(RESEARCH_STORAGE_KEY);
}

/** True while the "construction" progress bar is running; skip re-rendering research list. */
let researchInProgress = false;
export function isResearchInProgress(): boolean {
  return researchInProgress;
}
export function setResearchInProgress(value: boolean): void {
  researchInProgress = value;
}
