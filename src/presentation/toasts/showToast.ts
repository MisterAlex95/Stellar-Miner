/**
 * Low-level showToast. Pushes to Vue toast store; ToastContainer renders.
 */
import { pushToast } from './bridge.js';
import type { ToastVariant } from './store.js';

export const TOAST_CONTAINER_ID = 'event-toasts';

export type { ToastVariant } from './store.js';

const DEFAULT_DURATION = 4000;

/**
 * Shows a toast via the Vue toast store. Variant maps to class event-toast--{variant}.
 */
export function showToast(message: string, variant: ToastVariant, options?: { duration?: number }): void {
  pushToast(message, variant, options?.duration ?? DEFAULT_DURATION);
}
