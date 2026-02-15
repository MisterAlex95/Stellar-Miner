/**
 * Reusable button + tooltip wrap: build HTML and update tooltip on existing buttons.
 */
import { escapeAttr } from './domUtils.js';

/**
 * Returns HTML for a span.btn-tooltip-wrap wrapping the given button HTML.
 * Use when building markup that needs a title tooltip on a button.
 */
export function buttonWithTooltipHtml(title: string, buttonHtml: string, wrapClass?: string): string {
  const cls = 'btn-tooltip-wrap' + (wrapClass ? ' ' + wrapClass : '');
  return `<span class="${escapeAttr(cls)}" title="${escapeAttr(title)}">${buttonHtml}</span>`;
}

/**
 * Sets the tooltip for a button: if the button is inside a .btn-tooltip-wrap, updates that span's title; otherwise the button's title.
 */
export function updateTooltipForButton(button: HTMLElement, title: string): void {
  const wrap =
    button.parentElement?.classList.contains('btn-tooltip-wrap') ? button.parentElement : null;
  if (wrap) wrap.setAttribute('title', title);
  else button.setAttribute('title', title);
}
