import Decimal from 'break_infinity.js';
import type { QuestState, Quest, QuestType } from './questState.js';
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
import { getSetBonusMultiplier } from './moduleSetBonuses.js';
import { getPresentationPort } from './uiBridge.js';
import gameConfig from '../data/gameConfig.json';
import questFlavorData from '../data/questFlavor.json';

export type { QuestState, Quest };

const Q = (gameConfig as { questGeneration: QuestGenerationConfig }).questGeneration;

const MEGA_COMBO_MULT = 1.55;

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
  mega_combo?: { reward: number };
  discover_new_system_planet?: { reward: number };
  survive_negative_events?: { targets: number[]; rewardBase: number; rewardPerTarget: number };
};

const TIER1_UPGRADE_IDS = UPGRADE_CATALOG.filter((d) => d.tier === 1).map((d) => d.id);

type QuestFlavorMap = Record<string, string[]>;
const questFlavor = questFlavorData as QuestFlavorMap;

function pickRandomStoryHook(type: QuestType): string | undefined {
  const intros = questFlavor[type];
  if (!intros?.length) return undefined;
  return intros[Math.floor(Math.random() * intros.length)];
}

/** How many "next step" targets to offer for coins/production (keeps difficulty curve smooth). */
const NEXT_TARGETS_COUNT = 3;
/** Max multiplier for coin/production targets (e.g. at 710/s we never offer 100k/s; max would be 7100). */
const MAX_JUMP_MULT = 10;
/** Max steps above current for astronauts. */
const ASTRONAUT_STEPS_AHEAD = 2;
/** Max steps above current for events_triggered. */
const EVENTS_STEPS_AHEAD = 1;
/** Upgrades whose base cost is above totalCoinsEver * this are considered out of reach. */
const UPGRADE_AFFORDABILITY_MULT = 12;

/**
 * Picks the next 1..N targets from a sorted list that are strictly above current.
 * Ensures quests are always the "next step" rather than a random jump.
 */
function nextTargetsInList(list: number[], current: number, maxCount: number): number[] {
  const idx = list.findIndex((t) => t > current);
  if (idx < 0) return [];
  return list.slice(idx, idx + maxCount);
}

/**
 * Returns only quest targets that are achievable and match game progression.
 * Uses totalCoinsEver and prestigeLevel so early game gets easy quests, late game gets harder ones.
 * Quest types are gated by unlocks (e.g. no prestige_today until player has prestiged at least once).
 */
