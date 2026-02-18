/**
 * Presentation bootstrap: theme, translations, settings wiring, intro, tabs, tooltips.
 * Replaces mount.ts. All event bindings live in Vue.
 */
import { getSettings } from '../application/gameState.js';
import { applyTranslations } from '../application/strings.js';
import { updateLastSavedIndicator, applySettingsToUI } from '../application/handlers.js';
import { subscribe } from '../application/eventBus.js';
import { bindIntroModal, updateProgressionVisibility } from './introModal.js';
import { initTooltips } from './tooltip.js';
import { wireSettingsSubscribers } from '../application/refreshSubscribers.js';
import { APP_VERSION, hasNewUpdate } from '../application/version.js';
import { getChangelog } from '../application/changelog.js';
import { buildChangelogHtml } from './components/changelog.js';
import { getPinia } from './vue/piniaInstance.js';
import { useAppUIStore } from './vue/stores/appUI.js';
import {
  switchTab,
  applyLayout,
  getInitialTab,
  replaceTabState,
} from './mount/mountTabs.js';
import { bindUpgradeChoosePlanetModal } from './upgradeChoosePlanetModal.js';

function applyThemeAndMotion(): void {
  const s = getSettings();
  const root = document.documentElement;
  root.setAttribute('data-theme', s.theme);
  root.setAttribute('data-reduced-motion', s.reducedMotion ? 'true' : 'false');
}

export function renderChangelogList(container: HTMLElement): void {
  container.innerHTML = buildChangelogHtml(getChangelog());
}

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

  bindIntroModal();
  updateProgressionVisibility();

  const initialTab = getInitialTab();
  replaceTabState(initialTab);
  switchTab(initialTab);
  applyLayout();

  initTooltips();

  updateVersionAndChangelogUI();
}
