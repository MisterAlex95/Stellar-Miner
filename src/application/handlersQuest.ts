import { getQuestStreak } from './quests.js';
import { claimQuest } from './quests.js';
import { emit } from './eventBus.js';
import { notifyRefresh } from './refreshSignal.js';
import { getPresentationPort } from './uiBridge.js';
import { checkAchievements } from './achievements.js';

export function handleClaimQuest(): void {
  const streak = getQuestStreak();
  const claimed = claimQuest({ notifyRefresh });
  if (claimed) {
    emit('quest_claimed', { streak });
    getPresentationPort().addQuestClaimedAnimation();
    checkAchievements();
  }
}
