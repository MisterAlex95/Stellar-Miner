/**
 * Presentation lib: shared DOM/utils used by Vue and modals. Re-exports for cleaner imports.
 */
export { escapeAttr, escapeHtml, getElement } from './domUtils.js';
export { createModalOverlay } from './modal.js';
export { emptyStateHtml } from './emptyState.js';
export { createStatisticsCard, createStatisticsCardWide, createStatisticsGroup } from './statisticsCard.js';
export { createEventBadgeHtml } from './eventBadge.js';
export { buttonWithTooltipHtml } from './buttonTooltip.js';
export { showToast, TOAST_CONTAINER_ID } from './toasts.js';
export { openOverlay, closeOverlay, isOverlayOpen, getOpenOverlayElement, OVERLAYS } from './overlay.js';
export { createLabelValueCard, createBadge } from './builders.js';
