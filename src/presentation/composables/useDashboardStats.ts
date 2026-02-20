import { computed } from 'vue';
import { getSession, getSettings, getEventMultiplier } from '../../application/gameState.js';
import { formatNumber } from '../../application/format.js';
import { getResearchProductionMultiplier } from '../../application/research.js';
import { getSetBonusMultiplier } from '../../application/moduleSetBonuses.js';
import { t } from '../../application/strings.js';
import { useGameStateStore } from '../stores/gameState.js';

/** Reactive dashboard stats row: coins, rate, run summary. Each recomputes when store updates. */
export function useDashboardStats() {
  const store = useGameStateStore();

  const coins = computed(() => {
    store.coins; // reactive dependency so this recomputes when bridge updates
    const s = getSession();
    if (!s) return '';
    return formatNumber(s.player.coins.value, getSettings().compactNumbers);
  });

  const rate = computed(() => {
    store.production; // reactive dependency
    const s = getSession();
    if (!s) return '';
    const mult = getEventMultiplier() * getResearchProductionMultiplier() * getSetBonusMultiplier(s.player);
    const effective = s.player.effectiveProductionRate.mul(mult);
    return formatNumber(effective, getSettings().compactNumbers) + '/s';
  });

  const runSummary = computed(() => {
    const run = store.runStats;
    const compact = getSettings().compactNumbers;
    return `${formatNumber(run.runCoinsEarned, compact)} ⬡ · ${run.runQuestsClaimed} ${t('dashboardQuestsShort')} · ${run.runEventsTriggered} ${t('dashboardEventsShort')}`;
  });

  return { coins, rate, runSummary };
}
