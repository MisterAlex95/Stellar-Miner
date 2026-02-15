/**
 * Custom tooltips so they show reliably on hover (including when the button inside is disabled).
 * Uses a single floating div and reads title from .btn-tooltip-wrap.
 */

const SHOW_DELAY_MS = 400;
const HIDE_DELAY_MS = 100;
const SYNC_INTERVAL_MS = 150;

let tooltipEl: HTMLElement | null = null;
let showTimeout: ReturnType<typeof setTimeout> | null = null;
let hideTimeout: ReturnType<typeof setTimeout> | null = null;
let syncInterval: ReturnType<typeof setInterval> | null = null;
let currentWrap: Element | null = null;

function getTooltipEl(): HTMLElement {
  if (tooltipEl) return tooltipEl;
  tooltipEl = document.createElement('div');
  tooltipEl.id = 'custom-tooltip';
  tooltipEl.setAttribute('role', 'tooltip');
  tooltipEl.setAttribute('aria-hidden', 'true');
  document.body.appendChild(tooltipEl);
  return tooltipEl;
}

function updatePosition(el: HTMLElement, wrap: Element): void {
  const rect = wrap.getBoundingClientRect();
  const tipRect = el.getBoundingClientRect();
  const padding = 8;
  let left = rect.left + rect.width / 2 - tipRect.width / 2;
  let top = rect.top - tipRect.height - padding;
  const showBelow = top < padding;
  if (showBelow) top = rect.bottom + padding;
  el.classList.toggle('custom-tooltip--below', showBelow);
  if (left < padding) left = padding;
  if (left + tipRect.width > window.innerWidth - padding) left = window.innerWidth - tipRect.width - padding;
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
}

function syncContent(): void {
  if (!currentWrap || !tooltipEl) return;
  const text = currentWrap.getAttribute('title')?.trim() ?? '';
  if (!text) {
    hide();
    return;
  }
  if (text !== tooltipEl.textContent) tooltipEl.textContent = text;
  updatePosition(tooltipEl, currentWrap);
}

function show(wrap: Element): void {
  const text = wrap.getAttribute('title')?.trim();
  if (!text) return;
  const el = getTooltipEl();
  el.textContent = text;
  el.setAttribute('aria-hidden', 'false');
  el.style.visibility = 'hidden';
  el.classList.add('custom-tooltip--visible');
  el.style.visibility = '';
  updatePosition(el, wrap);
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(syncContent, SYNC_INTERVAL_MS);
}

function hide(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  const el = tooltipEl;
  if (el) {
    el.classList.remove('custom-tooltip--visible', 'custom-tooltip--below');
    el.setAttribute('aria-hidden', 'true');
  }
  currentWrap = null;
}

function scheduleShow(wrap: Element): void {
  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
  if (currentWrap === wrap) return;
  currentWrap = wrap;
  if (showTimeout) clearTimeout(showTimeout);
  showTimeout = setTimeout(() => {
    showTimeout = null;
    show(wrap);
  }, SHOW_DELAY_MS);
}

function scheduleHide(): void {
  if (showTimeout) {
    clearTimeout(showTimeout);
    showTimeout = null;
  }
  currentWrap = null;
  hideTimeout = setTimeout(() => {
    hideTimeout = null;
    hide();
  }, HIDE_DELAY_MS);
}

function handleOver(e: MouseEvent): void {
  const wrap = (e.target as Element)?.closest?.('.btn-tooltip-wrap');
  if (!wrap) return;
  const text = wrap.getAttribute('title')?.trim();
  if (!text) return;
  scheduleShow(wrap);
}

function handleOut(e: MouseEvent): void {
  const wrap = (e.target as Element)?.closest?.('.btn-tooltip-wrap');
  if (wrap) {
    const related = e.relatedTarget as Node | null;
    if (related && wrap.contains(related)) return;
  }
  scheduleHide();
}

export function initTooltips(): void {
  getTooltipEl();
  document.body.addEventListener('mouseover', handleOver, true);
  document.body.addEventListener('mouseout', handleOut, true);
}
