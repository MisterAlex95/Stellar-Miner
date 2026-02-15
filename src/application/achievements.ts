import { TOTAL_CLICKS_KEY, ACHIEVEMENTS_KEY, QUEST_LAST_CLAIM_KEY, COMBO_MASTER_KEY } from './catalogs.js';
import { getSession } from './gameState.js';
import { getAssignedAstronauts } from './crewHelpers.js';
import { getQuestStreak, getQuestLastClaimAt } from './quests.js';
import { showAchievementToast } from '../presentation/toasts.js';

export type Achievement = { id: string; name: string; check: () => boolean };

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-click', name: 'First steps', check: () => getTotalClicksEver() >= 1 },
  { id: 'clicks-100', name: 'Clicker', check: () => getTotalClicksEver() >= 100 },
  { id: 'clicks-1k', name: 'Dedicated miner', check: () => getTotalClicksEver() >= 1000 },
  { id: 'first-upgrade', name: 'Automation', check: () => getSession()?.player.upgrades.length >= 1 },
  { id: 'upgrades-10', name: 'Expansion', check: () => (getSession()?.player.upgrades.length ?? 0) >= 10 },
  { id: 'first-astronaut', name: 'Crew recruit', check: () => (getSession()?.player.astronautCount ?? 0) + getAssignedAstronauts(getSession()) >= 1 },
  { id: 'astronauts-5', name: 'Squad', check: () => (getSession()?.player.astronautCount ?? 0) + getAssignedAstronauts(getSession()) >= 5 },
  { id: 'first-prestige', name: 'Rebirth', check: () => (getSession()?.player.prestigeLevel ?? 0) >= 1 },
  { id: 'prestige-5', name: 'Veteran', check: () => (getSession()?.player.prestigeLevel ?? 0) >= 5 },
  { id: 'planets-3', name: 'Multi-world', check: () => (getSession()?.player.planets.length ?? 0) >= 3 },
  { id: 'coins-10k', name: 'Wealthy', check: () => (getSession()?.player.totalCoinsEver ?? 0) >= 10000 },
  { id: 'quest-streak-3', name: 'Quest master', check: () => getQuestStreak() >= 3 },
  { id: 'first-quest', name: 'First quest', check: () => getQuestLastClaimAt() > 0 },
  { id: 'prestige-10', name: 'Legend', check: () => (getSession()?.player.prestigeLevel ?? 0) >= 10 },
  { id: 'coins-1m', name: 'Millionaire', check: () => (getSession()?.player.totalCoinsEver ?? 0) >= 1_000_000 },
  { id: 'planets-10', name: 'Empire', check: () => (getSession()?.player.planets.length ?? 0) >= 10 },
  { id: 'clicks-50k', name: 'Relentless', check: () => getTotalClicksEver() >= 50000 },
  { id: 'upgrades-25', name: 'Factory', check: () => (getSession()?.player.upgrades.length ?? 0) >= 25 },
  { id: 'combo-master', name: 'Combo master', check: () => typeof localStorage !== 'undefined' && localStorage.getItem(COMBO_MASTER_KEY) === '1' },
  { id: 'first-slot', name: 'Expander', check: () => (getSession()?.player.planets.reduce((s, p) => s + p.maxUpgrades, 0) ?? 0) > 6 },
];

export function getTotalClicksEver(): number {
  if (typeof localStorage === 'undefined') return 0;
  try {
    return parseInt(localStorage.getItem(TOTAL_CLICKS_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function incrementTotalClicksEver(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const n = getTotalClicksEver() + 1;
    localStorage.setItem(TOTAL_CLICKS_KEY, String(n));
  } catch {}
}

export function getUnlockedAchievements(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function unlockAchievement(id: string): void {
  const set = getUnlockedAchievements();
  if (set.has(id)) return;
  set.add(id);
  if (typeof localStorage !== 'undefined') localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify([...set]));
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  if (a) showAchievementToast(a.name);
}

/** Check and unlock at most one achievement per call, so we never flood with multiple toasts. */
export function checkAchievements(): void {
  const unlocked = getUnlockedAchievements();
  for (const a of ACHIEVEMENTS) {
    if (unlocked.has(a.id)) continue;
    if (a.check()) {
      unlockAchievement(a.id);
      return;
    }
  }
}
