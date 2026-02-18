import {
  handleClaimQuest,
  openPrestigeConfirmModal,
  handleUpgradeBuy,
} from '../../application/handlers.js';
import { pushTabState, switchTab } from '../mountTabs.js';
import { useGameStateStore } from '../stores/gameState.js';

/** Dashboard click handling and tab navigation. */
export function useDashboardActions() {
  const gameState = useGameStateStore();

  function goToTab(tabId: string): void {
    pushTabState(tabId);
    switchTab(tabId);
    gameState.setActiveTab(tabId);
  }

  function onDashboardClick(e: MouseEvent): void {
    const target = (e.target as HTMLElement).closest('button');
    if (!target) return;
    const id = target.id;
    const goto = target.getAttribute('data-goto');
    if (id === 'dashboard-do-claim') {
      handleClaimQuest();
      return;
    }
    if (id === 'dashboard-do-prestige') {
      openPrestigeConfirmModal();
      return;
    }
    if (id === 'dashboard-do-upgrade') {
      const upgradeId = target.getAttribute('data-upgrade-id');
      const planetId = target.getAttribute('data-planet-id') ?? undefined;
      if (upgradeId) handleUpgradeBuy(upgradeId, planetId);
      return;
    }
    if (id === 'dashboard-goto-mine') {
      goToTab('mine');
      return;
    }
    if (id === 'dashboard-goto-empire') {
      goToTab('empire');
      return;
    }
    if (id === 'dashboard-goto-research') {
      goToTab('research');
      return;
    }
    if (goto) goToTab(goto);
  }

  return { goToTab, onDashboardClick };
}
