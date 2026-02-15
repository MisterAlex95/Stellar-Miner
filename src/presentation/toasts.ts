import { formatNumber } from '../application/format.js';
import { getSettings } from '../application/gameState.js';
import { DAILY_BONUS_COINS } from '../application/catalogs.js';
import { t, tParam } from '../application/strings.js';
import { getCatalogComboName, getCatalogEventName } from '../application/i18nCatalogs.js';
import type { GameEvent } from '../domain/entities/GameEvent.js';

export function showAchievementToast(name: string): void {
  const container = document.getElementById('event-toasts');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'event-toast event-toast--achievement';
  el.setAttribute('role', 'status');
  el.textContent = tParam('achievementToast', { name });
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('event-toast--visible'));
  setTimeout(() => {
    el.classList.remove('event-toast--visible');
    setTimeout(() => el.remove(), 300);
  }, 4000);
}

export function showMiniMilestoneToast(message: string): void {
  const container = document.getElementById('event-toasts');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'event-toast event-toast--milestone';
  el.setAttribute('role', 'status');
  el.textContent = message;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('event-toast--visible'));
  setTimeout(() => {
    el.classList.remove('event-toast--visible');
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

export function showEventToast(gameEvent: GameEvent): void {
  const container = document.getElementById('event-toasts');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'event-toast';
  el.setAttribute('role', 'status');
  const name = getCatalogEventName(gameEvent.id);
  el.textContent = `${name}: ×${gameEvent.effect.multiplier} production for ${gameEvent.effect.durationMs / 1000}s`;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('event-toast--visible'));
  setTimeout(() => {
    el.classList.remove('event-toast--visible');
    setTimeout(() => el.remove(), 300);
  }, 4000);
}

export function showOfflineToast(coins: number, capped?: boolean): void {
  const container = document.getElementById('event-toasts');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'event-toast event-toast--offline';
  el.setAttribute('role', 'status');
  el.textContent = capped
    ? tParam('welcomeBackCapped', { coins: formatNumber(coins, false) })
    : tParam('welcomeBack', { coins: formatNumber(coins, false) });
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('event-toast--visible'));
  setTimeout(() => {
    el.classList.remove('event-toast--visible');
    setTimeout(() => el.remove(), 300);
  }, 5000);
}

export function showSuperLuckyToast(coins: number): void {
  const container = document.getElementById('event-toasts');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'event-toast event-toast--super-lucky';
  el.setAttribute('role', 'status');
  el.textContent = tParam('luckyToast', { coins: formatNumber(coins, false) });
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('event-toast--visible'));
  setTimeout(() => {
    el.classList.remove('event-toast--visible');
    setTimeout(() => el.remove(), 300);
  }, 2800);
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
  const container = document.getElementById('event-toasts');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'event-toast event-toast--streak';
  el.setAttribute('role', 'status');
  el.textContent = tParam('questStreakToastFormat', { n: streak, pct: Math.round((mult - 1) * 100) });
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('event-toast--visible'));
  setTimeout(() => {
    el.classList.remove('event-toast--visible');
    setTimeout(() => el.remove(), 300);
  }, 2500);
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
  const container = document.getElementById('event-toasts');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'event-toast event-toast--milestone';
  el.setAttribute('role', 'status');
  el.textContent = tParam('milestoneToastFormat', { coins: formatNumber(coins, false) });
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('event-toast--visible'));
  setTimeout(() => {
    el.classList.remove('event-toast--visible');
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

export function showDailyBonusToast(): void {
  const container = document.getElementById('event-toasts');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'event-toast event-toast--daily';
  el.setAttribute('role', 'status');
  el.textContent = tParam('dailyBonusToastFormat', { n: DAILY_BONUS_COINS });
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('event-toast--visible'));
  setTimeout(() => {
    el.classList.remove('event-toast--visible');
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

export function showCriticalToast(coins: number): void {
  const container = document.getElementById('event-toasts');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'event-toast event-toast--critical';
  el.setAttribute('role', 'status');
  el.textContent = tParam('criticalToastFormat', { coins: formatNumber(coins, false) });
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('event-toast--visible'));
  setTimeout(() => {
    el.classList.remove('event-toast--visible');
    setTimeout(() => el.remove(), 300);
  }, 2500);
}

export function showPrestigeMilestoneToast(level: number): void {
  const container = document.getElementById('event-toasts');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'event-toast event-toast--prestige-milestone';
  el.setAttribute('role', 'status');
  el.textContent = tParam('prestigeMilestoneToastFormat', { level, pct: level * 5 });
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('event-toast--visible'));
  setTimeout(() => {
    el.classList.remove('event-toast--visible');
    setTimeout(() => el.remove(), 300);
  }, 3500);
}
