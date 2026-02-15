import { formatNumber } from '../application/format.js';
import { getSettings } from '../application/gameState.js';
import { DAILY_BONUS_COINS } from '../application/catalogs.js';
import { t, tParam } from '../application/strings.js';
import { getCatalogComboName, getCatalogEventName } from '../application/i18nCatalogs.js';
import type { GameEvent } from '../domain/entities/GameEvent.js';
import { showToast } from './components/toasts.js';
import {
  showFloatingReward as showFloatingRewardComponent,
  showFloatingCoin as showFloatingCoinComponent,
} from './components/floatingFeedback.js';

export function showAchievementToast(name: string): void {
  showToast(tParam('achievementToast', { name }), 'achievement', { duration: 4000 });
}

export function showMiniMilestoneToast(message: string): void {
  showToast(message, 'milestone', { duration: 3000 });
}

export function showEventToast(gameEvent: GameEvent): void {
  const isNegative = gameEvent.effect.multiplier < 1;
  const name = getCatalogEventName(gameEvent.id);
  const multStr = `×${gameEvent.effect.multiplier}`;
  const durationSec = gameEvent.effect.durationMs / 1000;
  const message = `${name} — ${multStr} production for ${durationSec}s`;
  const variant = isNegative ? 'negative' : 'event-positive';
  showToast(message, variant, { duration: isNegative ? 5000 : 4000 });
}

export function showOfflineToast(coins: number, capped?: boolean, hours?: number): void {
  const coinsStr = formatNumber(coins, false);
  const message =
    hours != null && hours > 0
      ? capped
        ? tParam('welcomeBackCappedWithHours', { coins: coinsStr, hours: String(hours) })
        : tParam('welcomeBackWithHours', { coins: coinsStr, hours: String(hours) })
      : capped
        ? tParam('welcomeBackCapped', { coins: coinsStr })
        : tParam('welcomeBack', { coins: coinsStr });
  showToast(message, 'offline', { duration: 5000 });
}

export function showSuperLuckyToast(coins: number): void {
  showToast(tParam('luckyToast', { coins: formatNumber(coins, false) }), 'super-lucky', { duration: 2800 });
}

export function showFloatingReward(amount: number, anchor: HTMLElement): void {
  const settings = getSettings();
  const text = `+${formatNumber(amount, settings.compactNumbers)} ⬡`;
  showFloatingRewardComponent(text, anchor);
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
  const displayText =
    options?.critical ? `✧ CRITICAL +${amount}` : options?.superLucky ? `★ +${amount}` : `+${amount}`;
  const variant = options?.critical ? 'critical' : options?.superLucky ? 'super-lucky' : options?.lucky ? 'lucky' : 'default';
  const comboText =
    options?.comboMult && options.comboMult > 1 && !options?.critical
      ? `${getCatalogComboName(options.comboMult)} ×${options.comboMult.toFixed(1)}`
      : undefined;
  showFloatingCoinComponent(displayText, clientX, clientY, { zone, floats }, { variant, comboText });
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
