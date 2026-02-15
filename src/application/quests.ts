import Decimal from 'break_infinity.js';
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
import { getSession, getQuestState, setQuestState, incrementRunQuestsClaimed, addRunCoins, getRunStats, getPrestigesToday } from './gameState.js';
import { getResearchProductionMultiplier } from './research.js';
import gameConfig from '../data/gameConfig.json';

export type { QuestState, Quest };

const Q = (gameConfig as { questGeneration: QuestGenerationConfig }).questGeneration;

type QuestGenerationConfig = {
  typeWeights: number[];
  coins: { targets: number[]; rewardMult: number; rewardBase: number };
  production: { targets: number[]; rewardMult: number; rewardBase: number };
  upgrade: { maxUpgradeIndex: number; countMin: number; countMax: number; rewardCostMult: number; rewardBase: number };
  astronauts: { targets: number[]; rewardBase: number; rewardPerTarget: number };
  prestige_today?: { targets: number[]; rewardBase: number; rewardPerPrestige: number };
  combo_tier?: { multTargets: number[]; rewardBase: number };
  events_triggered?: { targets: number[]; rewardBase: number; rewardPerEvent: number };
  tier1_set?: { reward: number };
};

const TIER1_UPGRADE_IDS = UPGRADE_CATALOG.filter((d) => d.tier === 1).map((d) => d.id);

export function generateQuest(): Quest {
  const roll = Math.random();
  if (roll < Q.typeWeights[0]) {
    const targets = Q.coins.targets;
    const target = targets[Math.floor(Math.random() * targets.length)];
    return {
      type: 'coins',
      target,
      reward: Math.floor(target * Q.coins.rewardMult) + Q.coins.rewardBase,
      description: `Reach ${target.toLocaleString()} coins`,
    };
  }
  if (roll < Q.typeWeights[1]) {
    const targets = Q.production.targets;
    const target = targets[Math.floor(Math.random() * targets.length)];
    return {
      type: 'production',
      target,
      reward: target * Q.production.rewardMult + Q.production.rewardBase,
      description: `Reach ${target}/s production`,
    };
  }
  if (roll < Q.typeWeights[2]) {
    const def = UPGRADE_CATALOG[Math.floor(Math.random() * Math.min(Q.upgrade.maxUpgradeIndex, UPGRADE_CATALOG.length))];
    const n = Math.floor(Math.random() * (Q.upgrade.countMax - Q.upgrade.countMin + 1)) + Q.upgrade.countMin;
    return {
      type: 'upgrade',
      target: n,
      targetId: def.id,
      reward: Math.floor(def.cost * Q.upgrade.rewardCostMult) + Q.upgrade.rewardBase,
      description: `Own ${n}× ${def.name}`,
    };
  }
  if (roll < Q.typeWeights[3]) {
    const targets = Q.astronauts.targets;
    const target = targets[Math.floor(Math.random() * targets.length)];
    return {
      type: 'astronauts',
      target,
      reward: Q.astronauts.rewardBase + target * Q.astronauts.rewardPerTarget,
      description: `Have ${target} astronaut${target > 1 ? 's' : ''}`,
    };
  }
  if (roll < Q.typeWeights[4]) {
    const cfg = Q.prestige_today ?? { targets: [1, 2], rewardBase: 2000, rewardPerPrestige: 1500 };
    const targets = cfg.targets;
    const target = targets[Math.floor(Math.random() * targets.length)];
    return {
      type: 'prestige_today',
      target,
      reward: cfg.rewardBase + target * cfg.rewardPerPrestige,
      description: `Prestige ${target} time${target > 1 ? 's' : ''} today`,
    };
  }
  if (roll < Q.typeWeights[5]) {
    const cfg = Q.combo_tier ?? { multTargets: [1.2, 1.3, 1.4], rewardBase: 800 };
    const mult = cfg.multTargets[Math.floor(Math.random() * cfg.multTargets.length)];
    const target = Math.round(mult * 100);
    return {
      type: 'combo_tier',
      target,
      reward: cfg.rewardBase + Math.round(mult * 200),
      description: `Reach ×${mult} combo`,
    };
  }
  if (roll < Q.typeWeights[6]) {
    const cfg = Q.events_triggered ?? { targets: [2, 5, 10], rewardBase: 500, rewardPerEvent: 300 };
    const targets = cfg.targets;
    const target = targets[Math.floor(Math.random() * targets.length)];
    return {
      type: 'events_triggered',
      target,
      reward: cfg.rewardBase + target * cfg.rewardPerEvent,
      description: `Trigger ${target} event${target > 1 ? 's' : ''} this run`,
    };
  }
  const cfg = Q.tier1_set ?? { reward: 1500 };
  return {
    type: 'tier1_set',
    target: TIER1_UPGRADE_IDS.length,
    reward: cfg.reward,
    description: 'Own at least one of every tier-1 upgrade',
  };
}

export function getQuestProgress(): { current: number | Decimal; target: number; done: boolean } | null {
  const session = getSession();
  const questState = getQuestState();
  if (!session || !questState.quest) return null;
  const q = questState.quest;
  let current: number | Decimal = 0;
  if (q.type === 'coins') current = session.player.coins.value;
  else if (q.type === 'production') current = session.player.effectiveProductionRate.mul(getResearchProductionMultiplier());
  else if (q.type === 'upgrade' && q.targetId)
    current = session.player.upgrades.filter((u) => u.id === q.targetId).length;
  else if (q.type === 'astronauts') current = session.player.astronautCount;
  else if (q.type === 'prestige_today') current = getPrestigesToday();
  else if (q.type === 'combo_tier') current = getRunStats().runMaxComboMult >= q.target / 100 ? q.target : Math.round(getRunStats().runMaxComboMult * 100);
  else if (q.type === 'events_triggered') current = getRunStats().runEventsTriggered;
  else if (q.type === 'tier1_set')
    current = TIER1_UPGRADE_IDS.filter((id) => session.player.upgrades.some((u) => u.id === id)).length;
  const done = typeof current === 'number' ? current >= q.target : current.gte(q.target);
  return { current, target: q.target, done };
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
  incrementRunQuestsClaimed();
  addRunCoins(reward);
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
