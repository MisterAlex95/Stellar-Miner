/**
 * Concrete implementation of the presentation port. Wires application UI bridge to real UI.
 */
import type { PresentationPort } from '../application/uiBridge.js';
import * as toasts from './toasts/index.js';
import { openOverlay, closeOverlay } from './lib/overlay.js';
import { showToast } from './toasts/index.js';
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

function setPrestigeConfirmContent(desc: string, after: string, gainEstimate?: string): void {
  const pinia = getPinia();
  if (pinia) useAppUIStore(pinia).setPrestigeConfirmContent(desc, after, gainEstimate);
}

function setPrestigeRewardsContent(levels: string[]): void {
  const pinia = getPinia();
  if (pinia) useAppUIStore(pinia).setPrestigeRewardsContent(levels);
}

function setLastSavedText(text: string): void {
  const pinia = getPinia();
  if (pinia) useAppUIStore(pinia).setLastSavedText(text);
}

const researchCancelCallbacks = new Map<string, () => void>();

function setResearchProgress(
  researchId: string,
  data: { endTimeMs: number; totalDurationMs: number; hasCancel: boolean } | null,
  onCancel?: () => void
): void {
  const pinia = getPinia();
  if (pinia) useAppUIStore(pinia).setResearchProgress(researchId, data);
  if (data === null) researchCancelCallbacks.delete(researchId);
  else if (onCancel) researchCancelCallbacks.set(researchId, onCancel);
}

function cancelResearchProgress(researchId: string): void {
  const cb = researchCancelCallbacks.get(researchId);
  researchCancelCallbacks.delete(researchId);
  const pinia = getPinia();
  if (pinia) useAppUIStore(pinia).setResearchProgress(researchId, null);
  cb?.();
}

const upgradeCancelCallbacks = new Map<string, () => void>();

function setUpgradeProgress(
  key: string,
  data: { current: number; total: number; label: string; showCancel: boolean; isUninstall?: boolean } | null,
  onCancel?: () => void
): void {
  const pinia = getPinia();
  if (pinia) useAppUIStore(pinia).setUpgradeProgress(key, data);
  if (data === null) upgradeCancelCallbacks.delete(key);
  else if (onCancel) upgradeCancelCallbacks.set(key, onCancel);
}

function cancelUpgradeProgress(key: string): void {
  const cb = upgradeCancelCallbacks.get(key);
  upgradeCancelCallbacks.delete(key);
  const pinia = getPinia();
  if (pinia) useAppUIStore(pinia).setUpgradeProgress(key, null);
  cb?.();
}

function setDebugOpen(open: boolean): void {
  const pinia = getPinia();
  if (pinia) useAppUIStore(pinia).setDebugOpen(open);
}

function setDebugStats(rows: { label: string; value: string }[]): void {
  const pinia = getPinia();
  if (pinia) useAppUIStore(pinia).setDebugStats(rows);
}

function getDebugOpen(): boolean {
  const pinia = getPinia();
  return pinia ? useAppUIStore(pinia).debugOpen : false;
}

function setExpeditionData(data: Parameters<PresentationPort['setExpeditionData']>[0]): void {
  const pinia = getPinia();
  if (pinia) useAppUIStore(pinia).setExpeditionData(data);
}

function clearExpedition(): void {
  const pinia = getPinia();
  if (pinia) useAppUIStore(pinia).clearExpedition();
}

function setPlanetDetailData(data: Parameters<PresentationPort['setPlanetDetailData']>[0]): void {
  const pinia = getPinia();
  if (pinia) useAppUIStore(pinia).setPlanetDetailData(data);
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
    setPrestigeConfirmContent,
    setPrestigeRewardsContent,
    setLastSavedText,
    setResearchProgress,
    cancelResearchProgress,
    setUpgradeProgress,
    cancelUpgradeProgress,
    setDebugOpen,
    getDebugOpen,
    setDebugStats,
    setExpeditionData,
    clearExpedition,
    setPlanetDetailData,
  };
}
