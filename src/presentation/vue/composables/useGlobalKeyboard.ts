import { onMounted, onUnmounted } from 'vue';
import { getSettings } from '../../../application/gameState.js';
import { useAppUIStore } from '../stores/appUI.js';
import {
  handleMineClick,
  closeResetConfirmModal,
  closePrestigeConfirmModal,
  closePrestigeRewardsModal,
  closeSettings,
} from '../../../application/handlers.js';
import { closePlanetDetail, PLANET_DETAIL_OVERLAY_ID, PLANET_DETAIL_OPEN_CLASS } from '../../planetDetail.js';
import { closeUpgradeChoosePlanetModal } from '../../upgradeChoosePlanetModal.js';
import { closeExpeditionModal } from '../../expeditionModal.js';
import { isIntroOverlayOpen, dismissIntroModal } from '../../introModal.js';
import { getOpenOverlayElement, closeOverlay } from '../../components/overlay.js';
import {
  closeSectionRulesModal,
  closeInfoModal,
  closeAchievementsModal,
  isAnyModalOpen,
  SECTION_RULES_OVERLAY_CLASS,
  ACHIEVEMENTS_OVERLAY_ID,
  ACHIEVEMENTS_OVERLAY_OPEN_CLASS,
} from '../../mount/mountModals.js';

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

/**
 * Global keyboard: Escape (close modals), Tab (focus trap in overlay), Space (mine), F3 (debug panel).
 * Call from App.vue onMounted. Uses appUI store for mineZoneActive, mineZoneHintDismissed, debugOpen.
 */
export function useGlobalKeyboard(): void {
  function onKeydown(e: KeyboardEvent): void {
    const appUI = useAppUIStore();
    if (e.key === 'F3') {
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
      if (document.getElementById('reset-confirm-overlay')?.classList.contains('reset-confirm-overlay--open'))
        closeResetConfirmModal();
      else if (document.getElementById('prestige-confirm-overlay')?.classList.contains('prestige-confirm-overlay--open'))
        closePrestigeConfirmModal();
      else if (document.getElementById('prestige-rewards-overlay')?.classList.contains('prestige-rewards-overlay--open'))
        closePrestigeRewardsModal();
      else if (isIntroOverlayOpen()) dismissIntroModal();
      else if (document.getElementById('section-rules-overlay')?.classList.contains(SECTION_RULES_OVERLAY_CLASS))
        closeSectionRulesModal();
      else if (document.getElementById('info-overlay')?.classList.contains('info-overlay--open')) closeInfoModal();
      else if (document.getElementById(ACHIEVEMENTS_OVERLAY_ID)?.classList.contains(ACHIEVEMENTS_OVERLAY_OPEN_CLASS))
        closeAchievementsModal();
      else if (document.getElementById(EVENTS_HINT_OVERLAY_ID)?.classList.contains(EVENTS_HINT_OPEN_CLASS))
        closeEventsHintModal();
      else if (document.getElementById(CHART_HELP_OVERLAY_ID)?.classList.contains(CHART_HELP_OPEN_CLASS))
        closeChartHelpModal();
      else if (document.getElementById(PLANET_DETAIL_OVERLAY_ID)?.classList.contains(PLANET_DETAIL_OPEN_CLASS))
        closePlanetDetail();
      else if (
        document.getElementById('upgrade-choose-planet-overlay')?.classList.contains('upgrade-choose-planet-overlay--open')
      )
        closeUpgradeChoosePlanetModal();
      else if (
        document.getElementById('expedition-modal-overlay')?.classList.contains('expedition-modal-overlay--open')
      )
        closeExpeditionModal();
      else if (document.getElementById('settings-overlay')?.classList.contains('settings-overlay--open')) closeSettings();
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
