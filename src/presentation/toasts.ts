import { formatNumber } from '../application/format.js';
import { getSettings } from '../application/gameState.js';
import { DAILY_BONUS_COINS } from '../application/catalogs.js';
import { t, tParam } from '../application/strings.js';
import { getCatalogComboName, getCatalogEventName } from '../application/i18nCatalogs.js';
import type { GameEvent } from '../domain/entities/GameEvent.js';
import { showToast } from './components/toasts.js';

export function showAchievementToast(name: string): void {
  showToast(tParam('achievementToast', { name }), 'achievement', { duration: 4000 });
}

export function showMiniMilestoneToast(message: string): void {
  showToast(message, 'milestone', { duration: 3000 });
}

export function showEventToast(gameEvent: GameEvent): void {
  const isNegative = gameEvent.effect.multiplier < 1;
  const name = getCatalogEventName(gameEvent.id);
  const message = `${name}: ×${gameEvent.effect.multiplier} production for ${gameEvent.effect.durationMs / 1000}s`;
  showToast(message, isNegative ? 'negative' : '', { duration: 4000 });
}

export function showOfflineToast(coins: number, capped?: boolean): void {
  const message = capped
    ? tParam('welcomeBackCapped', { coins: formatNumber(coins, false) })
    : tParam('welcomeBack', { coins: formatNumber(coins, false) });
  showToast(message, 'offline', { duration: 5000 });
}

export function showSuperLuckyToast(coins: number): void {
  showToast(tParam('luckyToast', { coins: formatNumber(coins, false) }), 'super-lucky', { duration: 2800 });
}

export function showFloatingReward(amount: number, anchor: HTMLElement): void {
  const settings = getSettings();
  const el = document.createElement('span');
  el.className = 'float-reward';
  el.textContent = `+${formatNumber(amount, settings.compactNumbers)} ⬡`;
  const rect = anchor.getBoundingClientRect();
  el.style.left = `${rect.left + rect.width / 2}px`;
  el.style.top = `${rect.top + rect.height / 2}px`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('float-reward--active'));
  setTimeout(() => {
    el.classList.remove('float-reward--active');
    setTimeout(() => el.remove(), 400);
  }, 1200);
}

export function showQuestStreakToast(streak: number, mult: number): void {
  showToast(
    tParam('questStreakToastFormat', { n: streak, pct: Math.round((mult - 1) * 100) }),
    'streak',
    { duration: 2500 }
  );
}

export function showFloatingCoin(
  amount: number,
  clientX: number,
  clientY: number,
  options?: { lucky?: boolean; superLucky?: boolean; critical?: boolean; comboMult?: number }
): void {
  const zone = document.getElementById('mine-zone');
  const floats = document.getElementById('mine-zone-floats');
  if (!zone || !floats) return;
  const rect = zone.getBoundingClientRect();
  const el = document.createElement('span');
  el.className =
    'float-coin' +
    (options?.critical ? ' float-coin--critical' : options?.superLucky ? ' float-coin--super-lucky' : options?.lucky ? ' float-coin--lucky' : '');
  el.textContent = options?.critical ? `✧ CRITICAL +${amount}` : options?.superLucky ? `★ +${amount}` : `+${amount}`;
  el.style.left = `${clientX - rect.left}px`;
  el.style.top = `${clientY - rect.top}px`;
  floats.appendChild(el);
  if (options?.comboMult && options.comboMult > 1 && !options?.critical) {
    const comboEl = document.createElement('span');
    comboEl.className = 'float-coin-combo';
    comboEl.textContent = `${getCatalogComboName(options.comboMult)} ×${options.comboMult.toFixed(1)}`;
    comboEl.style.left = `${clientX - rect.left}px`;
    comboEl.style.top = `${clientY - rect.top - 12}px`;
    floats.appendChild(comboEl);
    requestAnimationFrame(() => comboEl.classList.add('float-coin--active'));
    setTimeout(() => {
      comboEl.classList.remove('float-coin--active');
      setTimeout(() => comboEl.remove(), 350);
    }, 800);
  }
  requestAnimationFrame(() => el.classList.add('float-coin--active'));
  setTimeout(() => {
    el.classList.remove('float-coin--active');
    setTimeout(() => el.remove(), 350);
  }, 650);
}

export function showMilestoneToast(coins: number): void {
  showToast(tParam('milestoneToastFormat', { coins: formatNumber(coins, false) }), 'milestone', { duration: 3500 });
}

export function showDailyBonusToast(): void {
  showToast(tParam('dailyBonusToastFormat', { n: DAILY_BONUS_COINS }), 'daily', { duration: 3000 });
}

export function showCriticalToast(coins: number): void {
  showToast(tParam('criticalToastFormat', { coins: formatNumber(coins, false) }), 'critical', { duration: 2500 });
}

export function showPrestigeMilestoneToast(level: number): void {
  showToast(tParam('prestigeMilestoneToastFormat', { level, pct: level * 5 }), 'prestige-milestone', {
    duration: 3500,
  });
}
