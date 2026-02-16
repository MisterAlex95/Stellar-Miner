/**
 * Signal for UI refresh. Handlers emit when game state changes; subscribers run refresh logic.
 * Decouples application layer from presentation—handlers don't need to know which views to update.
 */

export type Unsubscribe = () => void;

const listeners: Set<() => void> = new Set();

export function subscribeRefresh(fn: () => void): Unsubscribe {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notifyRefresh(): void {
  for (const fn of listeners) fn();
}
