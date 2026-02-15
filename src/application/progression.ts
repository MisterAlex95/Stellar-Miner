import type { GameSession } from '../domain/aggregates/GameSession.js';
import progressionData from '../data/progression.json';

const PROGRESSION_KEY = 'stellar-miner-progression';

type ProgressionData = {
  seenModals: string[];
  /** Block ids that have ever been unlocked; once shown they never disappear. */
  unlockedBlocks: string[];
};

export type BlockId = 'welcome' | 'upgrades' | 'crew' | 'events' | 'quest' | 'planets' | 'research' | 'prestige';

export type BlockDef = {
  id: BlockId;
  /** Coins threshold to unlock (welcome: 0 = first run). */
  coinsThreshold: number;
  title: string;
  body: string;
  /** Section element id to show when unlocked (welcome has no section). */
  sectionId?: string;
};

type ProgressionBlockRaw = { id: string; coinsThreshold: number; title: string; body: string; sectionId: string | null };

export const PROGRESSION_BLOCKS: BlockDef[] = (progressionData as ProgressionBlockRaw[]).map((b) => ({
  id: b.id as BlockId,
  coinsThreshold: b.coinsThreshold,
  title: b.title,
  body: b.body,
  ...(b.sectionId != null ? { sectionId: b.sectionId } : {}),
}));

function loadProgression(): ProgressionData {
  if (typeof localStorage === 'undefined') return { seenModals: [], unlockedBlocks: [] };
  const raw = localStorage.getItem(PROGRESSION_KEY);
  if (!raw) return { seenModals: [], unlockedBlocks: [] };
  try {
    const data = JSON.parse(raw) as ProgressionData;
    return {
      seenModals: Array.isArray(data.seenModals) ? data.seenModals : [],
      unlockedBlocks: Array.isArray(data.unlockedBlocks) ? data.unlockedBlocks : [],
    };
  } catch {
    return { seenModals: [], unlockedBlocks: [] };
  }
}

function saveProgression(data: ProgressionData): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(PROGRESSION_KEY, JSON.stringify(data));
}

export function getSeenModals(): Set<BlockId> {
  return new Set(loadProgression().seenModals as BlockId[]);
}

export function markModalSeen(blockId: BlockId): void {
  const data = loadProgression();
  if (!data.seenModals.includes(blockId)) {
    data.seenModals.push(blockId);
    saveProgression(data);
  }
}

export function clearProgression(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(PROGRESSION_KEY);
}

/** Which blocks are unlocked given current session. Once a block is unlocked (by reaching the coin threshold), it stays unlocked forever (persisted). */
export function getUnlockedBlocks(session: GameSession | null): Set<BlockId> {
  const data = loadProgression();
  const permanent = new Set<BlockId>(data.unlockedBlocks as BlockId[]);
  const unlocked = new Set<BlockId>(permanent);
  if (!session) return unlocked;
  const coins = session.player.coins.value;
  let changed = false;
  for (const block of PROGRESSION_BLOCKS) {
    if (block.id === 'welcome') continue;
    if (coins.gte(block.coinsThreshold)) {
      unlocked.add(block.id);
      if (!permanent.has(block.id)) {
        data.unlockedBlocks.push(block.id);
        changed = true;
      }
    }
  }
  if (changed) saveProgression(data);
  return unlocked;
}

/** Should we show the welcome modal? Only on first run (no save = no seen modals, and we show welcome once). */
export function shouldShowWelcome(seen: Set<BlockId>, session: GameSession | null): boolean {
  if (!session || session.player.coins.value.gt(0)) return false;
  return !seen.has('welcome');
}

/** Next block to unlock (first locked block by coin threshold), or null if all unlocked. */
export function getNextMilestone(session: GameSession | null): { block: BlockDef; coinsNeeded: number } | null {
  if (!session) return null;
  const coins = session.player.coins.value;
  const unlocked = getUnlockedBlocks(session);
  for (const block of PROGRESSION_BLOCKS) {
    if (block.id === 'welcome') continue;
    if (unlocked.has(block.id)) continue;
    return { block, coinsNeeded: block.coinsThreshold };
  }
  return null;
}
