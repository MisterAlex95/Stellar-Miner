/**
 * Shared overlay open/close behavior: add/remove open class, aria-hidden, optional focus and onOpen callback.
 * Use with overlays created via createModalOverlay or any div that uses a --open modifier class.
 */

export interface OverlaySpec {
  id: string;
  openClass: string;
}

/** All overlays that can be opened (intro, settings, info, confirm dialogs). Used for focus trap and isAnyModalOpen. */
export const OVERLAYS: OverlaySpec[] = [
  { id: 'intro-overlay', openClass: 'intro-overlay--open' },
  { id: 'settings-overlay', openClass: 'settings-overlay--open' },
  { id: 'info-overlay', openClass: 'info-overlay--open' },
  { id: 'reset-confirm-overlay', openClass: 'reset-confirm-overlay--open' },
  { id: 'prestige-confirm-overlay', openClass: 'prestige-confirm-overlay--open' },
  { id: 'prestige-rewards-overlay', openClass: 'prestige-rewards-overlay--open' },
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
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;
  overlay.classList.add(openClass);
  overlay.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => {
    options?.onOpen?.();
    if (options?.focusId) document.getElementById(options.focusId)?.focus();
  });
}

/**
 * Closes an overlay: removes openClass and sets aria-hidden="true".
 */
export function closeOverlay(overlayId: string, openClass: string): void {
  const overlay = document.getElementById(overlayId);
  if (overlay) {
    overlay.classList.remove(openClass);
    overlay.setAttribute('aria-hidden', 'true');
  }
}

/**
 * Returns true if the given overlay has its open class.
 */
export function isOverlayOpen(overlayId: string, openClass: string): boolean {
  const overlay = document.getElementById(overlayId);
  return overlay?.classList.contains(openClass) ?? false;
}

/**
 * Returns the first overlay element that is currently open, or null.
 * Use for focus trap (Tab) and to detect if any modal is open.
 */
export function getOpenOverlayElement(): HTMLElement | null {
  for (const { id, openClass } of OVERLAYS) {
    if (isOverlayOpen(id, openClass)) return document.getElementById(id);
  }
  return null;
}
