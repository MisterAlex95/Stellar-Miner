/**
 * Event badge HTML for active events list in stats.
 */
import { escapeAttr } from './domUtils.js';

export function createEventBadgeHtml(eventName: string, secondsLeft: number, title: string): string {
  return `<span class="event-badge" title="${escapeAttr(title)}">${escapeAttr(eventName)} (${secondsLeft}s)</span>`;
}
