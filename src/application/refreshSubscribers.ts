/**
 * Wires observable stores and refresh signal to UI updates.
 * Single place that knows which views need refreshing when state changes.
 */

import { sessionStore, settingsStore } from './gameState.js';
import { subscribeRefresh } from './refreshSignal.js';

export type RefreshViewsFn = () => void;
export type ApplySettingsFn = () => void;

/** Subscribe to session changes and refresh signal. Call from game init. */
export function wireRefreshSubscribers(refreshViews: RefreshViewsFn): void {
  sessionStore.subscribe(() => refreshViews());
  subscribeRefresh(refreshViews);
}

/** Subscribe to settings changes for theme, layout, etc. Call from mount. */
export function wireSettingsSubscribers(applySettings: ApplySettingsFn): void {
  settingsStore.subscribe(() => applySettings());
}
