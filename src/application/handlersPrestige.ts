import { Player } from '../domain/entities/Player.js';
import { GameSession } from '../domain/aggregates/GameSession.js';
import { PRESTIGE_COIN_THRESHOLD, PRESTIGE_CLICK_BONUS_PERCENT_PER_LEVEL } from '../domain/constants.js';
import {
  getSession,
  setSession,
  setActiveEventInstances,
  setQuestState,
  setSessionClickCount,
  setSessionCoinsFromClicks,
  resetRunStatsOnPrestige,
  incrementPrestigesToday,
} from './gameState.js';
import { generateQuest } from './quests.js';
import { saveQuestState } from './questState.js';
import { clearResearch } from './research.js';
import { updateStats } from '../presentation/statsView.js';
import { renderUpgradeList } from '../presentation/upgradeListView.js';
import { renderPlanetList } from '../presentation/planetListView.js';
import { renderPrestigeSection } from '../presentation/prestigeView.js';
import { renderCrewSection } from '../presentation/crewView.js';
import { renderResearchSection } from '../presentation/researchView.js';
import { renderQuestSection } from '../presentation/questView.js';
import { showPrestigeMilestoneToast, showMiniMilestoneToast } from '../presentation/toasts.js';
import { checkAchievements } from './achievements.js';
import { emit } from './eventBus.js';
import { t, tParam } from './strings.js';
import { saveSession } from './handlersSave.js';

const PRESTIGE_REWARDS_LIST_MAX_LEVEL = 15;

export function openPrestigeConfirmModal(): void {
  const overlay = document.getElementById('prestige-confirm-overlay');
  if (!overlay) return;
  overlay.classList.add('prestige-confirm-overlay--open');
  overlay.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => {
    const session = getSession();
    const descEl = document.getElementById('prestige-confirm-desc');
    if (session && descEl) {
      const nextLevel = session.player.prestigeLevel + 1;
      descEl.textContent = tParam('prestigeConfirmDescLevel', { level: nextLevel, pct: nextLevel * 5 });
    }
    document.getElementById('prestige-confirm-cancel')?.focus();
  });
}

export function closePrestigeConfirmModal(): void {
  const overlay = document.getElementById('prestige-confirm-overlay');
  if (overlay) {
    overlay.classList.remove('prestige-confirm-overlay--open');
    overlay.setAttribute('aria-hidden', 'true');
  }
}

export function openPrestigeRewardsModal(): void {
  const overlay = document.getElementById('prestige-rewards-overlay');
  const listEl = document.getElementById('prestige-rewards-list');
  if (!overlay || !listEl) return;
  overlay.classList.add('prestige-rewards-overlay--open');
  overlay.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => {
    listEl.innerHTML = '';
    const li1 = document.createElement('li');
    li1.textContent = t('prestigeReward1');
    listEl.appendChild(li1);
    for (let level = 2; level <= PRESTIGE_REWARDS_LIST_MAX_LEVEL; level++) {
      const prod = level * 5;
      const click = (level - 1) * PRESTIGE_CLICK_BONUS_PERCENT_PER_LEVEL;
      const li = document.createElement('li');
      li.textContent = tParam('prestigeRewardLevelFormat', { level, prod, click });
      listEl.appendChild(li);
    }
    document.getElementById('prestige-rewards-close')?.focus();
  });
}

export function closePrestigeRewardsModal(): void {
  const overlay = document.getElementById('prestige-rewards-overlay');
  if (overlay) {
    overlay.classList.remove('prestige-rewards-overlay--open');
    overlay.setAttribute('aria-hidden', 'true');
  }
}

export function confirmPrestige(): void {
  const session = getSession();
  if (!session) return;
  if (!session.player.coins.gte(PRESTIGE_COIN_THRESHOLD)) return;
  closePrestigeConfirmModal();
  const newPlayer = Player.createAfterPrestige(session.player);
  setSession(new GameSession(session.id, newPlayer, []));
  setActiveEventInstances([]);
  resetRunStatsOnPrestige();
  incrementPrestigesToday();
  const newQuestState = { quest: generateQuest() };
  setQuestState(newQuestState);
  saveQuestState(newQuestState);
  clearResearch();
  saveSession();
  setSessionClickCount(0);
  setSessionCoinsFromClicks(0);
  if (newPlayer.prestigeLevel === 1 && typeof localStorage !== 'undefined') {
    const key = 'stellar-miner-first-prestige-toast';
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, '1');
      showMiniMilestoneToast(t('firstPrestigeToast'));
    }
  }
  emit('prestige', { level: newPlayer.prestigeLevel });
  if ([2, 5, 10, 20].includes(newPlayer.prestigeLevel)) showPrestigeMilestoneToast(newPlayer.prestigeLevel);
  updateStats();
  renderUpgradeList();
  renderPlanetList();
  renderPrestigeSection();
  renderCrewSection();
  renderResearchSection();
  renderQuestSection();
  checkAchievements();
}

export function handlePrestige(): void {
  const session = getSession();
  if (!session) return;
  if (!session.player.coins.gte(PRESTIGE_COIN_THRESHOLD)) return;
  openPrestigeConfirmModal();
}
