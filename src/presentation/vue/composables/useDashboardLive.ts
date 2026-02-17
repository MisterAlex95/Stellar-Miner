import { computed } from 'vue';
import { getSession } from '../../../application/gameState.js';
import { getActiveEventInstances, getNextEventAt, getExpeditionEndsAt } from '../../../application/gameState.js';
import { getCatalogEventName } from '../../../application/i18nCatalogs.js';
import { createEventBadgeHtml } from '../../components/eventBadge.js';
import { t, tParam } from '../../../application/strings.js';
import { getUnlockedBlocks } from '../../../application/progression.js';
import { isResearchInProgress } from '../../../application/research.js';
import { useGameStateStore } from '../stores/gameState.js';

/** Reactive live section (events, expedition, next event, research) for dashboard. */
export function useDashboardLive() {
  const store = useGameStateStore();

  return computed(() => {
    store.coins;
    store.runStats; // reactive dependencies
    const s = getSession();
    if (!s) return '';
    const now = Date.now();
    const unlocked = getUnlockedBlocks(s);
    const activeEvents = getActiveEventInstances().filter((a) => a.endsAt > now);
    const expeditionEndsAt = getExpeditionEndsAt();
    const expeditionActive = expeditionEndsAt != null && expeditionEndsAt > now;
    const nextEventAt = getNextEventAt();
    const eventsUnlocked = getUnlockedBlocks(s).has('events');
    let html = '';
    if (activeEvents.length > 0) {
      html += '<div class="dashboard-events">' + activeEvents
        .map((a) => {
          const name = getCatalogEventName(a.event.id);
          const secondsLeft = Math.ceil((a.endsAt - now) / 1000);
          const title = tParam('eventBadgeTitle', { name, mult: String(a.event.effect.multiplier) });
          const modifier = a.event.effect.multiplier >= 1 ? 'positive' : 'negative';
          return createEventBadgeHtml(name, secondsLeft, title, { modifier, mult: a.event.effect.multiplier });
        })
        .join('') + '</div>';
    }
    if (expeditionActive && expeditionEndsAt != null) {
      const remaining = Math.ceil((expeditionEndsAt - now) / 1000);
      html += `<span class="dashboard-live-pill dashboard-live-pill--expedition">${t('dashboardExpeditionInProgress')} — ${remaining}s</span>`;
    }
    if (eventsUnlocked && activeEvents.length === 0 && nextEventAt > now) {
      const secs = Math.ceil((nextEventAt - now) / 1000);
      html += `<span class="dashboard-live-pill dashboard-live-pill--next">${tParam('nextEventInFormat', { time: `${secs}s` })}</span>`;
    }
    if (isResearchInProgress() && unlocked.has('research')) {
      html += `<button type="button" class="dashboard-live-pill dashboard-live-pill--research" data-goto="research">${t('researching')}</button>`;
    }
    return html;
  });
}
