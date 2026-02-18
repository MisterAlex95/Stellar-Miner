import { getSession } from './gameState.js';
import {
  attemptResearch,
  canAttemptResearch,
  getCrewFreedByUnlockingNode,
  addResearchInProgress,
  removeResearchInProgress,
  isResearchInProgress,
  getResearchInProgressIds,
  getEffectiveCost,
  getResearchDurationMs,
  RESEARCH_CATALOG,
} from './research.js';
import { getCatalogUpgradeName } from './i18nCatalogs.js';
import { t, tParam } from './strings.js';
import { getPresentationPort } from './uiBridge.js';
import { notifyRefresh } from './refreshSignal.js';
import { checkAchievements } from './achievements.js';


/** End timestamp (Date.now()) per research id, for restoring progress bars after re-render. */
const researchProgressEndTimeMs = new Map<string, number>();

function refreshAfterResearch(researchId: string): void {
  removeResearchInProgress(researchId);
  researchProgressEndTimeMs.delete(researchId);
  getPresentationPort().setResearchProgress(researchId, null);
  notifyRefresh();
  getPresentationPort().renderResearchSection();
  const remainingIds = getResearchInProgressIds();
  const session = getSession();
  const scientistCount = session?.player.crewByRole?.scientist ?? 0;
  for (const id of remainingIds) {
    const endMs = researchProgressEndTimeMs.get(id);
    const totalMs = getResearchDurationMs(id, scientistCount);
    if (endMs != null && totalMs > 0) {
      getPresentationPort().setResearchProgress(id, { endTimeMs: endMs, totalDurationMs: totalMs, hasCancel: false });
    }
  }
}

export function handleResearchAttempt(id: string, options?: { coinsAlreadySpent?: boolean }): void {
  const session = getSession();
  if (!session) return;
  const getUpgradeDisplayLine = (upgradeId: string, kind: 'slot' | 'crew', n: number) =>
    kind === 'slot'
      ? tParam('researchUpgradeLessSlot', { name: getCatalogUpgradeName(upgradeId), n })
      : tParam('researchUpgradeLessCrew', { name: getCatalogUpgradeName(upgradeId), n });
  const spendCoins = options?.coinsAlreadySpent
    ? () => true
    : (amount: number) => {
        if (!session.player.coins.gte(amount)) return false;
        session.player.spendCoins(amount);
        return true;
      };
  const scientistCount = session.player.crewByRole?.scientist ?? 0;
  const result = attemptResearch(id, spendCoins, getUpgradeDisplayLine, scientistCount);

  if (result.success) {
    const node = RESEARCH_CATALOG.find((n) => n.id === id);
    let needsCrewRefresh = false;
    if (node) {
      const freed = getCrewFreedByUnlockingNode(node, session.player.upgrades);
      if (freed > 0) {
        session.player.unassignCrewFromEquipment(freed, false);
        session.player.addAstronauts(freed, 'miner');
        needsCrewRefresh = true;
      }
    }
    refreshAfterResearch(id);
    getPresentationPort().showMiniMilestoneToast(result.message);
    checkAchievements();
  } else {
    refreshAfterResearch(id);
    if (result.message.includes('failed')) {
      const msg = result.message.includes('Coins spent') ? t('researchFailedCoinsSpent') : t('researchFailedTryAgain');
      getPresentationPort().showMiniMilestoneToast(msg);
    }
  }
}

export function startResearchWithProgress(_cardEl: HTMLElement, id: string): void {
  if (isResearchInProgress(id)) return;
  const session = getSession();
  if (!session) return;
  const node = RESEARCH_CATALOG.find((n) => n.id === id);
  const effectiveCost = getEffectiveCost(id);
  if (!node || !canAttemptResearch(id) || !session.player.coins.gte(effectiveCost)) return;

  session.player.spendCoins(effectiveCost);
  const scientistCount = session.player.crewByRole?.scientist ?? 0;
  const durationMs = getResearchDurationMs(id, scientistCount);
  const endTimeMs = Date.now() + durationMs;
  researchProgressEndTimeMs.set(id, endTimeMs);
  addResearchInProgress(id);
  let timeoutId: ReturnType<typeof setTimeout>;
  const onCancel = (): void => {
    clearTimeout(timeoutId);
    session.player.addCoins(effectiveCost);
    removeResearchInProgress(id);
    researchProgressEndTimeMs.delete(id);
    notifyRefresh();
  };
  getPresentationPort().setResearchProgress(id, { endTimeMs, totalDurationMs: durationMs, hasCancel: true }, onCancel);
  timeoutId = setTimeout(() => {
    getPresentationPort().setResearchProgress(id, null);
    handleResearchAttempt(id, { coinsAlreadySpent: true });
  }, durationMs);
}
