/**
 * Presentation bootstrap: theme, translations, settings wiring, tabs.
 * Replaces mount.ts. All event bindings live in Vue (tooltips via GlobalTooltip).
 */
import { updateLastSavedIndicator, applySettingsToUI } from '../../application/handlers.js';
import { subscribe } from '../../application/eventBus.js';
import { updateProgressionVisibility } from '../modals/introModal.js';
import { wireSettingsSubscribers } from '../../application/refreshSubscribers.js';
import { APP_VERSION, hasNewUpdate } from '../../application/version.js';
import { getPinia } from '../vue/piniaInstance.js';
import { useAppUIStore } from '../vue/stores/appUI.js';
import {
  switchTab,
  applyLayout,
  getInitialTab,
  replaceTabState,
} from '../mount/mountTabs.js';
import { bindUpgradeChoosePlanetModal } from '../modals/upgradeChoosePlanetModal.js';
import { applyThemeAndMotion, applyTranslations } from '../vue/composables/useBootstrap.js';

/** Updates appUI store so InfoModal and HeaderActions show version and update badge (Vue-driven). */
export function updateVersionAndChangelogUI(): void {
  const pinia = getPinia();
  if (pinia) useAppUIStore(pinia).setInfoContent(APP_VERSION, hasNewUpdate());
}

export function initPresentation(): void {
  const app = document.getElementById('app');
  const legacyRoot = document.getElementById('legacy-root');
  const legacyPanels = document.getElementById('legacy-panels');
  if (!app || !legacyRoot || !legacyPanels) return;
  applyThemeAndMotion();
  applyTranslations();

  subscribe('save_success', () => updateLastSavedIndicator());

  wireSettingsSubscribers(() => {
    applyThemeAndMotion();
    applyLayout();
    applySettingsToUI();
    applyTranslations();
  });

  bindUpgradeChoosePlanetModal();

  updateProgressionVisibility();

  const initialTab = getInitialTab();
  replaceTabState(initialTab);
  switchTab(initialTab);
  applyLayout();

  updateVersionAndChangelogUI();
}
