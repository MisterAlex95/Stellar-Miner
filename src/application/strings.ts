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

/** Update all elements with data-i18n attribute. Call on mount and when language changes. */
export function applyTranslations(): void {
  if (typeof document === 'undefined') return;
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key && key in stringsEn) el.textContent = t(key as keyof typeof stringsEn);
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (key && key in stringsEn) el.title = t(key as keyof typeof stringsEn);
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-aria-label]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria-label');
    if (key && key in stringsEn) el.setAttribute('aria-label', t(key as keyof typeof stringsEn));
  });
  const tabTitleKeys: Record<string, keyof typeof stringsEn> = {
    mine: 'tabMine',
    dashboard: 'tabDashboard',
    empire: 'tabBase',
    research: 'tabResearch',
    upgrades: 'tabUpgrades',
    stats: 'tabStats',
  };
  document.querySelectorAll<HTMLElement>('.app-tab[data-tab]').forEach((btn) => {
    const tabId = btn.getAttribute('data-tab');
    const key = tabId ? tabTitleKeys[tabId] : null;
    if (key && key in stringsEn) btn.title = t(key);
  });
}
