/**
 * Quest section snapshot for the game state bridge. Moved from presentation/questView.
 */
import { getQuestState, setQuestState, getSettings } from './gameState.js';
import { formatNumber } from './format.js';
import { generateQuest, getQuestProgress, getQuestStreak, getQuestLastClaimAt } from './quests.js';
import { saveQuestState } from './questState.js';
import { QUEST_STREAK_WINDOW_MS, QUEST_STREAK_MAX, QUEST_STREAK_BONUS_PER_LEVEL } from './catalogs.js';
import { t, tParam } from './strings.js';

export type QuestSnapshot = {
  progressPct: number;
  progressText: string;
  claimLabel: string;
  claimDisabled: boolean;
  claimTitle: string;
  summary: string;
  streakHint: string;
  streakHintVisible: boolean;
  sectionComplete: boolean;
  /** End of 5-min claim window (timestamp). 0 when not in window. Used for "Claim within M:SS" countdown. */
  claimWindowEndMs: number;
};

function ensureQuest(): void {
  let questState = getQuestState();
  if (!questState.quest) {
    questState = { quest: generateQuest() };
    setQuestState(questState);
    saveQuestState(questState);
  }
}

/** Build quest section snapshot for Vue bridge (no DOM). */
export function getQuestSnapshot(): QuestSnapshot {
  ensureQuest();
  const q = getQuestState().quest;
  const p = getQuestProgress();
  const defaultSnapshot: QuestSnapshot = {
    progressPct: 0,
    progressText: '',
    claimLabel: t('claim'),
    claimDisabled: true,
    claimTitle: t('completeQuestToClaim'),
    summary: '',
    streakHint: '',
    streakHintVisible: false,
    sectionComplete: false,
    claimWindowEndMs: 0,
  };
  if (!q || !p) return defaultSnapshot;
  const settings = getSettings();
  const currentNum = typeof p.current === 'number' ? p.current : (p.current as { toNumber: () => number }).toNumber();
  const progressPct = p.target > 0 ? Math.min(100, (currentNum / p.target) * 100) : 0;
  const progressText = p.done
    ? `${q.description} ✓`
    : `${q.description}: ${formatNumber(p.current, false)} / ${formatNumber(p.target, false)}`;
  const streak = getQuestStreak();
  const nextBonus = streak < QUEST_STREAK_MAX ? ` (streak +${Math.round(QUEST_STREAK_BONUS_PER_LEVEL * 100)}%)` : '';
  const claimLabel = p.done ? tParam('claimRewardFormat', { reward: formatNumber(Math.floor(q.reward), settings.compactNumbers) }) + nextBonus : t('claim');
  const claimTitle = p.done ? tParam('claimRewardFormat', { reward: formatNumber(Math.floor(q.reward), settings.compactNumbers) }) + ' reward' : t('completeQuestToClaim');
  const compact = settings?.compactNumbers ?? true;
  const summary = p.done ? 'Claim!' : `${formatNumber(p.current, compact)} / ${formatNumber(p.target, compact)}`;
  const lastClaim = getQuestLastClaimAt();
  const withinWindow = Date.now() - lastClaim <= QUEST_STREAK_WINDOW_MS;
  const streakHint = streak > 0 && withinWindow ? tParam('questStreakKeep', { n: streak }) : streak > 0 ? t('streakExpired') : '';

  let claimWindowEndMs = 0;
  if (p.done) {
    let state = getQuestState();
    if (typeof state.completedAt !== 'number') {
      state = { ...state, completedAt: Date.now() };
      setQuestState(state);
      saveQuestState(state);
    }
    const end = state.completedAt! + QUEST_STREAK_WINDOW_MS;
    if (end > Date.now()) claimWindowEndMs = end;
  }

  return {
    progressPct,
    progressText,
    claimLabel,
    claimDisabled: !p.done,
    claimTitle,
    summary,
    streakHint,
    streakHintVisible: streak > 0,
    sectionComplete: p.done,
    claimWindowEndMs,
  };
}
