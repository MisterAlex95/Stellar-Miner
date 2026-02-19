/**
 * Bootstrap: theme and layout from settings.
 * Used by initPresentation and when settings change.
 */
import { getSettings } from '../../application/gameState.js';
import { getPinia } from '../piniaInstance.js';
import { useGameStateStore } from '../stores/gameState.js';
import { useAppUIStore } from '../stores/appUI.js';

export function applyThemeAndMotion(): void {
  const s = getSettings();
  const root = document.documentElement;
  root.setAttribute('data-theme', s.theme);
  root.setAttribute('data-reduced-motion', s.reducedMotion ? 'true' : 'false');
}

export function applyLayout(): void {
  const layout = getSettings().layout;
  const pinia = getPinia();
  if (pinia) {
    useGameStateStore(pinia).setLayout(layout);
    const app = useAppUIStore(pinia).appRoot;
    if (app) app.setAttribute('data-layout', layout);
  }
}

export function useBootstrap(): {
  applyThemeAndMotion: () => void;
  applyLayout: () => void;
  applyAll: () => void;
} {
  return {
    applyThemeAndMotion,
    applyLayout,
    applyAll() {
      applyThemeAndMotion();
      applyLayout();
    },
  };
}
