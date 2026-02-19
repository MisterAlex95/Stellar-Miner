import { computed } from 'vue';
import { getSession } from '../../application/gameState.js';
import { formatNumber } from '../../application/format.js';
import { getQuestProgress } from '../../application/quests.js';
import { getUnlockedBlocks } from '../../application/progression.js';
import { getQuestState } from '../../application/gameState.js';
import { useGameStateStore } from '../stores/gameState.js';

/** Reactive quest card for dashboard. Recomputes when store updates. */
export function useDashboardQuestCard() {
  const store = useGameStateStore();

  return computed(() => {
    store.runStats; // reactive dependency
    const s = getSession();
    if (!s) return { show: false, value: '', target: '', desc: '', storyHook: '', pct: 0 };
    const unlocked = getUnlockedBlocks(s);
    if (!unlocked.has('quest')) return { show: false, value: '', target: '', desc: '', storyHook: '', pct: 0 };
    const questProgress = getQuestProgress();
    const questDone = questProgress?.done ?? false;
    if (!questProgress || questDone) return { show: false, value: '', target: '', desc: '', storyHook: '', pct: 0 };
    const pct = questProgress.target > 0 ? Math.min(100, (Number(questProgress.current) / questProgress.target) * 100) : 0;
    const questState = getQuestState();
    const questDesc = questState.quest?.description ?? '';
    const storyHook = questState.quest?.storyHook ?? '';
    return {
      show: true,
      value: formatNumber(questProgress.current, false),
      target: formatNumber(questProgress.target, false),
      desc: questDesc,
      storyHook,
      pct,
    };
  });
}
