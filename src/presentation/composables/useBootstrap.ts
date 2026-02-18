/**
 * Bootstrap: theme, translations, layout from settings.
 * Used by vue/initPresentation and can be called when settings change.
 */
import { getSettings } from '../../application/gameState.js';
import { applyTranslations as applyTranslationsFromStrings } from '../../application/strings.js';
import { applyLayout } from '../mountTabs.js';

export function applyThemeAndMotion(): void {
  const s = getSettings();
  const root = document.documentElement;
  root.setAttribute('data-theme', s.theme);
  root.setAttribute('data-reduced-motion', s.reducedMotion ? 'true' : 'false');
}

export function applyTranslations(): void {
  applyTranslationsFromStrings();
}

export function useBootstrap(): {
  applyThemeAndMotion: () => void;
  applyTranslations: () => void;
  applyLayout: () => void;
  applyAll: () => void;
} {
  return {
    applyThemeAndMotion,
    applyTranslations,
    applyLayout,
  applyAll() {
    applyThemeAndMotion();
    applyTranslationsFromStrings();
    applyLayout();
  },
  };
}
