import { getSession } from '../../../application/gameState.js';
import {
  openUpgradeChoosePlanetModal,
  getPlanetsForInstallModal,
} from '../../upgradeChoosePlanetModal.js';
import {
  handleUpgradeBuy,
  handleUpgradeBuyMax,
  handleUpgradeUninstall,
  showUpgradeInstallProgress,
  showUpgradeUninstallProgress,
  cancelUpgradeInstall,
  cancelUpgradeUninstall,
} from '../../../application/handlers.js';

/** Upgrade list click handling: buy, max, uninstall. */
export function useUpgradeActions() {
  function onUpgradeClick(e: Event): void {
    const clicked = e.target as HTMLElement;
    const card = clicked.closest('.upgrade-card');
    if (!card) return;
    let target = clicked.closest('button.upgrade-btn') as HTMLButtonElement | null;
    if (!target) {
      const wrap = clicked.closest('.btn-tooltip-wrap');
      target = wrap?.querySelector<HTMLButtonElement>('button.upgrade-btn') ?? null;
    }
    if (!target || target.hasAttribute('disabled')) return;
    e.preventDefault();
    const upgradeId = target.getAttribute('data-upgrade-id') ?? card.getAttribute('data-upgrade-id');
    if (!upgradeId) return;
    const session = getSession();
    const player = session?.player;
    const action = target.getAttribute('data-action');

    if (action === 'uninstall') {
      const uninstallPlanetsJson = target.getAttribute('data-uninstall-planets');
      const uninstallPlanetId = target.getAttribute('data-uninstall-planet-id');
      if (uninstallPlanetsJson) {
        try {
          const planets = JSON.parse(uninstallPlanetsJson) as { id: string; name: string }[];
          if (planets.length > 0) {
            openUpgradeChoosePlanetModal({ upgradeId, action: 'uninstall', planets });
          }
        } catch {
          // ignore
        }
      } else if (uninstallPlanetId) {
        const result = handleUpgradeUninstall(upgradeId, uninstallPlanetId);
        if (result.uninstalled && result.durationMs != null) {
          const durationMs = result.durationMs;
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const cardEl = document.querySelector<HTMLElement>(`.upgrade-card[data-upgrade-id="${upgradeId}"]`);
              if (cardEl) {
                showUpgradeUninstallProgress(cardEl, durationMs, {
                  upgradeId,
                  planetId: uninstallPlanetId,
                  onCancel: () => cancelUpgradeUninstall(upgradeId, uninstallPlanetId),
                });
              }
            });
          });
        }
      }
      return;
    }

    const multiPlanet = player && player.planets.length > 1;
    const maxCountAttr = target.getAttribute('data-max-count');
    const maxCount = maxCountAttr != null ? parseInt(maxCountAttr, 10) : undefined;

    if (action === 'max') {
      if (multiPlanet) {
        const planets = getPlanetsForInstallModal(upgradeId);
        if (planets.length > 0) {
          openUpgradeChoosePlanetModal({
            upgradeId,
            action: 'max',
            planets,
            maxCount: Number.isFinite(maxCount) ? maxCount : undefined,
          });
        }
      } else {
        const planetId = player?.planets[0]?.id;
        const result = handleUpgradeBuyMax(upgradeId, planetId, Number.isFinite(maxCount) ? maxCount : undefined);
        if (result.bought > 0 && result.durations.length > 0 && card instanceof HTMLElement && planetId) {
          showUpgradeInstallProgress(card, result.durations, {
            upgradeId,
            planetId,
            onCancel: () => cancelUpgradeInstall(upgradeId, planetId, result.durations.length),
          });
        }
      }
      return;
    }

    if (action === 'buy') {
      if (multiPlanet) {
        const planets = getPlanetsForInstallModal(upgradeId);
        if (planets.length > 0) {
          openUpgradeChoosePlanetModal({ upgradeId, action: 'buy', planets });
        }
      } else {
        const planetId = player?.planets[0]?.id;
        const result = handleUpgradeBuy(upgradeId, planetId);
        if (result.bought && result.durations.length > 0 && card instanceof HTMLElement && planetId) {
          showUpgradeInstallProgress(card, result.durations, {
            upgradeId,
            planetId,
            onCancel: () => cancelUpgradeInstall(upgradeId, planetId, result.durations.length),
          });
        }
      }
    }
  }

  return { onUpgradeClick };
}
