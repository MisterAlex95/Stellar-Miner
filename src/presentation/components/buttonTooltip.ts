/**
 * Reusable button + tooltip wrap: build HTML and update tooltip on existing buttons.
 */
import { escapeAttr } from './domUtils.js';

/**
 * Returns HTML for a span.btn-tooltip-wrap wrapping the given button HTML.
 * Tooltip on hover is disabled; title is not set.
 */
export function buttonWithTooltipHtml(title: string, buttonHtml: string, wrapClass?: string): string {
  const cls = 'btn-tooltip-wrap' + (wrapClass ? ' ' + wrapClass : '');
  return `<span class="${escapeAttr(cls)}">${buttonHtml}</span>`;
}

/**
 * No-op: hover tooltips are disabled. Kept for API compatibility.
 */
export function updateTooltipForButton(_button: HTMLElement, _title: string): void {}
