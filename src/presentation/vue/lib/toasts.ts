/**
 * Shared toast implementation. Pushes to Vue toast store; ToastContainer renders.
 */
import { pushToast } from '../toastStore.js';

export const TOAST_CONTAINER_ID = 'event-toasts';

export type ToastVariant =
  | 'achievement'
  | 'milestone'
  | 'negative'
  | 'event-positive'
  | 'offline'
  | 'super-lucky'
  | 'streak'
  | 'daily'
  | 'critical'
  | 'prestige-milestone'
  | '';

const DEFAULT_DURATION = 4000;

/**
 * Shows a toast via the Vue toast store. Variant maps to class event-toast--{variant}.
 */
export function showToast(
  message: string,
  variant: ToastVariant,
  options?: { duration?: number }
): void {
  pushToast(message, variant, options?.duration ?? DEFAULT_DURATION);
}
