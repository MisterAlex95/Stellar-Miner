import { Player } from '../domain/entities/Player.js';
import { GameSession } from '../domain/aggregates/GameSession.js';
import { getSession, setSession, setActiveEventInstances } from './gameState.js';
import { saveLoad } from './gameState.js';
import { clearProgression } from './progression.js';
import { t, tParam } from './strings.js';
import {
  QUEST_STORAGE_KEY,
  QUEST_STREAK_KEY,
  QUEST_LAST_CLAIM_KEY,
  MILESTONES_STORAGE_KEY,
  TOTAL_CLICKS_KEY,
  LAST_DAILY_BONUS_KEY,
  ACHIEVEMENTS_KEY,
  COMBO_MASTER_KEY,
  PRESTIGES_TODAY_KEY,
  clearEverUnlockedUpgradeTiers,
} from './catalogs.js';

const RESET_LOCAL_STORAGE_KEYS: string[] = [
  QUEST_STORAGE_KEY,
  QUEST_STREAK_KEY,
  QUEST_LAST_CLAIM_KEY,
  MILESTONES_STORAGE_KEY,
  TOTAL_CLICKS_KEY,
  LAST_DAILY_BONUS_KEY,
  ACHIEVEMENTS_KEY,
  COMBO_MASTER_KEY,
  PRESTIGES_TODAY_KEY,
  'stellar-miner-first-upgrade-toast',
  'stellar-miner-first-planet-toast',
  'stellar-miner-first-astronaut-toast',
  'stellar-miner-first-prestige-toast',
];
import { getPresentationPort } from './uiBridge.js';
import { notifyRefresh } from './refreshSignal.js';

export function updateLastSavedIndicator(): void {
  const el = document.getElementById('last-saved-indicator');
  if (!el) return;
  const ts = saveLoad.getLastSaveTimestamp();
  if (ts === null) {
    el.textContent = '';
    return;
  }
  const ago = Date.now() - ts;
  if (ago < 3000) {
    el.textContent = t('lastSavedJustNow');
  } else if (ago < 60_000) {
    el.textContent = tParam('lastSavedAgo', { time: tParam('lastSavedSecs', { n: Math.floor(ago / 1000) }) });
  } else {
    el.textContent = tParam('lastSavedAgo', { time: tParam('lastSavedMins', { n: Math.floor(ago / 60_000) }) });
  }
}

export function openSettings(): void {
  getPresentationPort().openOverlay('settings-overlay', 'settings-overlay--open', {
    focusId: 'settings-close',
    onOpen: updateLastSavedIndicator,
  });
}

export function closeSettings(): void {
  getPresentationPort().closeOverlay('settings-overlay', 'settings-overlay--open');
}

export function applySettingsToUI(): void {
  notifyRefresh();
}

export function openResetConfirmModal(): void {
  getPresentationPort().openOverlay('reset-confirm-overlay', 'reset-confirm-overlay--open', {
    focusId: 'reset-confirm-cancel',
  });
}

export function closeResetConfirmModal(): void {
  getPresentationPort().closeOverlay('reset-confirm-overlay', 'reset-confirm-overlay--open');
}

export function handleResetProgress(): void {
  saveLoad.clearProgress();
  clearProgression();
  clearEverUnlockedUpgradeTiers();
  if (typeof localStorage !== 'undefined') {
    RESET_LOCAL_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  }
  const currentSession = getSession();
  const freshPlayer = Player.create('player-1');
  freshPlayer.addCoins(0);
  setSession(new GameSession(currentSession.id, freshPlayer, []));
  setActiveEventInstances([]);
  location.reload();
}
