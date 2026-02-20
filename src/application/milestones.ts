import { toDecimal } from '../domain/bigNumber.js';
import { MILESTONES_STORAGE_KEY, MILESTONES } from './catalogs.js';
import { getSession } from './gameState.js';
import { getPresentationPort } from './uiBridge.js';
import { tryShowNarrator } from './narrator.js';

export function getReachedMilestones(): number[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MILESTONES_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as number[];
  } catch {
    return [];
  }
}

export function markMilestoneReached(value: number): void {
  const reached = getReachedMilestones();
  if (reached.includes(value)) return;
  reached.push(value);
  reached.sort((a, b) => a - b);
  if (typeof localStorage !== 'undefined') localStorage.setItem(MILESTONES_STORAGE_KEY, JSON.stringify(reached));
}

const COINS_25K = 25_000;
const COINS_100K = 100_000;
const COINS_500K = 500_000;
const COINS_1M = 1_000_000;
const COINS_10M = 10_000_000;
const COINS_1B = 1_000_000_000;

const COIN_NARRATOR_ORDER: { threshold: number; trigger: string }[] = [
  { threshold: COINS_25K, trigger: 'coins_25k' },
  { threshold: COINS_100K, trigger: 'coins_100k' },
  { threshold: COINS_500K, trigger: 'coins_500k' },
  { threshold: COINS_1M, trigger: 'coins_1m' },
  { threshold: COINS_10M, trigger: 'coins_10m' },
  { threshold: COINS_1B, trigger: 'coins_1b' },
];

/** At most one coin narrator + one milestone toast per call to avoid notification flood. */
export function checkAndShowMilestones(): void {
  const session = getSession();
  if (!session) return;
  const total = toDecimal(session.player.totalCoinsEver);
  for (const { threshold, trigger } of COIN_NARRATOR_ORDER) {
    if (total.gte(threshold) && tryShowNarrator(trigger)) break;
  }
  const reached = getReachedMilestones();
  for (const m of MILESTONES) {
    if (total.gte(m) && !reached.includes(m)) {
      markMilestoneReached(m);
      getPresentationPort().showMilestoneToast(m);
      break;
    }
  }
}
