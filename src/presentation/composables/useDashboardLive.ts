import { computed } from 'vue';
import { getSession } from '../../application/gameState.js';
import { getActiveEventInstances, getNextEventAt, getExpeditionEndsAt } from '../../application/gameState.js';
import { getCatalogEventName } from '../../application/i18nCatalogs.js';
import { t, tParam } from '../../application/strings.js';
import { getUnlockedBlocks } from '../../application/progression.js';
import { isResearchInProgress } from '../../application/research.js';
import { useGameStateStore } from '../stores/gameState.js';

export interface DashboardLiveEvent {
  name: string;
  secondsLeft: number;
  title: string;
  modifier: 'positive' | 'negative';
  mult: number;
}

export interface DashboardLiveData {
  events: DashboardLiveEvent[];
  expeditionRemaining: number | null;
  nextEventIn: number | null;
  showResearch: boolean;
}

/** Reactive live section (events, expedition, next event, research) for dashboard. Returns structured data for Vue templates. */
export function useDashboardLive() {
  const store = useGameStateStore();

  return computed<DashboardLiveData>(() => {
    store.coins;
    store.runStats;
    const s = getSession();
    if (!s) return { events: [], expeditionRemaining: null, nextEventIn: null, showResearch: false };
    const now = Date.now();
    const unlocked = getUnlockedBlocks(s);
    const activeEvents = getActiveEventInstances().filter((a) => a.endsAt > now);
    const expeditionEndsAt = getExpeditionEndsAt();
    const expeditionActive = expeditionEndsAt != null && expeditionEndsAt > now;
    const nextEventAt = getNextEventAt();
    const eventsUnlocked = getUnlockedBlocks(s).has('events');

    const events: DashboardLiveEvent[] = activeEvents.map((a) => ({
      name: getCatalogEventName(a.event.id),
      secondsLeft: Math.ceil((a.endsAt - now) / 1000),
      title: tParam('eventBadgeTitle', { name: getCatalogEventName(a.event.id), mult: String(a.event.effect.multiplier) }),
      modifier: a.event.effect.multiplier >= 1 ? 'positive' : 'negative',
      mult: a.event.effect.multiplier,
    }));

    const expeditionRemaining =
      expeditionActive && expeditionEndsAt != null ? Math.ceil((expeditionEndsAt - now) / 1000) : null;
    const nextEventIn =
      eventsUnlocked && activeEvents.length === 0 && nextEventAt > now ? Math.ceil((nextEventAt - now) / 1000) : null;
    const showResearch = isResearchInProgress() && unlocked.has('research');

    return { events, expeditionRemaining, nextEventIn, showResearch };
  });
}
