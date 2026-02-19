/**
 * Vue I18n instance for app-wide translations.
 * Used by app.use(i18n) in presentation and by t()/tParam() in application.
 * Initial locale is 'en'; call syncI18nLocale() after settings load to apply saved language.
 */
import { createI18n } from 'vue-i18n';
import { getSettings } from './gameState.js';
import { stringsEn } from './strings/en.js';
import { stringsFr } from './strings/fr.js';

export type { StringKey } from './strings/en.js';

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: stringsEn as Record<string, string>,
    fr: stringsFr as Record<string, string>,
  },
});

/** Call after settings load or when user changes language. */
export function syncI18nLocale(): void {
  const lang = getSettings().language ?? 'en';
  const next = lang === 'fr' ? 'fr' : 'en';
  if (i18n.global.locale.value !== next) {
    i18n.global.locale.value = next;
  }
}
