/**
 * Empty state message (e.g. "No slots available").
 */
import { escapeHtml } from './domUtils.js';

export function emptyStateHtml(message: string, cssClass: string = 'empty-state'): string {
  return `<p class="${escapeHtml(cssClass)}">${escapeHtml(message)}</p>`;
}
