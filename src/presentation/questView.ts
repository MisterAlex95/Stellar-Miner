import { getQuestState, setQuestState, getSettings } from '../application/gameState.js';
import { formatNumber } from '../application/format.js';
import { generateQuest, getQuestProgress, getQuestStreak, getQuestLastClaimAt } from '../application/quests.js';
import { saveQuestState } from '../application/questState.js';
import { QUEST_STREAK_WINDOW_MS, QUEST_STREAK_MAX, QUEST_STREAK_BONUS_PER_LEVEL } from '../application/catalogs.js';
import { t, tParam } from '../application/strings.js';
import type { QuestSnapshot } from './vue/stores/gameState.js';

function ensureQuest(): void {
  let questState = getQuestState();
  if (!questState.quest) {
    questState = { quest: generateQuest() };
    setQuestState(questState);
    saveQuestState(questState);
  }
}

/** Build quest section snapshot for Vue (no DOM). */
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
  };
}

