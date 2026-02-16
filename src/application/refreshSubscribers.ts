/**
 * Wires observable stores, refresh signal, and event bus to UI updates.
 * Single place that knows which views need refreshing when state changes.
 */

import { sessionStore, settingsStore } from './gameState.js';
import { subscribeRefresh, notifyRefresh } from './refreshSignal.js';
import { subscribe } from './eventBus.js';

export type RefreshViewsFn = () => void;
export type ApplySettingsFn = () => void;

const STATE_CHANGE_EVENTS = [
  'upgrade_purchased',
  'prestige',
  'quest_claimed',
  'planet_bought',
  'astronaut_hired',
] as const;

/** Subscribe to session changes and refresh signal. Call from game init. */
export function wireRefreshSubscribers(refreshViews: RefreshViewsFn): void {
  sessionStore.subscribe(() => refreshViews());
  subscribeRefresh(refreshViews);
}

/** Subscribe to domain events so UI refreshes when handlers emit. Safety net for event-driven flows. */
export function wireEventBusToRefresh(): void {
  for (const kind of STATE_CHANGE_EVENTS) {
    subscribe(kind, () => notifyRefresh());
  }
}

/** Subscribe to settings changes for theme, layout, etc. Call from mount. */
export function wireSettingsSubscribers(applySettings: ApplySettingsFn): void {
  settingsStore.subscribe(() => applySettings());
}
