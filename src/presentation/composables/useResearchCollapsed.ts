import { ref, watch } from 'vue';
import {
  loadCollapsedTiers,
  saveCollapsedTiers,
} from '../../application/research.js';

/** Reactive collapsed tier state for research panel, persisted to localStorage. */
export function useResearchCollapsed() {
  const collapsedTiers = ref(loadCollapsedTiers());

  watch(
    collapsedTiers,
    (val) => saveCollapsedTiers(val),
    { deep: true }
  );

  function toggleTier(tier: number): void {
    const set = new Set(collapsedTiers.value);
    if (set.has(tier)) set.delete(tier);
    else set.add(tier);
    collapsedTiers.value = set;
  }

  return { collapsedTiers, toggleTier };
}
