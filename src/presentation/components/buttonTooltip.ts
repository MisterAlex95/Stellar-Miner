/**
 * Reusable button + tooltip wrap: build HTML and update tooltip on existing buttons.
 * The span gets the title so the global Vue tooltip can show it on hover (including when button is disabled).
 */
import { escapeAttr } from './domUtils.js';

/**
 * Returns HTML for a span.btn-tooltip-wrap wrapping the given button HTML.
 * Title is set on the wrap so the global tooltip shows on hover.
 */
export function buttonWithTooltipHtml(title: string, buttonHtml: string, wrapClass?: string): string {
  const cls = 'btn-tooltip-wrap' + (wrapClass ? ' ' + wrapClass : '');
  const titleAttr = title ? ` title="${escapeAttr(title)}"` : '';
  return `<span class="${escapeAttr(cls)}"${titleAttr}>${buttonHtml}</span>`;
}

/**
 * Updates the parent .btn-tooltip-wrap title so the global tooltip shows the new text on hover.
 */
export function updateTooltipForButton(button: HTMLElement, title: string): void {
  const wrap = button.closest('.btn-tooltip-wrap');
  if (wrap) wrap.setAttribute('title', title);
}
