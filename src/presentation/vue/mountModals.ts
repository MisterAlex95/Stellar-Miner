/**
 * Modal open/close handlers. Used by Vue components and useGlobalKeyboard.
 */
import { openOverlay, closeOverlay, getOpenOverlayElement } from './lib/overlay.js';
import { markUpdateSeen } from '../../application/version.js';
import { getPinia } from './piniaInstance.js';
import { useAppUIStore } from './stores/appUI.js';

export const SECTION_RULES_OVERLAY_CLASS = 'section-rules-overlay--open';
export const ACHIEVEMENTS_OVERLAY_ID = 'achievements-overlay';
export const ACHIEVEMENTS_OVERLAY_OPEN_CLASS = 'achievements-overlay--open';

export function openInfoModal(updateVersionAndChangelogUI: () => void): void {
  openOverlay('info-overlay', 'info-overlay--open', {
    focusId: 'info-close',
    onOpen: () => {
      markUpdateSeen();
      updateVersionAndChangelogUI();
    },
  });
}

export function closeInfoModal(): void {
  closeOverlay('info-overlay', 'info-overlay--open');
}

export function openAchievementsModal(): void {
  openOverlay(ACHIEVEMENTS_OVERLAY_ID, ACHIEVEMENTS_OVERLAY_OPEN_CLASS, {
    focusId: 'achievements-modal-close',
  });
}

export function closeAchievementsModal(): void {
  closeOverlay(ACHIEVEMENTS_OVERLAY_ID, ACHIEVEMENTS_OVERLAY_OPEN_CLASS);
}

export function openSectionRulesModal(rulesKey: string, titleKey: string): void {
  const pinia = getPinia();
  if (pinia) useAppUIStore(pinia).setSectionRules({ titleKey, rulesKey });
  openOverlay('section-rules-overlay', SECTION_RULES_OVERLAY_CLASS, { focusId: 'section-rules-close' });
}

export function closeSectionRulesModal(): void {
  const pinia = getPinia();
  if (pinia) useAppUIStore(pinia).setSectionRules(null);
  closeOverlay('section-rules-overlay', SECTION_RULES_OVERLAY_CLASS);
}

export function isAnyModalOpen(): boolean {
  return getOpenOverlayElement() !== null;
}
