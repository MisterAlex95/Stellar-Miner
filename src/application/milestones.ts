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

export function checkAndShowMilestones(): void {
  const session = getSession();
  if (!session) return;
  const total = toDecimal(session.player.totalCoinsEver);
  if (total.gte(COINS_25K)) tryShowNarrator('coins_25k');
  if (total.gte(COINS_100K)) tryShowNarrator('coins_100k');
  if (total.gte(COINS_500K)) tryShowNarrator('coins_500k');
  if (total.gte(COINS_1M)) tryShowNarrator('coins_1m');
  if (total.gte(COINS_10M)) tryShowNarrator('coins_10m');
  if (total.gte(COINS_1B)) tryShowNarrator('coins_1b');
  const reached = getReachedMilestones();
  for (const m of MILESTONES) {
    if (total.gte(m) && !reached.includes(m)) {
      markMilestoneReached(m);
      getPresentationPort().showMilestoneToast(m);
      break;
    }
  }
}
