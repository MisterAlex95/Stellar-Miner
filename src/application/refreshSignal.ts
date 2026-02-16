/**
 * Signal for UI refresh. Handlers emit when game state changes; subscribers run refresh logic.
 * Batches multiple rapid calls into one requestAnimationFrame to reduce DOM thrashing.
 */

export type Unsubscribe = () => void;

const listeners: Set<() => void> = new Set();
let rafId: number | null = null;

function runListeners(): void {
  rafId = null;
  for (const fn of listeners) fn();
}

export function subscribeRefresh(fn: () => void): Unsubscribe {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Schedules refresh for next frame. Multiple calls in same frame coalesce into one. */
export function notifyRefresh(): void {
  if (rafId != null) return;
  if (typeof requestAnimationFrame !== 'undefined') {
    rafId = requestAnimationFrame(runListeners);
  } else {
    runListeners();
  }
}