function getAllowableTargets(): {
  coins: number[];
  production: number[];
  upgrade: { target: number; targetId: string }[];
  astronauts: number[];
  prestige_today: number[];
  combo_tier: number[];
  events_triggered: number[];
  tier1_set: boolean;
  mega_combo: boolean;
  discover_new_system_planet: boolean;
  survive_negative_events: number[];
} {
  const session = getSession();
  const run = getRunStats();
  const prestigesToday = getPrestigesToday();
  const totalCoinsEverNum = session?.player.totalCoinsEver.toNumber() ?? 0;
  const prestigeLevel = session?.player.prestigeLevel ?? 0;
  const currentCoins = session ? session.player.coins.toNumber() : 0;
  const currentProduction = session
    ? session.player.effectiveProductionRate
        .mul(getResearchProductionMultiplier())
        .mul(getSetBonusMultiplier(session.player))
        .toNumber()
    : 0;
  const currentAstronauts = session?.player.astronautCount ?? 0;
  const currentTier1Owned =
    session ? TIER1_UPGRADE_IDS.filter((id) => session.player.upgrades.some((u) => u.id === id)).length : 0;
  const runComboMult = run.runMaxComboMult;
  const runEvents = run.runEventsTriggered;
  const runNewSystemDiscoveries = run.runNewSystemDiscoveries ?? 0;
  const runMaxConsecutiveNegative = run.runMaxConsecutiveNegativeSurvived ?? 0;

  const hasCrewRelevant = totalCoinsEverNum >= 1500 || currentAstronauts > 0;
  const hasEventsUnlocked = totalCoinsEverNum >= 120_000;
  const hasPrestigedOnce = prestigeLevel >= 1;

  const coinsNext = nextTargetsInList(Q.coins.targets, currentCoins, NEXT_TARGETS_COUNT);
  const productionNext = nextTargetsInList(Q.production.targets, currentProduction, NEXT_TARGETS_COUNT);
  const coinsCap = Math.max(currentCoins * MAX_JUMP_MULT, 1);
  const productionCap = Math.max(currentProduction * MAX_JUMP_MULT, 1);
  const coinsTargets = coinsNext.filter((t) => t <= coinsCap);
  const productionTargets = productionNext.filter((t) => t <= productionCap);

  const astronautTargets = hasCrewRelevant
    ? Q.astronauts.targets.filter((t) => {
        if (t <= currentAstronauts) return false;
        const idx = Q.astronauts.targets.indexOf(t);
        const currentIdx = Q.astronauts.targets.findIndex((a) => a >= currentAstronauts);
        const stepsIdx = currentIdx >= 0 ? currentIdx : 0;
        return idx <= stepsIdx + ASTRONAUT_STEPS_AHEAD;
      })
    : [];

  const cfgPrestige = Q.prestige_today ?? { targets: [1, 2], rewardBase: 2000, rewardPerPrestige: 1500 };
  const prestigeTargets = hasPrestigedOnce
    ? cfgPrestige.targets.filter((t) => t === prestigesToday + 1)
    : [];

  const cfgCombo = Q.combo_tier ?? { multTargets: [1.15, 1.25, 1.35], rewardBase: 1000 };
  const comboTargets = cfgCombo.multTargets
    .map((m) => Math.round(m * 100))
    .filter((t) => t / 100 > runComboMult);

  const cfgEvents = Q.events_triggered ?? { targets: [3, 7, 15, 25], rewardBase: 600, rewardPerEvent: 350 };
  const eventsTargets = hasEventsUnlocked
    ? cfgEvents.targets.filter((t) => {
        if (t <= runEvents) return false;
        const idx = cfgEvents.targets.indexOf(t);
        const currentIdx = cfgEvents.targets.findIndex((e) => e > runEvents);
        return currentIdx === -1 || idx <= currentIdx + EVENTS_STEPS_AHEAD;
      })
    : [];

  const upgradePool: { target: number; targetId: string }[] = [];
  if (session) {
    const maxIdx = Math.min(Q.upgrade.maxUpgradeIndex, UPGRADE_CATALOG.length);
    const affordabilityCap = Math.max(totalCoinsEverNum * UPGRADE_AFFORDABILITY_MULT, currentCoins * 2);
    for (let i = 0; i < maxIdx; i++) {
      const def = UPGRADE_CATALOG[i];
      if (def.cost > affordabilityCap) continue;
      const owned = session.player.upgrades.filter((u) => u.id === def.id).length;
      for (let n = Q.upgrade.countMin; n <= Q.upgrade.countMax; n++) {
        if (n > owned) upgradePool.push({ target: n, targetId: def.id });
      }
    }
  }

  const tier1SetAllowed = currentTier1Owned < TIER1_UPGRADE_IDS.length;

  const megaComboAllowed = runComboMult < MEGA_COMBO_MULT;
  const discoverNewSystemAllowed = runNewSystemDiscoveries < 1;
  const cfgSurvive = Q.survive_negative_events ?? { targets: [2, 3, 5], rewardBase: 500, rewardPerTarget: 400 };
  const surviveTargets = hasEventsUnlocked
    ? cfgSurvive.targets.filter((t) => {
        if (t <= runMaxConsecutiveNegative) return false;
        const idx = cfgSurvive.targets.indexOf(t);
        const currentIdx = cfgSurvive.targets.findIndex((e) => e > runMaxConsecutiveNegative);
        return currentIdx === -1 || idx <= currentIdx + EVENTS_STEPS_AHEAD;
      })
    : [];

  return {
    coins: coinsTargets.length > 0 ? coinsTargets : Q.coins.targets.filter((t) => t > currentCoins),
    production:
      productionTargets.length > 0
        ? productionTargets
        : Q.production.targets.filter((t) => t > currentProduction),
    upgrade: upgradePool,
    astronauts:
      astronautTargets.length > 0 ? astronautTargets : Q.astronauts.targets.filter((t) => t > currentAstronauts),
    prestige_today: prestigeTargets,
    combo_tier: comboTargets,
    events_triggered: eventsTargets,
    tier1_set: tier1SetAllowed,
    mega_combo: megaComboAllowed,
    discover_new_system_planet: discoverNewSystemAllowed,
    survive_negative_events: surviveTargets,
  };
}

