import Decimal from 'break_infinity.js';
import { computed } from 'vue';
import { getSession, getSettings } from '../../../application/gameState.js';
import { formatNumber } from '../../../application/format.js';
import { getUnlockedBlocks } from '../../../application/progression.js';
import { PRESTIGE_COIN_THRESHOLD } from '../../../domain/constants.js';
import { useGameStateStore } from '../stores/gameState.js';

/** Reactive prestige progress for dashboard. Recomputes when store.coins updates. */
export function useDashboardPrestige() {
  const store = useGameStateStore();

  return computed(() => {
    store.coins; // reactive dependency
    const s = getSession();
    if (!s) return { show: false, value: '', threshold: '', pct: 0 };
    const player = s.player;
    const settings = getSettings();
    const unlocked = getUnlockedBlocks(s);
    const canPrestige = player.coins.gte(PRESTIGE_COIN_THRESHOLD);
    if (canPrestige || !unlocked.has('prestige')) return { show: false, value: '', threshold: '', pct: 0 };
    const thresholdNum = Number(PRESTIGE_COIN_THRESHOLD);
    const coinsNum = Math.min(Number(player.coins.value), thresholdNum);
    const pct = thresholdNum > 0 ? Math.min(100, (coinsNum / thresholdNum) * 100) : 0;
    return {
      show: true,
      value: formatNumber(player.coins.value, settings.compactNumbers),
      threshold: formatNumber(new Decimal(PRESTIGE_COIN_THRESHOLD), settings.compactNumbers),
      pct,
    };
  });
}
