/**
 * Domain-specific toast functions (achievement, milestone, event, offline, etc.). Used by presentation port.
 */
import { formatNumber } from '../../application/format.js';
import { getSettings } from '../../application/gameState.js';
import { DAILY_BONUS_COINS } from '../../application/catalogs.js';
import { t, tParam } from '../../application/strings.js';
import { getCatalogEventName } from '../../application/i18nCatalogs.js';
import type { GameEvent } from '../../domain/entities/GameEvent.js';
import { showToast } from './showToast.js';
import {
  showFloatingReward as showFloatingRewardImpl,
  showFloatingCoinFixed as showFloatingCoinFixedImpl,
} from '../lib/floatingFeedback.js';

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
  showFloatingRewardImpl(text, anchor);
}

export function showQuestStreakToast(streak: number, mult: number): void {
  showToast(
    tParam('questStreakToastFormat', { n: streak, pct: Math.round((mult - 1) * 100) }),
    'streak',
    { duration: 2500 }
  );
}

/** Format click amount for display: integer as "N", decimal as "N.N" so multipliers (combo, research) are visible. */
function formatFloatingCoinAmount(amount: number): string {
  const rounded = Math.round(amount);
  if (Math.abs(amount - rounded) < 0.005) return String(rounded);
  return amount.toFixed(1).replace(/\.?0+$/, '');
}

export function showFloatingCoin(
  amount: number,
  clientX: number,
  clientY: number,
  options?: { lucky?: boolean; superLucky?: boolean; critical?: boolean }
): void {
  const formatted = formatFloatingCoinAmount(amount);
  const displayText =
    options?.critical ? `✧ CRITICAL +${formatted}` : options?.superLucky ? `★ +${formatted}` : `+${formatted}`;
  const variant = options?.critical ? 'critical' : options?.superLucky ? 'super-lucky' : options?.lucky ? 'lucky' : 'default';
  // Always use fixed/body so floating coin is visible (mine-zone Teleport was not showing).
  showFloatingCoinFixedImpl(displayText, clientX, clientY, { variant });
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

export function showPrestigeMilestoneToast(level: number, pct?: number): void {
  const displayPct = pct != null ? pct : Math.round(level * 7);
  showToast(tParam('prestigeMilestoneToastFormat', { level, pct: displayPct }), 'prestige-milestone', {
    duration: 3500,
  });
}
