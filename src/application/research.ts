/**
 * Scientific Research: skill tree (Skyrim/PoE style). Spend coins to attempt unlocking nodes;
 * each attempt has a success chance; on failure coins are lost. Nodes grant modifiers (+% production, +% click).
 */

export const RESEARCH_STORAGE_KEY = 'stellar-miner-research';

export type ResearchModifiers = {
  /** Additive percent applied to production (e.g. 5 => +5%). */
  productionPercent?: number;
  /** Additive percent applied to click reward (e.g. 3 => +3%). */
  clickPercent?: number;
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

export const RESEARCH_CATALOG: ResearchNode[] = [
  {
    id: 'mining-theory',
    name: 'Mining Theory',
    description: 'Basic extraction principles. Foundation of all research.',
    cost: 1000,
    successChance: 0.85,
    prerequisites: [],
    modifiers: { productionPercent: 5 },
    row: 0,
    col: 0,
  },
  {
    id: 'heavy-equipment',
    name: 'Heavy Equipment',
    description: 'Heavy-duty drills and rigs. More raw output.',
    cost: 2500,
    successChance: 0.8,
    prerequisites: ['mining-theory'],
    modifiers: { productionPercent: 8 },
    row: 1,
    col: 0,
  },
  {
    id: 'automation',
    name: 'Automation',
    description: 'Automated systems. Slightly less production, better click yield.',
    cost: 2200,
    successChance: 0.82,
    prerequisites: ['mining-theory'],
    modifiers: { productionPercent: 4, clickPercent: 10 },
    row: 1,
    col: 1,
  },
  {
    id: 'survey-systems',
    name: 'Survey Systems',
    description: 'Prospecting and mapping. Better discovery rates.',
    cost: 2600,
    successChance: 0.8,
    prerequisites: ['mining-theory'],
    modifiers: { productionPercent: 6, clickPercent: 5 },
    row: 1,
    col: 2,
  },
  {
    id: 'basic-refining',
    name: 'Basic Refining',
    description: 'On-site ore processing. Steady production gain.',
    cost: 3000,
    successChance: 0.78,
    prerequisites: ['mining-theory'],
    modifiers: { productionPercent: 7 },
    row: 1,
    col: 3,
  },
  {
    id: 'orbital-engineering',
    name: 'Orbital Engineering',
    description: 'Station and platform tech. Big production boost.',
    cost: 10000,
    successChance: 0.74,
    prerequisites: ['heavy-equipment'],
    modifiers: { productionPercent: 12 },
    row: 2,
    col: 0,
  },
  {
    id: 'deep-extraction',
    name: 'Deep Extraction',
    description: 'Core drilling. Balanced production and click.',
    cost: 9500,
    successChance: 0.75,
    prerequisites: ['heavy-equipment'],
    modifiers: { productionPercent: 7, clickPercent: 8 },
    row: 2,
    col: 1,
  },
  {
    id: 'ai-assist',
    name: 'AI Assist',
    description: 'AI-augmented clicks. Strong click bonus.',
    cost: 8000,
    successChance: 0.76,
    prerequisites: ['automation'],
    modifiers: { productionPercent: 2, clickPercent: 15 },
    row: 2,
    col: 2,
  },
  {
    id: 'efficiency',
    name: 'Efficiency',
    description: 'Energy and process optimization. Production focus.',
    cost: 8500,
    successChance: 0.75,
    prerequisites: ['automation'],
    modifiers: { productionPercent: 10 },
    row: 2,
    col: 3,
  },
  {
    id: 'precision-drilling',
    name: 'Precision Drilling',
    description: 'Targeted extraction. Less waste, more yield.',
    cost: 9000,
    successChance: 0.74,
    prerequisites: ['survey-systems'],
    modifiers: { productionPercent: 9, clickPercent: 6 },
    row: 2,
    col: 4,
  },
  {
    id: 'catalytic-cracking',
    name: 'Catalytic Cracking',
    description: 'Advanced chemistry. Higher throughput.',
    cost: 11000,
    successChance: 0.73,
    prerequisites: ['basic-refining'],
    modifiers: { productionPercent: 11 },
    row: 2,
    col: 5,
  },
  {
    id: 'quantum-mining',
    name: 'Quantum Mining',
    description: 'Advanced harvesting. Major production.',
    cost: 45000,
    successChance: 0.68,
    prerequisites: ['orbital-engineering'],
    modifiers: { productionPercent: 15 },
    row: 3,
    col: 0,
  },
  {
    id: 'void-tech',
    name: 'Void Tech',
    description: 'Near-instant processing. Production and click.',
    cost: 42000,
    successChance: 0.67,
    prerequisites: ['orbital-engineering'],
    modifiers: { productionPercent: 9, clickPercent: 12 },
    row: 3,
    col: 1,
  },
  {
    id: 'stellar-harvester',
    name: 'Stellar Harvester',
    description: 'Sector-scale operations. Huge production.',
    cost: 40000,
    successChance: 0.69,
    prerequisites: ['deep-extraction'],
    modifiers: { productionPercent: 14 },
    row: 3,
    col: 2,
  },
  {
    id: 'neural-boost',
    name: 'Neural Boost',
    description: 'Crew neural interfaces. Click and production.',
    cost: 38000,
    successChance: 0.7,
    prerequisites: ['ai-assist'],
    modifiers: { productionPercent: 5, clickPercent: 18 },
    row: 3,
    col: 3,
  },
  {
    id: 'refinery-core',
    name: 'Refinery Core',
    description: 'Ultra-efficient refineries. Production only.',
    cost: 44000,
    successChance: 0.68,
    prerequisites: ['efficiency'],
    modifiers: { productionPercent: 16 },
    row: 3,
    col: 4,
  },
  {
    id: 'sensor-arrays',
    name: 'Sensor Arrays',
    description: 'Multi-spectrum detection. Better targeting.',
    cost: 41000,
    successChance: 0.69,
    prerequisites: ['precision-drilling'],
    modifiers: { productionPercent: 10, clickPercent: 10 },
    row: 3,
    col: 5,
  },
  {
    id: 'plasma-smelting',
    name: 'Plasma Smelting',
    description: 'Extreme heat processing. Massive output.',
    cost: 50000,
    successChance: 0.66,
    prerequisites: ['catalytic-cracking'],
    modifiers: { productionPercent: 18 },
    row: 3,
    col: 6,
  },
  {
    id: 'exo-forging',
    name: 'Exo Forging',
    description: 'Exotic material synthesis. Huge production leap.',
    cost: 200000,
    successChance: 0.52,
    prerequisites: ['refinery-core'],
    modifiers: { productionPercent: 20 },
    row: 4,
    col: 0,
  },
  {
    id: 'dimensional-mining',
    name: 'Dimensional Mining',
    description: 'Harvest across dimensions. Ultimate production.',
    cost: 240000,
    successChance: 0.5,
    prerequisites: ['quantum-mining', 'stellar-harvester'],
    modifiers: { productionPercent: 25 },
    row: 4,
    col: 1,
  },
  {
    id: 'plasma-catalysis',
    name: 'Plasma Catalysis',
    description: 'Reaction acceleration. Extreme throughput.',
    cost: 260000,
    successChance: 0.49,
    prerequisites: ['plasma-smelting'],
    modifiers: { productionPercent: 22, clickPercent: 8 },
    row: 4,
    col: 2,
  },
  {
    id: 'nexus-research',
    name: 'Nexus Research',
    description: 'Unified theory. Massive all-around bonus.',
    cost: 220000,
    successChance: 0.5,
    prerequisites: ['void-tech', 'neural-boost'],
    modifiers: { productionPercent: 14, clickPercent: 20 },
    row: 4,
    col: 3,
  },
  {
    id: 'quantum-sensors',
    name: 'Quantum Sensors',
    description: 'Entanglement-based detection. Peak efficiency.',
    cost: 230000,
    successChance: 0.51,
    prerequisites: ['sensor-arrays'],
    modifiers: { productionPercent: 14, clickPercent: 14 },
    row: 4,
    col: 4,
  },
  // Row 5
  {
    id: 'singularity-drill',
    name: 'Singularity Drill',
    description: 'Micro black-hole extraction. Legendary production.',
    cost: 700000,
    successChance: 0.46,
    prerequisites: ['dimensional-mining'],
    modifiers: { productionPercent: 30 },
    row: 5,
    col: 0,
  },
  {
    id: 'void-forge',
    name: 'Void Forge',
    description: 'Matter from nothing. Reality-bending output.',
    cost: 650000,
    successChance: 0.47,
    prerequisites: ['nexus-research', 'plasma-catalysis'],
    modifiers: { productionPercent: 28, clickPercent: 10 },
    row: 5,
    col: 1,
  },
  {
    id: 'chrono-extraction',
    name: 'Chrono Extraction',
    description: 'Temporal mining. Harvest across time.',
    cost: 750000,
    successChance: 0.45,
    prerequisites: ['quantum-sensors', 'dimensional-mining'],
    modifiers: { productionPercent: 26, clickPercent: 12 },
    row: 5,
    col: 2,
  },
  {
    id: 'exo-core',
    name: 'Exo Core',
    description: 'Stable exotic matter. Foundation for endgame.',
    cost: 680000,
    successChance: 0.46,
    prerequisites: ['exo-forging', 'nexus-research'],
    modifiers: { productionPercent: 24, clickPercent: 10 },
    row: 5,
    col: 3,
  },
  // Row 6
  {
    id: 'reality-anchor',
    name: 'Reality Anchor',
    description: 'Stabilize unstable yields. Massive gains.',
    cost: 2_000_000,
    successChance: 0.42,
    prerequisites: ['singularity-drill', 'void-forge'],
    modifiers: { productionPercent: 35 },
    row: 6,
    col: 0,
  },
  {
    id: 'multiverse-tap',
    name: 'Multiverse Tap',
    description: 'Draw from parallel realities. Ultimate scale.',
    cost: 2_200_000,
    successChance: 0.41,
    prerequisites: ['chrono-extraction', 'singularity-drill'],
    modifiers: { productionPercent: 38, clickPercent: 10 },
    row: 6,
    col: 1,
  },
  {
    id: 'neural-network',
    name: 'Neural Network',
    description: 'Crew-wide cognition. Click and production surge.',
    cost: 1_900_000,
    successChance: 0.43,
    prerequisites: ['exo-core', 'void-forge'],
    modifiers: { productionPercent: 22, clickPercent: 30 },
    row: 6,
    col: 2,
  },
  {
    id: 'omega-refinery',
    name: 'Omega Refinery',
    description: 'Final-stage processing. Nothing wasted.',
    cost: 2_100_000,
    successChance: 0.42,
    prerequisites: ['exo-core', 'plasma-catalysis'],
    modifiers: { productionPercent: 36 },
    row: 6,
    col: 3,
  },
  // Row 7
  {
    id: 'stellar-engine',
    name: 'Stellar Engine',
    description: 'Harness star power. God-tier production.',
    cost: 6_000_000,
    successChance: 0.38,
    prerequisites: ['reality-anchor', 'omega-refinery'],
    modifiers: { productionPercent: 45 },
    row: 7,
    col: 0,
  },
  {
    id: 'infinity-loop',
    name: 'Infinity Loop',
    description: 'Self-sustaining cascade. Exponential growth.',
    cost: 6_500_000,
    successChance: 0.37,
    prerequisites: ['multiverse-tap', 'reality-anchor'],
    modifiers: { productionPercent: 48, clickPercent: 15 },
    row: 7,
    col: 1,
  },
  {
    id: 'cosmic-mind',
    name: 'Cosmic Mind',
    description: 'Transcendent awareness. All bonuses maximized.',
    cost: 5_500_000,
    successChance: 0.39,
    prerequisites: ['neural-network', 'multiverse-tap'],
    modifiers: { productionPercent: 26, clickPercent: 40 },
    row: 7,
    col: 2,
  },
  {
    id: 'singularity-core',
    name: 'Singularity Core',
    description: 'Unified field tech. Peak everything.',
    cost: 6_200_000,
    successChance: 0.38,
    prerequisites: ['omega-refinery', 'multiverse-tap'],
    modifiers: { productionPercent: 42, clickPercent: 18 },
    row: 7,
    col: 3,
  },
  // Row 8 - capstones
  {
    id: 'architect',
    name: 'The Architect',
    description: 'Design reality itself. Ultimate research.',
    cost: 22_000_000,
    successChance: 0.32,
    prerequisites: ['stellar-engine', 'infinity-loop'],
    modifiers: { productionPercent: 55 },
    row: 8,
    col: 0,
  },
  {
    id: 'transcendence',
    name: 'Transcendence',
    description: 'Beyond matter. Pure potential.',
    cost: 26_000_000,
    successChance: 0.3,
    prerequisites: ['cosmic-mind', 'singularity-core'],
    modifiers: { productionPercent: 36, clickPercent: 50 },
    row: 8,
    col: 1,
  },
  {
    id: 'omega-theory',
    name: 'Omega Theory',
    description: 'The final equation. All bonuses combined.',
    cost: 24_000_000,
    successChance: 0.31,
    prerequisites: ['infinity-loop', 'cosmic-mind', 'singularity-core'],
    modifiers: { productionPercent: 50, clickPercent: 38 },
    row: 8,
    col: 2,
  },
];

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

export function attemptResearch(
  id: string,
  spendCoins: (amount: number) => boolean
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
