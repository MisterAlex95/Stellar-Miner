import type { QuestState, Quest } from './questState.js';
import { saveQuestState } from './questState.js';
import {
  UPGRADE_CATALOG,
  QUEST_STREAK_KEY,
  QUEST_LAST_CLAIM_KEY,
  QUEST_STREAK_WINDOW_MS,
  QUEST_STREAK_BONUS_PER_LEVEL,
  QUEST_STREAK_MAX,
} from './catalogs.js';
import { getSession, getQuestState, setQuestState } from './gameState.js';
import { getAssignedAstronauts } from './crewHelpers.js';

export type { QuestState, Quest };

export function generateQuest(): Quest {
  const roll = Math.random();
  if (roll < 0.35) {
    const targets = [100, 500, 1000, 5000, 10000];
    const target = targets[Math.floor(Math.random() * targets.length)];
    return {
      type: 'coins',
      target,
      reward: Math.floor(target * 0.35) + 25,
      description: `Reach ${target.toLocaleString()} coins`,
    };
  }
  if (roll < 0.6) {
    const targets = [5, 10, 25, 50, 100];
    const target = targets[Math.floor(Math.random() * targets.length)];
    return {
      type: 'production',
      target,
      reward: target * 2 + 40,
      description: `Reach ${target}/s production`,
    };
  }
  if (roll < 0.8) {
    const def = UPGRADE_CATALOG[Math.floor(Math.random() * Math.min(5, UPGRADE_CATALOG.length))];
    const n = Math.floor(Math.random() * 2) + 1;
    return {
      type: 'upgrade',
      target: n,
      targetId: def.id,
      reward: Math.floor(def.cost * 0.25) + 60,
      description: `Own ${n}× ${def.name}`,
    };
  }
  const targets = [1, 2, 3, 5, 8];
  const target = targets[Math.floor(Math.random() * targets.length)];
  return {
    type: 'astronauts',
    target,
    reward: 80 + target * 25,
    description: `Have ${target} astronaut${target > 1 ? 's' : ''}`,
  };
}

export function getQuestProgress(): { current: number; target: number; done: boolean } | null {
  const session = getSession();
  const questState = getQuestState();
  if (!session || !questState.quest) return null;
  const q = questState.quest;
  let current = 0;
  if (q.type === 'coins') current = session.player.coins.value;
  else if (q.type === 'production') current = session.player.effectiveProductionRate;
  else if (q.type === 'upgrade' && q.targetId)
    current = session.player.upgrades.filter((u) => u.id === q.targetId).length;
  else if (q.type === 'astronauts') current = session.player.astronautCount + getAssignedAstronauts(session);
  return { current, target: q.target, done: current >= q.target };
}

export function getQuestStreak(): number {
  if (typeof localStorage === 'undefined') return 0;
  try {
    return parseInt(localStorage.getItem(QUEST_STREAK_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function getQuestLastClaimAt(): number {
  if (typeof localStorage === 'undefined') return 0;
  try {
    return parseInt(localStorage.getItem(QUEST_LAST_CLAIM_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

export type ClaimQuestCallbacks = {
  saveSession: () => void;
  updateStats: () => void;
  renderUpgradeList: () => void;
  renderQuestSection: () => void;
  showFloatingReward: (amount: number, anchor: HTMLElement) => void;
  showQuestStreakToast: (streak: number, mult: number) => void;
  checkAchievements: () => void;
};

export function claimQuest(callbacks: ClaimQuestCallbacks): boolean {
  const session = getSession();
  const questState = getQuestState();
  if (!session || !questState.quest) return false;
  const p = getQuestProgress();
  if (!p?.done) return false;
  const now = Date.now();
  const lastClaim = getQuestLastClaimAt();
  const streak =
    now - lastClaim <= QUEST_STREAK_WINDOW_MS ? Math.min(QUEST_STREAK_MAX, getQuestStreak() + 1) : 1;
  const baseReward = questState.quest.reward;
  const bonusMult = 1 + (streak - 1) * QUEST_STREAK_BONUS_PER_LEVEL;
  const reward = Math.floor(baseReward * bonusMult);
  session.player.addCoins(reward);
  const newState: QuestState = { quest: generateQuest() };
  setQuestState(newState);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(QUEST_LAST_CLAIM_KEY, String(now));
    localStorage.setItem(QUEST_STREAK_KEY, String(streak));
  }
  saveQuestState(newState);
  callbacks.saveSession();
  callbacks.updateStats();
  callbacks.renderUpgradeList();
  callbacks.renderQuestSection();
  const claimBtn = document.getElementById('quest-claim');
  if (claimBtn) callbacks.showFloatingReward(reward, claimBtn);
  if (streak > 1) callbacks.showQuestStreakToast(streak, bonusMult);
  callbacks.checkAchievements();
  return true;
}
