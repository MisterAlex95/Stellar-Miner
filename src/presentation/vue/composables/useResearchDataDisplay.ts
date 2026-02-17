import { computed } from 'vue';
import { getResearchData } from '../../../application/research.js';
import { t } from '../../../application/strings.js';
import { useGameStateStore } from '../stores/gameState.js';

/** Reactive research data count for display (e.g. "Research data: 5"). */
export function useResearchDataDisplay() {
  const store = useGameStateStore();

  const researchData = computed(() => {
    store.runStats;
    return getResearchData();
  });

  const label = computed(() => `${t('researchDataLabel')}: ${researchData.value}`);

  return { researchData, label };
}
