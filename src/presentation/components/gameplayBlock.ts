import { escapeAttr } from './domUtils.js';

/**
 * Reusable gameplay block: section with collapsible header (title + toggle) and body.
 */
export interface GameplayBlockOptions {
  id: string;
  sectionClass: string;
  titleKey: string;
  dataBlock?: string;
  locked?: boolean;
  /** If set, a "?" button is shown next to the title; clicking opens a modal with t(rulesKey) as body. */
  rulesKey?: string;
  bodyHtml: string;
}

/**
 * Returns HTML for a section.gameplay-block with header (h2 + rules "?" + collapse toggle) and body.
 */
export function createGameplayBlock(options: GameplayBlockOptions): string {
  const { id, sectionClass, titleKey, dataBlock, locked = true, rulesKey, bodyHtml } = options;
  const lockClass = locked ? 'gameplay-block--locked' : 'gameplay-block--unlocked';
  const dataBlockAttr = dataBlock != null ? ` data-block="${dataBlock}"` : '';
  const rulesBtn =
    rulesKey != null
      ? `<button type="button" class="gameplay-block-rules-btn" data-rules-key="${escapeAttr(rulesKey)}" data-title-key="${escapeAttr(titleKey)}" aria-label="Section rules">?</button>`
      : '';
  return `
<section class="gameplay-block ${lockClass} ${sectionClass}" id="${id}"${dataBlockAttr}>
  <div class="gameplay-block-header">
    <h2 data-i18n="${titleKey}"></h2>
    <span class="gameplay-block-summary" id="${id}-summary" aria-hidden="true"></span>
    <div class="gameplay-block-header-actions">
      ${rulesBtn}
      <button type="button" class="gameplay-block-toggle" aria-expanded="true" aria-label="Collapse"><span class="gameplay-block-toggle-icon" aria-hidden="true">▼</span></button>
    </div>
  </div>
  <div class="gameplay-block-body">
${bodyHtml}
  </div>
</section>`;
}
