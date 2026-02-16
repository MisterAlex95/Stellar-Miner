import { getQuestStreak } from './quests.js';
import { claimQuest } from './quests.js';
import { emit } from './eventBus.js';
import { notifyRefresh } from './refreshSignal.js';
import { showFloatingReward, showQuestStreakToast } from '../presentation/toasts.js';
import { checkAchievements } from './achievements.js';

export function handleClaimQuest(): void {
  const streak = getQuestStreak();
  const claimed = claimQuest({
    notifyRefresh,
    showFloatingReward,
    showQuestStreakToast,
    checkAchievements,
  });
  if (claimed) emit('quest_claimed', { streak });
  if (claimed) {
    const q = document.getElementById('quest-section');
    if (q) {
      q.classList.add('quest-section--claimed');
      setTimeout(() => q.classList.remove('quest-section--claimed'), 600);
    }
  }
}
