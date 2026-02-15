import { Player } from '../domain/entities/Player.js';
import { GameSession } from '../domain/aggregates/GameSession.js';
import { PRESTIGE_COIN_THRESHOLD, PRESTIGE_CLICK_BONUS_PERCENT_PER_LEVEL } from '../domain/constants.js';
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
import { clearResearch } from './research.js';
import { updateStats } from '../presentation/statsView.js';
import { renderUpgradeList } from '../presentation/upgradeListView.js';
import { renderPlanetList } from '../presentation/planetListView.js';
import { renderPrestigeSection } from '../presentation/prestigeView.js';
import { renderCrewSection } from '../presentation/crewView.js';
import { renderResearchSection } from '../presentation/researchView.js';
import { renderQuestSection } from '../presentation/questView.js';
import { showPrestigeMilestoneToast, showMiniMilestoneToast } from '../presentation/toasts.js';
import { openOverlay, closeOverlay } from '../presentation/components/overlay.js';
import { checkAchievements } from './achievements.js';
import { emit } from './eventBus.js';
import { t, tParam } from './strings.js';
import { saveSession } from './handlersSave.js';

const PRESTIGE_REWARDS_LIST_MAX_LEVEL = 15;
const PRESTIGE_MILESTONE_LEVELS = [2, 5, 10, 20];

function refreshAfterPrestige(): void {
  updateStats();
  renderUpgradeList();
  renderPlanetList();
  renderPrestigeSection();
  renderCrewSection();
  renderResearchSection();
  renderQuestSection();
  checkAchievements();
}

export function openPrestigeConfirmModal(): void {
  openOverlay('prestige-confirm-overlay', 'prestige-confirm-overlay--open', {
    focusId: 'prestige-confirm-cancel',
    onOpen: () => {
      const session = getSession();
      const descEl = document.getElementById('prestige-confirm-desc');
      const afterEl = document.getElementById('prestige-confirm-after');
      if (session && descEl) {
        const nextLevel = session.player.prestigeLevel + 1;
        descEl.textContent = tParam('prestigeConfirmDescLevel', { level: nextLevel, pct: nextLevel * 5 });
        if (afterEl) {
          afterEl.textContent = tParam('prestigeConfirmAfter', { level: nextLevel, pct: nextLevel * 5 });
        }
      }
    },
  });
}

export function closePrestigeConfirmModal(): void {
  closeOverlay('prestige-confirm-overlay', 'prestige-confirm-overlay--open');
}

export function openPrestigeRewardsModal(): void {
  const listEl = document.getElementById('prestige-rewards-list');
  if (!listEl) return;
  openOverlay('prestige-rewards-overlay', 'prestige-rewards-overlay--open', {
    focusId: 'prestige-rewards-close',
    onOpen: () => {
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
    },
  });
}

export function closePrestigeRewardsModal(): void {
  closeOverlay('prestige-rewards-overlay', 'prestige-rewards-overlay--open');
}

export function confirmPrestige(): void {
  const session = getSession();
  if (!session) return;
  if (!session.player.coins.gte(PRESTIGE_COIN_THRESHOLD)) return;
  closePrestigeConfirmModal();
  const newPlayer = Player.createAfterPrestige(session.player);
  setSession(new GameSession(session.id, newPlayer, []));
  setActiveEventInstances([]);
  clearExpedition();
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
  if (PRESTIGE_MILESTONE_LEVELS.includes(newPlayer.prestigeLevel)) showPrestigeMilestoneToast(newPlayer.prestigeLevel);
  refreshAfterPrestige();
}

export function handlePrestige(): void {
  const session = getSession();
  if (!session) return;
  if (!session.player.coins.gte(PRESTIGE_COIN_THRESHOLD)) return;
  openPrestigeConfirmModal();
}
