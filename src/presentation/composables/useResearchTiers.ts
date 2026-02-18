import { computed, type Ref } from 'vue';
import { getSession, getSettings } from '../../application/gameState.js';
import {
  getResearchTiers,
  getUnlockedResearch,
  getResearchData,
  getRecommendedResearchNodeIds,
} from '../../application/research.js';
import { getResearchNodeDisplayData, type ResearchNodeDisplayData } from '../../application/researchDisplay.js';
import { useGameStateStore } from '../stores/gameState.js';

export type ResearchTierViewModel = {
  tier: number;
  isCollapsed: boolean;
  rows: ResearchNodeDisplayData[][];
};

/** Reactive research tiers with display data for each node. Depends on store and collapsed state. */
export function useResearchTiers(collapsedTiers: Ref<Set<number>>) {
  const store = useGameStateStore();

  const tiers = computed((): ResearchTierViewModel[] => {
    store.coins;
    store.runStats;
    const session = getSession();
    const settings = getSettings();
    const unlocked = getUnlockedResearch();
    const tierGroups = getResearchTiers();
    const scientistCount = session?.player.crewByRole?.scientist ?? 0;
    const researchData = getResearchData();
    const recommendedIds = getRecommendedResearchNodeIds(scientistCount);
    const collapsed = collapsedTiers.value;

    return tierGroups.map(({ tier, rows }) => ({
      tier,
      isCollapsed: collapsed.has(tier),
      rows: rows.map((rowNodes) =>
        rowNodes.map((node) =>
          getResearchNodeDisplayData(
            node,
            session,
            settings.compactNumbers,
            unlocked,
            scientistCount,
            researchData,
            recommendedIds
          )
        )
      ),
    }));
  });

  return { tiers };
}
