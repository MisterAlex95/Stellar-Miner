/**
 * Presentation init: theme, translations, settings wiring, tabs.
 * UI is Vue-driven; this wires app events and initial state. Called from game.ts after Vue mount.
 */
import { updateLastSavedIndicator, applySettingsToUI } from '../application/handlers.js';
import { subscribe } from '../application/eventBus.js';
import { updateProgressionVisibility } from './introModal.js';
import { wireSettingsSubscribers } from '../application/refreshSubscribers.js';
import { APP_VERSION, hasNewUpdate } from '../application/version.js';
import { getPinia } from './piniaInstance.js';
import { useAppUIStore } from './stores/appUI.js';
import {
  switchTab,
  getInitialTab,
  replaceTabState,
} from './mountTabs.js';
import { useBootstrap } from './composables/useBootstrap.js';

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

  const bootstrap = useBootstrap();
  bootstrap.applyAll();

  subscribe('save_success', () => updateLastSavedIndicator());

  wireSettingsSubscribers(() => {
    bootstrap.applyAll();
    applySettingsToUI();
  });

  updateProgressionVisibility();

  const initialTab = getInitialTab();
  replaceTabState(initialTab);
  switchTab(initialTab);
  bootstrap.applyLayout();

  updateVersionAndChangelogUI();
}
