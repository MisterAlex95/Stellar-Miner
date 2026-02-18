import { computed } from 'vue';
import { getSession } from '../../application/gameState.js';
import { getUnlockedBlocks } from '../../application/progression.js';
import { getUnlockedResearch, RESEARCH_CATALOG } from '../../application/research.js';
import { t } from '../../application/strings.js';
import { PLANETS_PER_SOLAR_SYSTEM } from '../../application/solarSystems.js';
import { useGameStateStore } from '../stores/gameState.js';

/** Reactive empire pills for dashboard. Recomputes when store (planets, etc.) updates. */
export function useDashboardEmpire() {
  const store = useGameStateStore();

  return computed(() => {
    store.planets; // reactive dependency
    const s = getSession();
    if (!s) return [] as string[];
    const player = s.player;
    const unlocked = getUnlockedBlocks(s);
    if (!unlocked.has('planets') && !unlocked.has('crew')) return [];
    const planetCount = player.planets.length;
    const solarSystemsCount = Math.ceil(planetCount / PLANETS_PER_SOLAR_SYSTEM);
    const upgradeCount = player.upgrades.length;
    const researchUnlocked = getUnlockedResearch().length;
    const researchTotal = RESEARCH_CATALOG.length;
    const pills: string[] = [
      `${planetCount} ${t('planets')}`,
      ...(unlocked.has('crew') ? [`${player.astronautCount} ${t('crew')}`] : []),
      `${solarSystemsCount} ${t('dashboardSolarSystems')}`,
    ];
    if (unlocked.has('upgrades')) pills.push(`${upgradeCount} ${t('tabUpgrades')}`);
    if (unlocked.has('research')) pills.push(`${researchUnlocked}/${researchTotal} ${t('tabResearch')}`);
    return pills;
  });
}
