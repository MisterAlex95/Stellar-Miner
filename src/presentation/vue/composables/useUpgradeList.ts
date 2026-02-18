/**
 * Reactive upgrade list data for the Upgrades panel. Replaces renderUpgradeList/updateUpgradeListInPlace.
 */
import { computed } from 'vue';
import { useGameStateStore } from '../stores/gameState.js';
import { getSession, getSettings } from '../../../application/gameState.js';
import {
  UPGRADE_CATALOG,
  getDisplayUnlockedUpgradeTiers,
  UPGRADE_DISPLAY_COUNT,
  type UpgradeDef,
} from '../../../application/catalogs.js';
import { getPlanetDisplayName } from '../../../application/solarSystems.js';
import { getMaxBuyCount } from '../../upgradeList/upgradeList.js';
import { getUpgradeCardState, type UpgradeCardState } from '../../components/upgradeCard.js';
import { t } from '../../../application/strings.js';

export type UpgradeCardItem = {
  state: UpgradeCardState;
  def: UpgradeDef;
  planetsForSelect: { id: string; name: string }[];
  choosePlanet: boolean;
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

    return defsToShow.map((def) => {
      const maxCount = getMaxBuyCount(def.id);
      const state = getUpgradeCardState(def, player, settings, hasFreeSlot, maxCount);
      const planetList = state.needsSlot ? planetsWithSlot : player.planets;
      const planetsForSelect = planetList.map((p) => {
        const idx = player.planets.findIndex((pl) => pl.id === p.id);
        return { id: p.id, name: getPlanetDisplayName(p.name, idx >= 0 ? idx : 0) };
      });
      return { state, def, planetsForSelect, choosePlanet };
    });
  });

  const emptyText = t('emptyUpgradesText');

  return { cards, emptyText };
}
