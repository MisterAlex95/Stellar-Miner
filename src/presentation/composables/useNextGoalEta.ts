import { computed } from 'vue';
import { tParam } from '../../application/strings.js';
import { getNextGoalEta } from '../lib/dashboardHelpers.js';
import { useGameStateStore } from '../stores/gameState.js';

/** Reactive next goal ETA for dashboard: "Next upgrade in ~X min" or "Next planet in ~Y min". */
export function useNextGoalEta() {
  const store = useGameStateStore();

  const nextGoalEta = computed(() => {
    store.coins;
    store.production;
    const eta = getNextGoalEta();
    if (!eta) return null;
    const minStr = eta.minutes === Infinity ? '…' : String(eta.minutes);
    return { text: tParam(eta.labelKey, { min: minStr }) };
  });

  return nextGoalEta;
}
