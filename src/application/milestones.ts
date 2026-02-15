import { toDecimal } from '../domain/bigNumber.js';
import { MILESTONES_STORAGE_KEY, MILESTONES } from './catalogs.js';
import { getSession } from './gameState.js';
import { showMilestoneToast } from '../presentation/toasts.js';

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

export function checkAndShowMilestones(): void {
  const session = getSession();
  if (!session) return;
  const total = toDecimal(session.player.totalCoinsEver);
  const reached = getReachedMilestones();
  for (const m of MILESTONES) {
    if (total.gte(m) && !reached.includes(m)) {
      markMilestoneReached(m);
      showMilestoneToast(m);
      break;
    }
  }
}
