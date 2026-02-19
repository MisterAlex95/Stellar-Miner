import { getQuestStreak } from './quests.js';
import { claimQuest } from './quests.js';
import { emit } from './eventBus.js';
import { notifyRefresh } from './refreshSignal.js';
import { getPresentationPort } from './uiBridge.js';
import { checkAchievements } from './achievements.js';
import { checkCodexUnlocks } from './codex.js';
import { tryShowNarrator } from './narrator.js';

export function handleClaimQuest(): void {
  const claimed = claimQuest({ notifyRefresh });
  if (claimed) {
    const streak = getQuestStreak();
    if (streak === 1) tryShowNarrator('first_quest');
    emit('quest_claimed', { streak });
    getPresentationPort().addQuestClaimedAnimation();
    checkAchievements();
    checkCodexUnlocks();
  }
}