export function generateQuest(): Quest {
  const allowed = getAllowableTargets();
  const typeWeights = Q.typeWeights;
  const types: Array<{ weightEnd: number; key: string }> = [
    { weightEnd: typeWeights[0], key: 'coins' },
    { weightEnd: typeWeights[1], key: 'production' },
    { weightEnd: typeWeights[2], key: 'upgrade' },
    { weightEnd: typeWeights[3], key: 'astronauts' },
    { weightEnd: typeWeights[4], key: 'prestige_today' },
    { weightEnd: typeWeights[5], key: 'combo_tier' },
    { weightEnd: typeWeights[6], key: 'events_triggered' },
    { weightEnd: typeWeights[7], key: 'tier1_set' },
    { weightEnd: typeWeights[8], key: 'mega_combo' },
    { weightEnd: typeWeights[9], key: 'discover_new_system_planet' },
    { weightEnd: typeWeights[10] ?? 1, key: 'survive_negative_events' },
  ];
  const roll = Math.random();
  let chosenKey: string | null = null;
  for (const { weightEnd, key } of types) {
    if (roll >= weightEnd) continue;
    const hasTargets =
      (key === 'coins' && allowed.coins.length > 0) ||
      (key === 'production' && allowed.production.length > 0) ||
      (key === 'upgrade' && allowed.upgrade.length > 0) ||
      (key === 'astronauts' && allowed.astronauts.length > 0) ||
      (key === 'prestige_today' && allowed.prestige_today.length > 0) ||
      (key === 'combo_tier' && allowed.combo_tier.length > 0) ||
      (key === 'events_triggered' && allowed.events_triggered.length > 0) ||
      (key === 'tier1_set' && allowed.tier1_set) ||
      (key === 'mega_combo' && allowed.mega_combo) ||
      (key === 'discover_new_system_planet' && allowed.discover_new_system_planet) ||
      (key === 'survive_negative_events' && allowed.survive_negative_events.length > 0);
    if (hasTargets) {
      chosenKey = key;
      break;
    }
  }
  if (chosenKey === null) {
    chosenKey = 'coins';
    if (allowed.coins.length === 0) {
      const t = Q.coins.targets[0];
      return {
        type: 'coins',
        target: t,
        reward: Math.floor(t * Q.coins.rewardMult) + Q.coins.rewardBase,
        description: `Reach ${t.toLocaleString()} coins`,
        storyHook: pickRandomStoryHook('coins'),
      };
    }
  }

  if (chosenKey === 'coins') {
    const targets = allowed.coins.length > 0 ? allowed.coins : Q.coins.targets;
    const target = targets[Math.floor(Math.random() * targets.length)];
    return {
      type: 'coins',
      target,
      reward: Math.floor(target * Q.coins.rewardMult) + Q.coins.rewardBase,
      description: `Reach ${target.toLocaleString()} coins`,
      storyHook: pickRandomStoryHook('coins'),
    };
  }
  if (chosenKey === 'production') {
    const targets = allowed.production.length > 0 ? allowed.production : Q.production.targets;
    const target = targets[Math.floor(Math.random() * targets.length)];
    return {
      type: 'production',
      target,
      reward: target * Q.production.rewardMult + Q.production.rewardBase,
      description: `Reach ${target}/s production`,
      storyHook: pickRandomStoryHook('production'),
    };
  }
  if (chosenKey === 'upgrade' && allowed.upgrade.length > 0) {
    const pick = allowed.upgrade[Math.floor(Math.random() * allowed.upgrade.length)];
    const def = UPGRADE_CATALOG.find((d) => d.id === pick.targetId)!;
    return {
      type: 'upgrade',
      target: pick.target,
      targetId: def.id,
      reward: Math.floor(def.cost * Q.upgrade.rewardCostMult) + Q.upgrade.rewardBase,
      description: `Own ${pick.target}× ${def.name}`,
      storyHook: pickRandomStoryHook('upgrade'),
    };
  }
  if (chosenKey === 'astronauts') {
    const targets = allowed.astronauts.length > 0 ? allowed.astronauts : Q.astronauts.targets;
    const target = targets[Math.floor(Math.random() * targets.length)];
    return {
      type: 'astronauts',
      target,
      reward: Q.astronauts.rewardBase + target * Q.astronauts.rewardPerTarget,
      description: `Have ${target} astronaut${target > 1 ? 's' : ''}`,
      storyHook: pickRandomStoryHook('astronauts'),
    };
  }
  if (chosenKey === 'prestige_today' && allowed.prestige_today.length > 0) {
    const cfg = Q.prestige_today ?? { targets: [1, 2], rewardBase: 2000, rewardPerPrestige: 1500 };
    const target = allowed.prestige_today[Math.floor(Math.random() * allowed.prestige_today.length)];
    return {
      type: 'prestige_today',
      target,
      reward: cfg.rewardBase + target * cfg.rewardPerPrestige,
      description: `Prestige ${target} time${target > 1 ? 's' : ''} today`,
      storyHook: pickRandomStoryHook('prestige_today'),
    };
  }
  if (chosenKey === 'combo_tier' && allowed.combo_tier.length > 0) {
    const cfg = Q.combo_tier ?? { multTargets: [1.15, 1.25, 1.35], rewardBase: 1000 };
    const target = allowed.combo_tier[Math.floor(Math.random() * allowed.combo_tier.length)];
    const mult = target / 100;
    return {
      type: 'combo_tier',
      target,
      reward: cfg.rewardBase + Math.round(mult * 200),
      description: `Reach ×${mult} combo`,
      storyHook: pickRandomStoryHook('combo_tier'),
    };
  }
  if (chosenKey === 'events_triggered' && allowed.events_triggered.length > 0) {
    const cfg = Q.events_triggered ?? { targets: [3, 7, 15, 25], rewardBase: 600, rewardPerEvent: 350 };
    const target = allowed.events_triggered[Math.floor(Math.random() * allowed.events_triggered.length)];
    return {
      type: 'events_triggered',
      target,
      reward: cfg.rewardBase + target * cfg.rewardPerEvent,
      description: `Trigger ${target} event${target > 1 ? 's' : ''} this run`,
      storyHook: pickRandomStoryHook('events_triggered'),
    };
  }
  if (chosenKey === 'mega_combo' && allowed.mega_combo) {
    const cfg = Q.mega_combo ?? { reward: 1800 };
    const target = Math.round(MEGA_COMBO_MULT * 100);
    return {
      type: 'mega_combo',
      target,
      reward: cfg.reward,
      description: `Reach ×${MEGA_COMBO_MULT} Mega combo`,
      storyHook: pickRandomStoryHook('mega_combo'),
    };
  }
  if (chosenKey === 'discover_new_system_planet' && allowed.discover_new_system_planet) {
    const cfg = Q.discover_new_system_planet ?? { reward: 2200 };
    return {
      type: 'discover_new_system_planet',
      target: 1,
      reward: cfg.reward,
      description: 'Discover a planet in a new star system',
      storyHook: pickRandomStoryHook('discover_new_system_planet'),
    };
  }
  if (chosenKey === 'survive_negative_events' && allowed.survive_negative_events.length > 0) {
    const cfg = Q.survive_negative_events ?? { targets: [2, 3, 5], rewardBase: 500, rewardPerTarget: 400 };
    const target = allowed.survive_negative_events[Math.floor(Math.random() * allowed.survive_negative_events.length)];
    return {
      type: 'survive_negative_events',
      target,
      reward: cfg.rewardBase + target * cfg.rewardPerTarget,
      description: `Survive ${target} consecutive negative event${target > 1 ? 's' : ''}`,
      storyHook: pickRandomStoryHook('survive_negative_events'),
    };
  }
  const cfg = Q.tier1_set ?? { reward: 1500 };
  return {
    type: 'tier1_set',
    target: TIER1_UPGRADE_IDS.length,
    reward: cfg.reward,
    description: 'Own at least one of every tier-1 upgrade',
    storyHook: pickRandomStoryHook('tier1_set'),
  };
}

