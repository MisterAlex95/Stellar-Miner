/**
 * Reactive upgrade list data for the Upgrades panel. Replaces renderUpgradeList/updateUpgradeListInPlace.
 */
import { computed } from 'vue';
import { useGameStateStore } from '../stores/gameState.js';
import { getSession, getSettings } from '../../application/gameState.js';
import {
  UPGRADE_CATALOG,
  getDisplayUnlockedUpgradeTiers,
  UPGRADE_DISPLAY_COUNT,
  type UpgradeDef,
} from '../../application/catalogs.js';
import { getPlanetDisplayName } from '../../application/solarSystems.js';
import {
  getMaxBuyCount,
  getInstallingRanges,
  getInstallingCountByPlanet,
  getUninstallingRanges,
  getUninstallingByPlanet,
  type InstallUninstallRange,
} from '../../application/upgradeHelpers.js';
import { getUpgradeCardState, type UpgradeCardState } from '../../application/upgradeCardState.js';
import { t } from '../../application/strings.js';

export type UpgradeCardItem = {
  state: UpgradeCardState;
  def: UpgradeDef;
  planetsForSelect: { id: string; name: string }[];
  choosePlanet: boolean;
  /** Active installs (endsAt > now); for progress overlay */
  installingRanges: InstallUninstallRange[];
  installingByPlanet: { planetId: string; count: number }[];
  /** Active uninstalls (endsAt > now) */
  uninstallingRanges: InstallUninstallRange[];
  uninstallingByPlanet: { planetId: string }[];
};

export function useUpgradeList() {
  const store = useGameStateStore();

  const cards = computed<UpgradeCardItem[]>(() => {
    void store.coins;
    void store.production;
    const session = getSession();
    if (!session) return [];
    const player = session.player;
    const settings = getSettings();
    const planetsWithSlot = player.getPlanetsWithFreeSlot();
    const hasFreeSlot = planetsWithSlot.length > 0;
    const choosePlanet = player.planets.length > 1;

    const ownedIds = player.upgrades.map((u) => u.id);
    const unlockedTiers = getDisplayUnlockedUpgradeTiers(ownedIds);
    const allUnlockedDefs = UPGRADE_CATALOG.filter((d) => unlockedTiers.has(d.tier)).sort(
      (a, b) => a.tier - b.tier
    );
    const defsToShow = allUnlockedDefs.slice(0, UPGRADE_DISPLAY_COUNT);

    const now = Date.now();
    return defsToShow.map((def) => {
      const maxCount = getMaxBuyCount(def.id);
      const state = getUpgradeCardState(def, player, settings, hasFreeSlot, maxCount);
      const planetList = state.needsSlot ? planetsWithSlot : player.planets;
      const planetsForSelect = planetList.map((p) => {
        const idx = player.planets.findIndex((pl) => pl.id === p.id);
        return { id: p.id, name: getPlanetDisplayName(p.name, idx >= 0 ? idx : 0) };
      });
      const installingRanges = getInstallingRanges(def.id).filter((r) => r.endsAt > now);
      const uninstallingRanges = getUninstallingRanges(def.id).filter((r) => r.endsAt > now);
      return {
        state,
        def,
        planetsForSelect,
        choosePlanet,
        installingRanges,
        installingByPlanet: getInstallingCountByPlanet(def.id),
        uninstallingRanges,
        uninstallingByPlanet: getUninstallingByPlanet(def.id),
      };
    });
  });

  const emptyText = t('emptyUpgradesText');

  return { cards, emptyText };
}
