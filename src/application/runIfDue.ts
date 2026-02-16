/**
 * Runs a callback when interval has elapsed and condition is met. Use for throttled panel updates.
 */

export type ThrottledRunState = { lastMs: number };

/** Returns a function that runs the callback at most every intervalMs when condition() is true. */
export function createThrottledRun(intervalMs: number) {
  const state: ThrottledRunState = { lastMs: -1 };
  return (nowMs: number, condition: () => boolean, run: () => void): void => {
    const elapsed = state.lastMs < 0 ? intervalMs : nowMs - state.lastMs;
    if (condition() && elapsed >= intervalMs) {
      state.lastMs = nowMs;
      run();
    }
  };
}
