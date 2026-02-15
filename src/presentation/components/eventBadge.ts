/**
 * Event badge HTML for active events list in stats.
 * modifier: 'positive' | 'negative' for styling; mult shown in badge.
 */
import { escapeAttr } from './domUtils.js';

export function createEventBadgeHtml(
  eventName: string,
  secondsLeft: number,
  title: string,
  options: { modifier: 'positive' | 'negative'; mult: number }
): string {
  const { modifier, mult } = options;
  const multStr = mult >= 1 ? `×${mult}` : `×${mult}`;
  const cls = `event-badge event-badge--${modifier}`;
  return `<span class="${cls}" title="${escapeAttr(title)}" data-mult="${escapeAttr(String(mult))}"><span class="event-badge__name">${escapeAttr(eventName)}</span> <span class="event-badge__mult">${escapeAttr(multStr)}</span> <span class="event-badge__time">— ${secondsLeft}s</span></span>`;
}
