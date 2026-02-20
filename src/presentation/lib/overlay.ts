/**
 * Shared overlay open/close behavior: add/remove open class, aria-hidden, optional focus and onOpen callback.
 * Use with overlays created via createModalOverlay or any div that uses a --open modifier class.
 */
import { getElement } from './domUtils.js';
import { getPinia } from '../piniaInstance.js';
import { useAppUIStore } from '../stores/appUI.js';

export interface OverlaySpec {
  id: string;
  openClass: string;
}

/** All overlays that can be opened (intro, settings, info, section rules, confirm dialogs, events hint). Used for focus trap and isAnyModalOpen. */
export const OVERLAYS: OverlaySpec[] = [
  { id: 'intro-overlay', openClass: 'intro-overlay--open' },
  { id: 'settings-overlay', openClass: 'settings-overlay--open' },
  { id: 'info-overlay', openClass: 'info-overlay--open' },
  { id: 'section-rules-overlay', openClass: 'section-rules-overlay--open' },
  { id: 'reset-confirm-overlay', openClass: 'reset-confirm-overlay--open' },
  { id: 'prestige-confirm-overlay', openClass: 'prestige-confirm-overlay--open' },
  { id: 'events-hint-overlay', openClass: 'events-hint-overlay--open' },
  { id: 'chart-help-overlay', openClass: 'chart-help-overlay--open' },
  { id: 'planet-detail-overlay', openClass: 'planet-detail-overlay--open' },
  { id: 'upgrade-choose-planet-overlay', openClass: 'upgrade-choose-planet-overlay--open' },
  { id: 'expedition-modal-overlay', openClass: 'expedition-modal-overlay--open' },
  { id: 'event-choice-modal-overlay', openClass: 'event-choice-modal-overlay--open' },
];

export interface OpenOverlayOptions {
  focusId?: string;
  onOpen?: () => void;
}

/**
 * Opens an overlay: adds openClass, sets aria-hidden="false", then in rAF runs onOpen and focuses focusId.
 */
export function openOverlay(
  overlayId: string,
  openClass: string,
  options?: OpenOverlayOptions
): void {
  const overlay = getElement(overlayId);
  if (!overlay) return;
  overlay.classList.add(openClass);
  overlay.setAttribute('aria-hidden', 'false');
  const pinia = getPinia();
  if (pinia) useAppUIStore(pinia).pushOverlay(overlayId);
  requestAnimationFrame(() => {
    options?.onOpen?.();
    if (options?.focusId) getElement(options.focusId)?.focus();
  });
}

/**
 * Closes an overlay: removes openClass and sets aria-hidden="true".
 */
export function closeOverlay(overlayId: string, openClass: string): void {
  const overlay = getElement(overlayId);
  if (overlay) {
    overlay.classList.remove(openClass);
    overlay.setAttribute('aria-hidden', 'true');
  }
  const pinia = getPinia();
  if (pinia) useAppUIStore(pinia).popOverlay(overlayId);
}

/**
 * Returns true if the given overlay has its open class.
 */
export function isOverlayOpen(overlayId: string, openClass: string): boolean {
  const overlay = getElement(overlayId);
  return overlay?.classList.contains(openClass) ?? false;
}

/**
 * Returns the first overlay element that is currently open, or null.
 * Use for focus trap (Tab) and to detect if any modal is open.
 */
export function getOpenOverlayElement(): HTMLElement | null {
  for (const { id, openClass } of OVERLAYS) {
    if (isOverlayOpen(id, openClass)) return getElement(id);
  }
  return null;
}
