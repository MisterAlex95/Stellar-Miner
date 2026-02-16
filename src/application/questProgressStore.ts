/**
 * Observable store for quest progress. Updated when state that affects quest changes;
 * quest view subscribes and re-renders reactively.
 */
import { createObservableStore } from './observableStore.js';
import { getQuestProgress } from './quests.js';

export type QuestProgressSnapshot = ReturnType<typeof getQuestProgress>;

export const questProgressStore = createObservableStore<QuestProgressSnapshot>(null);

/** Call when session, production, or quest state may have changed. */
export function updateQuestProgressStore(): void {
  questProgressStore.set(getQuestProgress());
}
