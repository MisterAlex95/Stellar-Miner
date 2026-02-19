import { Player } from '../domain/entities/Player.js';
import { GameSession } from '../domain/aggregates/GameSession.js';
import {
  PRESTIGE_COIN_THRESHOLD,
  PRESTIGE_CLICK_BONUS_PERCENT_PER_LEVEL,
  PRESTIGE_RESEARCH_POINTS_PER_PRESTIGE,
  PRESTIGE_BONUS_PER_LEVEL,
  PRESTIGE_PLANET_BONUS_PER_PLANET,
  PRESTIGE_RESEARCH_BONUS_PER_NODE,
} from '../domain/constants.js';
import {
  getSession,
  setSession,
  setActiveEventInstances,
  clearExpedition,
  setQuestState,
  setSessionClickCount,
  setSessionCoinsFromClicks,
  resetRunStatsOnPrestige,
  incrementPrestigesToday,
} from './gameState.js';
import { generateQuest } from './quests.js';
import { saveQuestState } from './questState.js';
import { clearResearch, addPrestigeResearchPoints, getUnlockedResearch } from './research.js';
import { clearEverUnlockedUpgradeTiers } from './catalogs.js';
import { getPresentationPort } from './uiBridge.js';
import { checkAchievements } from './achievements.js';
import { checkCodexUnlocks } from './codex.js';
import { emit } from './eventBus.js';
import { t, tParam } from './strings.js';
import { notifyRefresh } from './refreshSignal.js';
import { getPrestigeLore } from './prestigeLore.js';

const PRESTIGE_REWARDS_LIST_MAX_LEVEL = 15;
const PRESTIGE_MILESTONE_LEVELS = [2, 5, 10, 20];

function refreshAfterPrestige(): void {
  notifyRefresh();
  checkAchievements();
  checkCodexUnlocks();
}

const PRESTIGE_BASE_PCT = 7;
const PRESTIGE_PLANET_PCT = 1;
const PRESTIGE_RESEARCH_PCT = 0.5;

/** Total prestige production bonus in percent (level + planets + research banked). */
export function getPrestigeProductionPercent(player: Player): number {
  return (
    player.prestigeLevel * PRESTIGE_BONUS_PER_LEVEL * 100 +
    player.prestigePlanetBonus * PRESTIGE_PLANET_BONUS_PER_PLANET * 100 +
    player.prestigeResearchBonus * PRESTIGE_RESEARCH_BONUS_PER_NODE * 100
  );
}

export function openPrestigeConfirmModal(): void {
  const session = getSession();
  if (session) {
    const player = session.player;
    const nextLevel = player.prestigeLevel + 1;
    const planetsThisRun = Math.max(0, player.planets.length - 1);
    const researchCount = getUnlockedResearch().length;
    const levelPct = nextLevel * PRESTIGE_BASE_PCT;
    const planetPct = (player.prestigePlanetBonus + planetsThisRun) * PRESTIGE_PLANET_PCT;
    const researchPct = (player.prestigeResearchBonus + researchCount) * PRESTIGE_RESEARCH_PCT;
    const totalPct = Math.round(levelPct + planetPct + researchPct);
    const desc = tParam('prestigeConfirmDescLevel', { level: nextLevel, pct: totalPct });
    const after = tParam('prestigeConfirmAfter', { level: nextLevel, pct: totalPct });
    const gainEstimate = tParam('prestigeConfirmGainEstimate', {
      level: nextLevel,
      levelPct: Math.round(levelPct),
      planetPct: Math.round(planetPct),
      researchPct: Math.round(researchPct),
      totalPct,
    });
    const lore = getPrestigeLore(nextLevel);
    const hasChapter = lore.title !== `Prestige ${nextLevel}`;
    const chapterTitle = hasChapter ? `Prestige ${nextLevel} — ${lore.title}` : undefined;
    getPresentationPort().setPrestigeConfirmContent(desc, after, gainEstimate, chapterTitle, lore.quote);
  }
  getPresentationPort().openOverlay('prestige-confirm-overlay', 'prestige-confirm-overlay--open', {
    focusId: 'prestige-confirm-cancel',
  });
}

export function closePrestigeConfirmModal(): void {
  getPresentationPort().closeOverlay('prestige-confirm-overlay', 'prestige-confirm-overlay--open');
}

export function openPrestigeRewardsModal(): void {
  const levels: string[] = [t('prestigeReward1')];
  for (let level = 2; level <= PRESTIGE_REWARDS_LIST_MAX_LEVEL; level++) {
    const prod = Math.round(level * PRESTIGE_BONUS_PER_LEVEL * 100);
    const click = Math.round((level - 1) * PRESTIGE_CLICK_BONUS_PERCENT_PER_LEVEL);
    levels.push(tParam('prestigeRewardLevelFormat', { level, prod, click }));
  }
  getPresentationPort().setPrestigeRewardsContent(levels);
  getPresentationPort().openOverlay('prestige-rewards-overlay', 'prestige-rewards-overlay--open', {
    focusId: 'prestige-rewards-close',
  });
}

export function closePrestigeRewardsModal(): void {
  getPresentationPort().closeOverlay('prestige-rewards-overlay', 'prestige-rewards-overlay--open');
}

export function confirmPrestige(): void {
  const session = getSession();
  if (!session) return;
  if (!session.player.coins.gte(PRESTIGE_COIN_THRESHOLD)) return;
  closePrestigeConfirmModal();
  const newPlayer = Player.createAfterPrestige(
    session.player,
    session.player.planets.length,
    getUnlockedResearch().length
  );
  setSession(new GameSession(session.id, newPlayer, []));
  setActiveEventInstances([]);
  clearExpedition();
  resetRunStatsOnPrestige();
  incrementPrestigesToday();
  const newQuestState = { quest: generateQuest() };
  setQuestState(newQuestState);
  saveQuestState(newQuestState);
  clearResearch();
  addPrestigeResearchPoints(PRESTIGE_RESEARCH_POINTS_PER_PRESTIGE);
  clearEverUnlockedUpgradeTiers();
  notifyRefresh();
  setSessionClickCount(0);
  setSessionCoinsFromClicks(0);
  const ui = getPresentationPort();
  if (newPlayer.prestigeLevel === 1 && typeof localStorage !== 'undefined') {
    const key = 'stellar-miner-first-prestige-toast';
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, '1');
      ui.showMiniMilestoneToast(t('firstPrestigeToast'));
    }
  }
  emit('prestige', { level: newPlayer.prestigeLevel });
  const newPct = Math.round(getPrestigeProductionPercent(newPlayer));
  const lore = getPrestigeLore(newPlayer.prestigeLevel);
  const toastMsg =
    lore.title !== `Prestige ${newPlayer.prestigeLevel}`
      ? tParam('prestigeCompleteToastWithChapter', {
          level: newPlayer.prestigeLevel,
          chapter: lore.title,
          pct: newPct,
        })
      : tParam('prestigeCompleteToast', { pct: newPct });
  ui.showMiniMilestoneToast(toastMsg);
  if (PRESTIGE_MILESTONE_LEVELS.includes(newPlayer.prestigeLevel)) {
    ui.showPrestigeMilestoneToast(newPlayer.prestigeLevel, newPct);
  }
  refreshAfterPrestige();
}

export function handlePrestige(): void {
  const session = getSession();
  if (!session) return;
  if (!session.player.coins.gte(PRESTIGE_COIN_THRESHOLD)) return;
  openPrestigeConfirmModal();
}
