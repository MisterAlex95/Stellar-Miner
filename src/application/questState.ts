import { QUEST_STORAGE_KEY } from './catalogs.js';

export type QuestType = 'coins' | 'production' | 'upgrade' | 'astronauts' | 'prestige_today' | 'combo_tier' | 'events_triggered' | 'tier1_set';

export type Quest = {
  type: QuestType;
  target: number;
  targetId?: string;
  reward: number;
  description: string;
};

export type QuestState = { quest: Quest | null };

export function loadQuestState(): QuestState {
  if (typeof localStorage === 'undefined') return { quest: null };
  try {
    const raw = localStorage.getItem(QUEST_STORAGE_KEY);
    if (!raw) return { quest: null };
    const data = JSON.parse(raw) as QuestState;
    return data.quest ? { quest: data.quest } : { quest: null };
  } catch {
    return { quest: null };
  }
}

export function saveQuestState(state: QuestState): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(QUEST_STORAGE_KEY, JSON.stringify(state));
  }
}
