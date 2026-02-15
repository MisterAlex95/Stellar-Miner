import { Player } from '../domain/entities/Player.js';
import { GameSession } from '../domain/aggregates/GameSession.js';
import { getSession, setSession, setActiveEventInstances } from './gameState.js';
import { saveLoad } from './gameState.js';
import { clearProgression } from './progression.js';
import {
  QUEST_STORAGE_KEY,
  QUEST_STREAK_KEY,
  QUEST_LAST_CLAIM_KEY,
  MILESTONES_STORAGE_KEY,
  TOTAL_CLICKS_KEY,
  LAST_DAILY_BONUS_KEY,
  ACHIEVEMENTS_KEY,
  COMBO_MASTER_KEY,
} from './catalogs.js';
import { updateStats } from '../presentation/statsView.js';
import { renderUpgradeList } from '../presentation/upgradeListView.js';
import { renderPlanetList } from '../presentation/planetListView.js';

export function openSettings(): void {
  const overlay = document.getElementById('settings-overlay');
  if (overlay) {
    overlay.classList.add('settings-overlay--open');
    overlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => document.getElementById('settings-close')?.focus());
  }
}

export function closeSettings(): void {
  const overlay = document.getElementById('settings-overlay');
  if (overlay) {
    overlay.classList.remove('settings-overlay--open');
    overlay.setAttribute('aria-hidden', 'true');
  }
}

export function applySettingsToUI(): void {
  updateStats();
  renderUpgradeList();
  renderPlanetList();
}

export function openResetConfirmModal(): void {
  const overlay = document.getElementById('reset-confirm-overlay');
  if (overlay) {
    overlay.classList.add('reset-confirm-overlay--open');
    overlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => document.getElementById('reset-confirm-cancel')?.focus());
  }
}

export function closeResetConfirmModal(): void {
  const overlay = document.getElementById('reset-confirm-overlay');
  if (overlay) {
    overlay.classList.remove('reset-confirm-overlay--open');
    overlay.setAttribute('aria-hidden', 'true');
  }
}

export function handleResetProgress(): void {
  saveLoad.clearProgress();
  clearProgression();
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(QUEST_STORAGE_KEY);
    localStorage.removeItem(QUEST_STREAK_KEY);
    localStorage.removeItem(QUEST_LAST_CLAIM_KEY);
    localStorage.removeItem(MILESTONES_STORAGE_KEY);
    localStorage.removeItem(TOTAL_CLICKS_KEY);
    localStorage.removeItem(LAST_DAILY_BONUS_KEY);
    localStorage.removeItem(ACHIEVEMENTS_KEY);
    localStorage.removeItem(COMBO_MASTER_KEY);
    ['stellar-miner-first-upgrade-toast', 'stellar-miner-first-planet-toast', 'stellar-miner-first-astronaut-toast', 'stellar-miner-first-prestige-toast'].forEach((k) => localStorage.removeItem(k));
  }
  const currentSession = getSession();
  const freshPlayer = Player.create('player-1');
  freshPlayer.addCoins(0);
  setSession(new GameSession(currentSession.id, freshPlayer, []));
  setActiveEventInstances([]);
  location.reload();
}
