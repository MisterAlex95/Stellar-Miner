/**
 * Centralized UI strings for i18n. Use t(key) in presentation and application layer.
 * Delegates to vue-i18n (see application/i18n.ts).
 */
import { i18n } from './i18n.js';
import { stringsEn } from './strings/en.js';

export type { StringKey } from './strings/en.js';

export function t(key: keyof typeof stringsEn): string {
  return i18n.global.t(key as string) as string;
}

/** Replace {key} placeholders (vue-i18n interpolation). */
export function tParam(key: keyof typeof stringsEn, params: Record<string, string | number>): string {
  return i18n.global.t(key as string, params as Record<string, unknown>) as string;
}

/** For backward compatibility: same keys as stringsEn. */
export const strings = stringsEn as Record<string, string>;
