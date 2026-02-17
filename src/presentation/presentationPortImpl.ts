/**
 * Concrete implementation of the presentation port. Wires application UI bridge to real UI.
 */

import type { PresentationPort } from '../application/uiBridge.js';
import * as toasts from './toasts.js';
import { openOverlay, closeOverlay } from './components/overlay.js';
import { showToast } from './components/toasts.js';
import { renderResearchSection } from './researchView.js';
import { flashUpgradeCard } from './upgradeListView.js';

function addQuestClaimedAnimation(): void {
  const q = document.getElementById('quest-section');
  if (q) {
    q.classList.add('quest-section--claimed');
    setTimeout(() => q.classList.remove('quest-section--claimed'), 600);
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
    renderResearchSection,
    openOverlay,
    closeOverlay,
    addQuestClaimedAnimation,
  };
}
