import { getSession } from './gameState.js';
import {
  attemptResearch,
  canAttemptResearch,
  getCrewFreedByUnlockingNode,
  setResearchInProgress,
  isResearchInProgress,
  RESEARCH_CATALOG,
} from './research.js';
import { getCatalogUpgradeName } from './i18nCatalogs.js';
import { t, tParam } from './strings.js';
import { updateStats } from '../presentation/statsView.js';
import { renderUpgradeList } from '../presentation/upgradeListView.js';
import { renderResearchSection } from '../presentation/researchView.js';
import { renderCrewSection } from '../presentation/crewView.js';
import { showMiniMilestoneToast } from '../presentation/toasts.js';
import { saveSession } from './handlersSave.js';

const RESEARCH_PROGRESS_DURATION_MS = 2500;

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
  saveSession();
  updateStats();
  renderUpgradeList();
  renderResearchSection();
  setResearchInProgress(false);
  if (result.success) {
    const node = RESEARCH_CATALOG.find((n) => n.id === id);
    if (node) {
      const freed = getCrewFreedByUnlockingNode(node, session.player.upgrades);
      if (freed > 0) {
        session.player.unassignCrewFromEquipment(freed);
        session.player.addAstronauts(freed, 'miner');
        saveSession();
        renderCrewSection();
      }
    }
    showMiniMilestoneToast(result.message);
  } else if (result.message.includes('failed')) {
    showMiniMilestoneToast(result.message.includes('Coins spent') ? t('researchFailedCoinsSpent') : t('researchFailedTryAgain'));
  }
}

export function startResearchWithProgress(cardEl: HTMLElement, id: string): void {
  if (isResearchInProgress()) return;
  const session = getSession();
  if (!session) return;
  const node = RESEARCH_CATALOG.find((n) => n.id === id);
  if (!node || !canAttemptResearch(id) || !session.player.coins.gte(node.cost)) return;

  session.player.spendCoins(node.cost);
  saveSession();
  updateStats();

  const durationMs = RESEARCH_PROGRESS_DURATION_MS;
  const overlay = document.createElement('div');
  overlay.className = 'research-progress-overlay';
  overlay.setAttribute('aria-live', 'polite');
  overlay.setAttribute('aria-busy', 'true');
  overlay.innerHTML = '<div class="research-progress-track"><div class="research-progress-fill"></div></div><span class="research-progress-label">' + t('researching') + '</span>';
  cardEl.appendChild(overlay);
  cardEl.classList.add('research-card--in-progress');
  const fillEl = overlay.querySelector('.research-progress-fill') as HTMLElement;
  if (fillEl) {
    requestAnimationFrame(() => {
      fillEl.style.width = '100%';
    });
  }
  setResearchInProgress(true);
  setTimeout(() => {
    handleResearchAttempt(id, { coinsAlreadySpent: true });
  }, durationMs);
}
