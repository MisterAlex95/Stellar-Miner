import { getQuestState, setQuestState, getSettings } from '../application/gameState.js';
import { formatNumber } from '../application/format.js';
import { generateQuest, getQuestProgress, getQuestStreak, getQuestLastClaimAt } from '../application/quests.js';
import { saveQuestState } from '../application/questState.js';
import { QUEST_STREAK_WINDOW_MS, QUEST_STREAK_MAX, QUEST_STREAK_BONUS_PER_LEVEL } from '../application/catalogs.js';
import { t, tParam } from '../application/strings.js';
import { updateTooltipForButton } from './components/buttonTooltip.js';

export function renderQuestSection(): void {
  const container = document.getElementById('quest-section');
  const progressEl = document.getElementById('quest-progress');
  const claimBtn = document.getElementById('quest-claim');
  if (!container) return;

  let questState = getQuestState();
  if (!questState.quest) {
    questState = { quest: generateQuest() };
    setQuestState(questState);
    saveQuestState(questState);
  }

  const q = questState.quest;
  const p = getQuestProgress();
  if (!q || !p) return;

  const settings = getSettings();
  container.classList.toggle('quest-section--complete', p.done);
  const progressBar = document.getElementById('quest-progress-bar');
  if (progressBar) {
    const currentNum = typeof p.current === 'number' ? p.current : p.current.toNumber();
    const pct = p.target > 0 ? Math.min(100, (currentNum / p.target) * 100) : 0;
    progressBar.style.width = `${pct}%`;
    progressBar.setAttribute('aria-valuenow', String(Math.round(pct)));
  }
  if (progressEl) {
    progressEl.textContent = p.done
      ? `${q.description} ✓`
      : `${q.description}: ${formatNumber(p.current, false)} / ${formatNumber(p.target, false)}`;
  }
  if (claimBtn) {
    const streak = getQuestStreak();
    const nextBonus = streak < QUEST_STREAK_MAX ? ` (streak +${Math.round(QUEST_STREAK_BONUS_PER_LEVEL * 100)}%)` : '';
    claimBtn.textContent = p.done ? tParam('claimRewardFormat', { reward: formatNumber(Math.floor(q.reward), settings.compactNumbers) }) + nextBonus : t('claim');
    const tooltipText = p.done ? tParam('claimRewardFormat', { reward: formatNumber(Math.floor(q.reward), settings.compactNumbers) }) + ' reward' : t('completeQuestToClaim');
    updateTooltipForButton(claimBtn, tooltipText);
    claimBtn.toggleAttribute('disabled', !p.done);
  }
  const streakHint = document.getElementById('quest-streak-hint');
  if (streakHint) {
    const streak = getQuestStreak();
    const lastClaim = getQuestLastClaimAt();
    const withinWindow = Date.now() - lastClaim <= QUEST_STREAK_WINDOW_MS;
    if (streak > 0 && withinWindow) streakHint.textContent = tParam('questStreakKeep', { n: streak });
    else if (streak > 0) streakHint.textContent = t('streakExpired');
    else streakHint.textContent = '';
    streakHint.style.display = streak > 0 ? 'block' : 'none';
  }
  const questSummaryEl = document.getElementById('quest-section-summary');
  if (questSummaryEl) {
    questSummaryEl.textContent = p.done ? 'Claim!' : `${typeof p.current === 'number' ? p.current : p.current.toNumber()}/${p.target}`;
  }
}
