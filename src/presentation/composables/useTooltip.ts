/**
 * Global hover tooltip: single floating tooltip for .btn-tooltip-wrap and .crew-capacity-segment.
 * Uses document-level delegation so it works for both Vue and legacy DOM (e.g. upgrade cards).
 */
import { ref, onMounted, onUnmounted } from 'vue';

const SHOW_DELAY_MS = 400;
const HIDE_DELAY_MS = 100;
const SYNC_INTERVAL_MS = 150;
const PADDING = 8;

export const tooltipVisible = ref(false);
export const tooltipText = ref('');
export const tooltipAnchor = ref<Element | null>(null);

let showTimeout: ReturnType<typeof setTimeout> | null = null;
let hideTimeout: ReturnType<typeof setTimeout> | null = null;
let syncInterval: ReturnType<typeof setInterval> | null = null;
let currentWrap: Element | null = null;

export function computeTooltipPosition(
  tooltipRect: DOMRect,
  anchorRect: DOMRect
): { left: number; top: number; showBelow: boolean } {
  let left = anchorRect.left + anchorRect.width / 2 - tooltipRect.width / 2;
  let top = anchorRect.top - tooltipRect.height - PADDING;
  const showBelow = top < PADDING;
  if (showBelow) top = anchorRect.bottom + PADDING;
  if (left < PADDING) left = PADDING;
  if (left + tooltipRect.width > window.innerWidth - PADDING) {
    left = window.innerWidth - tooltipRect.width - PADDING;
  }
  return { left, top, showBelow };
}

function clearShowTimeout(): void {
  if (showTimeout) {
    clearTimeout(showTimeout);
    showTimeout = null;
  }
}

function clearHideTimeout(): void {
  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
}

function clearSyncInterval(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

function show(wrap: Element): void {
  const text = wrap.getAttribute('title')?.trim();
  if (!text) return;
  currentWrap = wrap;
  tooltipText.value = text;
  tooltipAnchor.value = wrap;
  tooltipVisible.value = true;
}

function hide(): void {
  clearSyncInterval();
  tooltipVisible.value = false;
  tooltipText.value = '';
  tooltipAnchor.value = null;
  currentWrap = null;
}

function scheduleShow(wrap: Element): void {
  clearHideTimeout();
  if (currentWrap === wrap) return;
  currentWrap = wrap;
  clearShowTimeout();
  showTimeout = setTimeout(() => {
    showTimeout = null;
    show(wrap);
  }, SHOW_DELAY_MS);
}

function scheduleHide(): void {
  clearShowTimeout();
  currentWrap = null;
  clearHideTimeout();
  hideTimeout = setTimeout(() => {
    hideTimeout = null;
    hide();
  }, HIDE_DELAY_MS);
}

function getTooltipTarget(el: Element | null): Element | null {
  if (!el) return null;
  const wrap = el.closest('.btn-tooltip-wrap');
  if (wrap && (wrap.getAttribute('title')?.trim() ?? '')) return wrap;
  const segment = el.closest('.crew-capacity-segment');
  if (segment && (segment.getAttribute('title')?.trim() ?? '')) return segment;
  return null;
}

function handleOver(e: MouseEvent): void {
  const target = getTooltipTarget(e.target as Element);
  if (!target) return;
  scheduleShow(target);
}

function handleOut(e: MouseEvent): void {
  const target = getTooltipTarget(e.target as Element);
  const related = getTooltipTarget(e.relatedTarget as Element);
  if (target && related === target) return;
  scheduleHide();
}

function syncContent(): void {
  if (!currentWrap) return;
  const text = currentWrap.getAttribute('title')?.trim() ?? '';
  if (!text) {
    hide();
    return;
  }
  if (text !== tooltipText.value) tooltipText.value = text;
}

/** Call from GlobalTooltip when it has the tooltip ref; runs sync interval while visible. */
export function startSyncInterval(): void {
  clearSyncInterval();
  syncInterval = setInterval(syncContent, SYNC_INTERVAL_MS);
}

export function stopSyncInterval(): void {
  clearSyncInterval();
}

export function useTooltip(): void {
  onMounted(() => {
    document.addEventListener('mouseover', handleOver, true);
    document.addEventListener('mouseout', handleOut, true);
  });

  onUnmounted(() => {
    document.removeEventListener('mouseover', handleOver, true);
    document.removeEventListener('mouseout', handleOut, true);
    clearShowTimeout();
    clearHideTimeout();
    clearSyncInterval();
    hide();
  });
}
