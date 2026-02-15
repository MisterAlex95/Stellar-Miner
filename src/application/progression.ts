import type { GameSession } from '../domain/aggregates/GameSession.js';

const PROGRESSION_KEY = 'stellar-miner-progression';

type ProgressionData = {
  seenModals: string[];
  /** Block ids that have ever been unlocked; once shown they never disappear. */
  unlockedBlocks: string[];
};

export type BlockId = 'welcome' | 'upgrades' | 'crew' | 'quest' | 'planets' | 'prestige';

export type BlockDef = {
  id: BlockId;
  /** Coins threshold to unlock (welcome: 0 = first run). */
  coinsThreshold: number;
  title: string;
  body: string;
  /** Section element id to show when unlocked (welcome has no section). */
  sectionId?: string;
};

export const PROGRESSION_BLOCKS: BlockDef[] = [
  {
    id: 'welcome',
    coinsThreshold: 0,
    title: 'Welcome to Stellar Miner',
    body: 'Click the asteroid (or press Space) to mine coins. Your goal: grow your mining operation by buying upgrades, hiring crew, and expanding to new planets. Start by mining until you can afford your first upgrade!',
    sectionId: undefined,
  },
  {
    id: 'upgrades',
    coinsThreshold: 50,
    title: 'Upgrades',
    body: 'Spend coins to buy equipment that produces coins automatically. Each upgrade adds production per second. You can buy the same upgrade multiple times—each goes on a planet slot. Start with a Mining Robot (100 ⬡).',
    sectionId: 'upgrades-section',
  },
  {
    id: 'crew',
    coinsThreshold: 75,
    title: 'Crew',
    body: 'Hire astronauts to boost your production (+2% per astronaut). Better upgrades require crew to operate—you spend astronauts when you buy those upgrades. Hire your first astronaut when you can afford it (75 ⬡).',
    sectionId: 'crew-section',
  },
  {
    id: 'quest',
    coinsThreshold: 1000,
    title: 'Quests',
    body: 'Complete quests for bonus coins and rewards. Each quest has a target (e.g. mine X coins, buy upgrades). Claim within 5 minutes of completion for a streak bonus. Check the Quest section above.',
    sectionId: 'quest-section',
  },
  {
    id: 'planets',
    coinsThreshold: 2000,
    title: 'Planets',
    body: 'Expand to new planets for more upgrade slots and +5% production per extra planet. You can also add slots to existing planets. More slots = more upgrades = more passive income.',
    sectionId: 'planets-section',
  },
  {
    id: 'prestige',
    coinsThreshold: 5000,
    title: 'Prestige',
    body: 'When you reach 50,000 coins you can Prestige: reset coins and planets to gain +5% production per prestige level forever. Use it to progress faster on each new run.',
    sectionId: 'prestige-section',
  },
];

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
    if (coins >= block.coinsThreshold) {
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
  if (!session || session.player.coins.value > 0) return false;
  return !seen.has('welcome');
}
