import { TOTAL_CLICKS_KEY, ACHIEVEMENTS_KEY, COMBO_MASTER_KEY } from './catalogs.js';
import { getSession } from './gameState.js';
import { getAssignedAstronauts } from './crewHelpers.js';
import { getQuestStreak, getQuestLastClaimAt } from './quests.js';
import { showAchievementToast } from '../presentation/toasts.js';
import achievementsData from '../data/achievements.json';

export type Achievement = { id: string; name: string; check: () => boolean };

type AchievementDef = { id: string; name: string; type: string; value: number };

function buildCheck(def: AchievementDef): () => boolean {
  const session = () => getSession();
  const value = def.value;
  switch (def.type) {
    case 'totalClicks':
      return () => getTotalClicksEver() >= value;
    case 'upgradesCount':
      return () => (session()?.player.upgrades.length ?? 0) >= value;
    case 'astronautsCount':
      return () => (session()?.player.astronautCount ?? 0) + getAssignedAstronauts(session()) >= value;
    case 'prestigeLevel':
      return () => (session()?.player.prestigeLevel ?? 0) >= value;
    case 'planetsCount':
      return () => (session()?.player.planets.length ?? 0) >= value;
    case 'totalCoinsEver':
      return () => (session()?.player.totalCoinsEver ?? 0) >= value;
    case 'questStreak':
      return () => getQuestStreak() >= value;
    case 'questClaimed':
      return () => getQuestLastClaimAt() > 0;
    case 'comboMaster':
      return () => typeof localStorage !== 'undefined' && localStorage.getItem(COMBO_MASTER_KEY) === '1';
    case 'totalSlotsGreaterThan':
      return () => (session()?.player.planets.reduce((s, p) => s + p.maxUpgrades, 0) ?? 0) > value;
    default:
      return () => false;
  }
}

export const ACHIEVEMENTS: Achievement[] = (achievementsData as AchievementDef[]).map((def) => ({
  id: def.id,
  name: def.name,
  check: buildCheck(def),
}));

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
