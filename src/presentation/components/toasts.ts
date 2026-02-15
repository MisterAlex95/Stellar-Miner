/**
 * Shared toast implementation: show a message in the event-toasts container with a variant and duration.
 */
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
 * Shows a toast in the container identified by TOAST_CONTAINER_ID.
 * Variant maps to class event-toast--{variant} (empty = base event-toast only).
 */
export function showToast(
  message: string,
  variant: ToastVariant,
  options?: { duration?: number }
): void {
  const container = document.getElementById(TOAST_CONTAINER_ID);
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'event-toast' + (variant ? ' event-toast--' + variant : '');
  el.setAttribute('role', 'status');
  el.textContent = message;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('event-toast--visible'));
  const duration = options?.duration ?? DEFAULT_DURATION;
  setTimeout(() => {
    el.classList.remove('event-toast--visible');
    setTimeout(() => el.remove(), 300);
  }, duration);
}
