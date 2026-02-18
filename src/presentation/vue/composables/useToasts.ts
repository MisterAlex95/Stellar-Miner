/**
 * Composable for toasts. Re-exports from lib for Vue usage; non-Vue code keeps importing from lib/toasts.js.
 */
import { showToast as show, TOAST_CONTAINER_ID as CONTAINER_ID } from '../lib/toasts.js';

export function useToasts() {
  return {
    showToast: show,
    TOAST_CONTAINER_ID: CONTAINER_ID,
  };
}
