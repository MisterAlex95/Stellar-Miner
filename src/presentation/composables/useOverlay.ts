/**
 * Composable for overlay open/close. Re-exports from lib for Vue usage; non-Vue code keeps importing from lib/overlay.js.
 */
import {
  openOverlay as open,
  closeOverlay as close,
  getOpenOverlayElement as getOpenElement,
  isOverlayOpen as isOpen,
} from '../lib/overlay.js';

export function useOverlay() {
  return {
    openOverlay: open,
    closeOverlay: close,
    getOpenOverlayElement: getOpenElement,
    isOverlayOpen: isOpen,
  };
}
