import { onMounted, onUnmounted } from 'vue';
import { getSettings } from '../../application/gameState.js';
import { useAppUIStore } from '../stores/appUI.js';
import {
  handleMineClick,
  closeResetConfirmModal,
  closePrestigeConfirmModal,
  closeSettings,
} from '../../application/handlers.js';
import { closePlanetDetail, PLANET_DETAIL_OVERLAY_ID, PLANET_DETAIL_OPEN_CLASS } from '../modals/planetDetail.js';
import { closeUpgradeChoosePlanetModal } from '../modals/upgradeChoosePlanet.js';
import { closeExpeditionModal } from '../modals/expedition.js';
import { closeEventChoiceModal } from '../modals/eventChoice.js';
import { isIntroOverlayOpen, dismissIntroModal } from '../modals/intro.js';
import { useOverlay } from './useOverlay.js';

const { getOpenOverlayElement, closeOverlay } = useOverlay();
import {
  closeSectionRulesModal,
  closeInfoModal,
  closeAchievementsModal,
  isAnyModalOpen,
  SECTION_RULES_OVERLAY_CLASS,
  ACHIEVEMENTS_OVERLAY_ID,
  ACHIEVEMENTS_OVERLAY_OPEN_CLASS,
} from '../modals/mount.js';

const EVENTS_HINT_OVERLAY_ID = 'events-hint-overlay';
const EVENTS_HINT_OPEN_CLASS = 'events-hint-overlay--open';
const CHART_HELP_OVERLAY_ID = 'chart-help-overlay';
const CHART_HELP_OPEN_CLASS = 'chart-help-overlay--open';

function closeEventsHintModal(): void {
  closeOverlay(EVENTS_HINT_OVERLAY_ID, EVENTS_HINT_OPEN_CLASS);
}

function closeChartHelpModal(): void {
  closeOverlay(CHART_HELP_OVERLAY_ID, CHART_HELP_OPEN_CLASS);
}

const OVERLAY_CLOSERS: Record<string, () => void> = {
  'reset-confirm-overlay': closeResetConfirmModal,
  'prestige-confirm-overlay': closePrestigeConfirmModal,
  'intro-overlay': dismissIntroModal,
  'section-rules-overlay': closeSectionRulesModal,
  'info-overlay': closeInfoModal,
  [ACHIEVEMENTS_OVERLAY_ID]: closeAchievementsModal,
  [EVENTS_HINT_OVERLAY_ID]: closeEventsHintModal,
  [CHART_HELP_OVERLAY_ID]: closeChartHelpModal,
  [PLANET_DETAIL_OVERLAY_ID]: closePlanetDetail,
  'upgrade-choose-planet-overlay': closeUpgradeChoosePlanetModal,
  'expedition-modal-overlay': closeExpeditionModal,
  'event-choice-modal-overlay': closeEventChoiceModal,
  'settings-overlay': closeSettings,
};

/**
 * Global keyboard: Escape (close modals), Tab (focus trap in overlay), Space (mine), F3 (debug panel).
 * Call from App.vue onMounted. Uses appUI store for mineZoneActive, mineZoneHintDismissed, debugOpen.
 */
export function useGlobalKeyboard(): void {
  function onKeydown(e: KeyboardEvent): void {
    const appUI = useAppUIStore();
    if (e.key === 'F3' && import.meta.env.DEV) {
      e.preventDefault();
      appUI.toggleDebug();
      return;
    }
    if (e.key === 'Tab') {
      const overlayEl = getOpenOverlayElement();
      if (overlayEl) {
        const focusable = overlayEl.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const list = Array.from(focusable).filter((el) => el.offsetParent !== null);
        if (list.length > 0) {
          const i = list.indexOf(document.activeElement as HTMLElement);
          if (e.shiftKey) {
            if (i <= 0) {
              e.preventDefault();
              list[list.length - 1]?.focus();
            }
          } else {
            if (i === -1 || i >= list.length - 1) {
              e.preventDefault();
              list[0]?.focus();
            }
          }
        }
      }
      return;
    }
    if (e.key === 'Escape') {
      if (isIntroOverlayOpen()) {
        dismissIntroModal();
        return;
      }
      const top = appUI.peekOverlay();
      if (top && OVERLAY_CLOSERS[top]) {
        OVERLAY_CLOSERS[top]();
      }
      return;
    }
    if (e.code === 'Space') {
      if (isAnyModalOpen()) {
        e.preventDefault();
        return;
      }
      const target = e.target as HTMLElement;
      if (target?.closest?.('input, select, textarea, [role="dialog"]')) return;
      e.preventDefault();
      appUI.setMineZoneActive(true);
      if (!appUI.mineZoneHintDismissed) appUI.dismissMineHint();
      const allowRepeat = getSettings().spaceKeyRepeat;
      if (!e.repeat || allowRepeat) handleMineClick();
    }
  }

  function onKeyup(e: KeyboardEvent): void {
    if (e.code === 'Space') useAppUIStore().setMineZoneActive(false);
  }

  onMounted(() => {
    document.addEventListener('keydown', onKeydown);
    document.addEventListener('keyup', onKeyup);
  });
  onUnmounted(() => {
    document.removeEventListener('keydown', onKeydown);
    document.removeEventListener('keyup', onKeyup);
  });
}
