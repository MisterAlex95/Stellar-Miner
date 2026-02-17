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

type ResearchProgressCancelOption = {
  getCancelHandler: (overlayEl: HTMLElement) => () => void;
};

function addProgressOverlayToCard(
  cardEl: HTMLElement,
  id: string,
  endTimeMs: number,
  totalDurationMs: number,
  cancelOption?: ResearchProgressCancelOption
): void {
  const now = Date.now();
  const remainingMs = Math.max(0, endTimeMs - now);
  const elapsedMs = totalDurationMs - remainingMs;
  const widthPercent = totalDurationMs > 0 ? Math.min(100, (elapsedMs / totalDurationMs) * 100) : 0;

  const overlay = document.createElement('div');
  overlay.className = 'research-progress-overlay';
  overlay.setAttribute('aria-live', 'polite');
  overlay.setAttribute('aria-busy', 'true');
  const cancelHtml =
    cancelOption?.getCancelHandler != null
      ? `<button type="button" class="research-progress-cancel" data-i18n="cancel">Cancel</button>`
      : '';
  overlay.innerHTML =
    '<div class="research-progress-track"><div class="research-progress-fill"></div></div><span class="research-progress-label">' +
    t('researching') +
    '</span>' +
    cancelHtml;
  cardEl.appendChild(overlay);
  cardEl.classList.add('research-card--in-progress');
  const fillEl = overlay.querySelector('.research-progress-fill') as HTMLElement;
  if (fillEl) {
    fillEl.style.width = `${widthPercent}%`;
    if (remainingMs > 0 && totalDurationMs > 0) {
      requestAnimationFrame(() => {
        fillEl.style.width = '100%';
        fillEl.style.transition = `width ${remainingMs}ms linear`;
      });
    }
  }
  const cancelBtn = overlay.querySelector('.research-progress-cancel') as HTMLButtonElement | null;
  if (cancelBtn && cancelOption?.getCancelHandler) {
    cancelBtn.textContent = t('cancel');
    cancelBtn.addEventListener('click', cancelOption.getCancelHandler(overlay));
  }
}

function refreshAfterResearch(researchId: string): void {
  removeResearchInProgress(researchId);
  researchProgressEndTimeMs.delete(researchId);
  notifyRefresh();
  getPresentationPort().renderResearchSection();
  const remainingIds = getResearchInProgressIds();
  const session = getSession();
  const scientistCount = session?.player.crewByRole?.scientist ?? 0;
  for (const id of remainingIds) {
    const endMs = researchProgressEndTimeMs.get(id);
    const card = document.querySelector<HTMLElement>(`[data-research-id="${id}"]`);
    const totalMs = getResearchDurationMs(id, scientistCount);
    if (card && endMs) addProgressOverlayToCard(card, id, endMs, totalMs);
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
  const usePrestigePoint = (document.querySelector(`[data-research-id="${id}"] .research-use-prestige-point`) as HTMLInputElement)?.checked ?? false;
  const result = attemptResearch(id, spendCoins, getUpgradeDisplayLine, scientistCount, { usePrestigePoint });

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

export function startResearchWithProgress(cardEl: HTMLElement, id: string): void {
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
  addProgressOverlayToCard(cardEl, id, endTimeMs, durationMs, {
    getCancelHandler: (overlayEl) => () => {
      clearTimeout(timeoutId);
      session.player.addCoins(effectiveCost);
      removeResearchInProgress(id);
      researchProgressEndTimeMs.delete(id);
      overlayEl.remove();
      cardEl.classList.remove('research-card--in-progress');
      notifyRefresh();
    },
  });
  timeoutId = setTimeout(() => {
    handleResearchAttempt(id, { coinsAlreadySpent: true });
  }, durationMs);
}
