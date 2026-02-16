/**
 * Wraps a function to catch errors and show a toast. Use for handlers and refresh callbacks.
 */

import { t, type StringKey } from './strings.js';
import { showToast } from '../presentation/components/toasts.js';

export function withErrorBoundary<T extends (...args: unknown[]) => unknown>(fn: T): T {
  return ((...args: unknown[]) => {
    try {
      return fn(...args);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[Stellar Miner]', err);
      showToast(t('errorOccurred' as StringKey), 'negative', { duration: 5000 });
      throw err;
    }
  }) as T;
}
