import { onMounted, onUnmounted } from 'vue';
import { t, type StringKey } from '../../../application/strings.js';
import { useOverlay } from './useOverlay.js';

const { openOverlay } = useOverlay();

const CHART_HELP_OVERLAY_ID = 'chart-help-overlay';
const CHART_HELP_OPEN_CLASS = 'chart-help-overlay--open';

/** Document click delegation: open chart help modal when clicking .statistics-chart-help. */
export function useChartHelpTrigger(): void {
  function onDocumentClick(e: MouseEvent): void {
    const help = (e.target as Element)?.closest?.('.statistics-chart-help');
    if (!help || !(help instanceof HTMLElement)) return;
    const titleKey = help.getAttribute('data-chart-title');
    const descKey = help.getAttribute('data-chart-desc');
    if (!titleKey || !descKey) return;
    const titleEl = document.getElementById('chart-help-modal-title');
    const bodyEl = document.getElementById('chart-help-modal-body');
    if (titleEl) titleEl.textContent = t(titleKey as StringKey);
    if (bodyEl) bodyEl.textContent = t(descKey as StringKey);
    openOverlay(CHART_HELP_OVERLAY_ID, CHART_HELP_OPEN_CLASS, { focusId: 'chart-help-close' });
  }

  onMounted(() => {
    document.addEventListener('click', onDocumentClick);
  });
  onUnmounted(() => {
    document.removeEventListener('click', onDocumentClick);
  });
}
