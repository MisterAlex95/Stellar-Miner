/**
 * Event choice modal: open/close. State is in appUI store; Vue (EventChoiceModal.vue) renders choices.
 */
import { closeOverlay } from '../lib/overlay.js';
import { getPresentationPort } from '../../application/uiBridge.js';
import { setPendingChoiceEvent } from '../../application/gameState.js';

const OVERLAY_ID = 'event-choice-modal-overlay';
const OPEN_CLASS = 'event-choice-modal-overlay--open';

export function closeEventChoiceModal(): void {
  setPendingChoiceEvent(null);
  getPresentationPort().clearEventChoice();
  document.body.style.overflow = '';
  closeOverlay(OVERLAY_ID, OPEN_CLASS);
}