export function getQuestProgress(): { current: number | Decimal; target: number; done: boolean } | null {
  const session = getSession();
  const questState = getQuestState();
  if (!session || !questState.quest) return null;
  const q = questState.quest;
  let current: number | Decimal = 0;
  if (q.type === 'coins') current = session.player.coins.value;
  else if (q.type === 'production')
    current = session.player.effectiveProductionRate
      .mul(getResearchProductionMultiplier())
      .mul(getSetBonusMultiplier(session.player));
  else if (q.type === 'upgrade' && q.targetId)
    current = session.player.upgrades.filter((u) => u.id === q.targetId).length;
  else if (q.type === 'astronauts') current = session.player.astronautCount;
  else if (q.type === 'prestige_today') current = getPrestigesToday();
  else if (q.type === 'combo_tier') current = getRunStats().runMaxComboMult >= q.target / 100 ? q.target : Math.round(getRunStats().runMaxComboMult * 100);
  else if (q.type === 'events_triggered') current = getRunStats().runEventsTriggered;
  else if (q.type === 'tier1_set')
    current = TIER1_UPGRADE_IDS.filter((id) => session.player.upgrades.some((u) => u.id === id)).length;
  else if (q.type === 'mega_combo') {
    const runMult = getRunStats().runMaxComboMult;
    current = runMult >= MEGA_COMBO_MULT ? Math.round(MEGA_COMBO_MULT * 100) : Math.round(runMult * 100);
  } else if (q.type === 'discover_new_system_planet') current = getRunStats().runNewSystemDiscoveries ?? 0;
  else if (q.type === 'survive_negative_events') current = getRunStats().runMaxConsecutiveNegativeSurvived ?? 0;
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
  notifyRefresh: () => void;
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
  callbacks.notifyRefresh();
  const ui = getPresentationPort();
  const claimBtn = ui.getQuestClaimAnchor();
  if (claimBtn) ui.showFloatingReward(reward, claimBtn);
  if (streak > 1) ui.showQuestStreakToast(streak, bonusMult);
  return true;
}
