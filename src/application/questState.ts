import { QUEST_STORAGE_KEY } from './catalogs.js';

export type QuestType =
  | 'coins'
  | 'production'
  | 'upgrade'
  | 'astronauts'
  | 'prestige_today'
  | 'combo_tier'
  | 'events_triggered'
  | 'tier1_set'
  | 'mega_combo'
  | 'discover_new_system_planet'
  | 'survive_negative_events';

export type Quest = {
  type: QuestType;
  target: number;
  targetId?: string;
  reward: number;
  description: string;
  /** Optional one-line intro shown with the quest (from questFlavor). */
  storyHook?: string;
};

export type QuestState = {
  quest: Quest | null;
  /** When the current quest was first completed (for 5-min claim window). Cleared on claim or new quest. */
  completedAt?: number;
};

export function loadQuestState(): QuestState {
  if (typeof localStorage === 'undefined') return { quest: null };
  try {
    const raw = localStorage.getItem(QUEST_STORAGE_KEY);
    if (!raw) return { quest: null };
    const data = JSON.parse(raw) as QuestState;
    const quest = data.quest ?? null;
    const completedAt = typeof data.completedAt === 'number' ? data.completedAt : undefined;
    return quest ? { quest, ...(completedAt !== undefined ? { completedAt } : {}) } : { quest: null };
  } catch {
    return { quest: null };
  }
}

export function saveQuestState(state: QuestState): void {
  if (typeof localStorage !== 'undefined') {
    const toSave: QuestState = { quest: state.quest };
    if (typeof state.completedAt === 'number') toSave.completedAt = state.completedAt;
    localStorage.setItem(QUEST_STORAGE_KEY, JSON.stringify(toSave));
  }
}
