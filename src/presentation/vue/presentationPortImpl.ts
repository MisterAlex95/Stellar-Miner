/**
 * Concrete implementation of the presentation port. Wires application UI bridge to real UI.
 */
import type { PresentationPort } from '../../application/uiBridge.js';
import * as toasts from './toasts.js';
import { openOverlay, closeOverlay } from './lib/overlay.js';
import { showToast } from './lib/toasts.js';
import { getPinia } from './piniaInstance.js';
import { useAppUIStore } from './stores/appUI.js';

function addQuestClaimedAnimation(): void {
  const pinia = getPinia();
  if (pinia) {
    useAppUIStore(pinia).setQuestClaimedFlash(true);
    setTimeout(() => useAppUIStore(pinia).setQuestClaimedFlash(false), 600);
  }
}

function flashUpgradeCard(upgradeId: string): void {
  const pinia = getPinia();
  if (pinia) {
    useAppUIStore(pinia).setFlashUpgradeId(upgradeId);
    setTimeout(() => useAppUIStore(pinia).setFlashUpgradeId(''), 700);
  }
}

export function createPresentationPort(): PresentationPort {
  return {
    showAchievementToast: toasts.showAchievementToast,
    showMiniMilestoneToast: toasts.showMiniMilestoneToast,
    showMilestoneToast: toasts.showMilestoneToast,
    showPrestigeMilestoneToast: toasts.showPrestigeMilestoneToast,
    showQuestStreakToast: toasts.showQuestStreakToast,
    showEventToast: toasts.showEventToast,
    showFloatingReward: toasts.showFloatingReward,
    showFloatingCoin: toasts.showFloatingCoin,
    showSuperLuckyToast: toasts.showSuperLuckyToast,
    showCriticalToast: toasts.showCriticalToast,
    showDailyBonusToast: toasts.showDailyBonusToast,
    showToast,
    flashUpgradeCard,
    updateComboIndicator: () => {},
    renderResearchSection: () => {},
    openOverlay,
    closeOverlay,
    addQuestClaimedAnimation,
  };
}
