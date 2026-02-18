/**
 * Changelog list HTML builder for the "What's new" modal.
 */
import type { ChangelogEntry } from '../../application/changelog.js';
import { escapeHtml } from './domUtils.js';

export function buildChangelogHtml(entries: ChangelogEntry[]): string {
  if (entries.length === 0) return '<p class="changelog-empty">—</p>';
  return entries
    .map(
      (e, i) =>
        `<details class="changelog-entry" ${i === 0 ? 'open' : ''}>
          <summary class="changelog-entry-header">v${escapeHtml(e.version)} <span class="changelog-date">${escapeHtml(e.date)}</span></summary>
          <ul class="changelog-changes">${e.changes.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}</ul>
        </details>`
    )
    .join('');
}
