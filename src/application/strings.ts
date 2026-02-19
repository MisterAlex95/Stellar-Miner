/**
 * Centralized UI strings for i18n. Use t(key) in presentation layer.
 * Language from settings (en | fr).
 */
import { getSettings } from './gameState.js';
import { stringsEn } from './strings/en.js';
import { stringsFr } from './strings/fr.js';

export type { StringKey } from './strings/en.js';

const translations: Record<'en' | 'fr', Record<keyof typeof stringsEn, string>> = {
  en: stringsEn,
  fr: stringsFr,
};

export function t(key: keyof typeof stringsEn): string {
  const lang = getSettings().language ?? 'en';
  const bundle = translations[lang] ?? translations.en;
  return bundle[key] ?? stringsEn[key] ?? key;
}

/** Replace {{key}} placeholders in the translation for key. */
export function tParam(key: keyof typeof stringsEn, params: Record<string, string | number>): string {
  let s = t(key);
  for (const [k, v] of Object.entries(params)) {
    s = s.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
  }
  return s;
}

/** For backward compatibility: same keys as stringsEn. */
export const strings = stringsEn as Record<string, string>;
