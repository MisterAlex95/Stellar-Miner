import { ref, computed } from 'vue';
import { useGameStateStore } from '../stores/gameState.js';
import { getSession, getSettings } from '../../application/gameState.js';
import {
  computeStatisticsData,
  STAT_GROUP_UNLOCK,
  type StatisticsData,
} from '../../application/statisticsData.js';
import type { ChartRange } from '../../application/statsHistory.js';

const STATS_RANGE_STORAGE_KEY = 'stellar-miner-stats-range';

const defaultData: StatisticsData = {
  stats: {},
  groupVisible: Object.fromEntries(Object.keys(STAT_GROUP_UNLOCK).map((k) => [k, true])),
  eventsUnlocked: false,
};

export function useStatisticsData() {
  const store = useGameStateStore();
  const chartRange = ref<ChartRange>(loadChartRange());

  function loadChartRange(): ChartRange {
    if (typeof localStorage === 'undefined') return 'recent';
    const saved = localStorage.getItem(STATS_RANGE_STORAGE_KEY);
    return saved === 'recent' || saved === 'longTerm' ? saved : 'recent';
  }

  function setChartRange(range: ChartRange): void {
    chartRange.value = range;
    try {
      localStorage.setItem(STATS_RANGE_STORAGE_KEY, range);
    } catch {
      // ignore
    }
  }

  const data = computed<StatisticsData>(() => {
    void store.coins;
    void store.production;
    const session = getSession();
    const settings = getSettings();
    if (!session) return defaultData;
    return computeStatisticsData(session, settings, chartRange.value);
  });

  return { data, chartRange, setChartRange };
}
