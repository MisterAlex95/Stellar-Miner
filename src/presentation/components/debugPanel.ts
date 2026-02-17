/**
 * Debug panel HTML (F3 menu).
 */
export function buildDebugPanelHtml(): string {
  return `
  <div class="debug-panel-header">
    <span data-i18n="debug">Debug</span>
    <button type="button" class="debug-close" id="debug-close" data-i18n-aria-label="closeDebug">×</button>
  </div>
  <div class="debug-panel-body">
    <div class="debug-section" id="debug-stats"></div>
    <div class="debug-section">
      <div class="debug-actions">
        <button type="button" class="debug-btn" data-debug="coins-1k">+1K coins</button>
        <button type="button" class="debug-btn" data-debug="coins-50k">+50K coins</button>
        <button type="button" class="debug-btn" data-debug="trigger-event" data-i18n="debugTriggerEvent">Trigger event</button>
        <button type="button" class="debug-btn" data-debug="clear-events" data-i18n="debugClearEvents">Clear events</button>
        <button type="button" class="debug-btn" data-debug="add-planet" data-i18n="debugAddPlanet">+1 planet</button>
      </div>
    </div>
  </div>
  <p class="debug-hint" data-i18n="debugF3Hint">F3 to toggle</p>`;
}
