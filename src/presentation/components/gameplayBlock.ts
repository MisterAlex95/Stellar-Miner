/**
 * Reusable gameplay block: section with collapsible header (title + toggle) and body.
 */
export interface GameplayBlockOptions {
  id: string;
  sectionClass: string;
  titleKey: string;
  dataBlock?: string;
  locked?: boolean;
  bodyHtml: string;
}

/**
 * Returns HTML for a section.gameplay-block with header (h2 + collapse toggle) and body.
 */
export function createGameplayBlock(options: GameplayBlockOptions): string {
  const { id, sectionClass, titleKey, dataBlock, locked = true, bodyHtml } = options;
  const lockClass = locked ? 'gameplay-block--locked' : 'gameplay-block--unlocked';
  const dataBlockAttr = dataBlock != null ? ` data-block="${dataBlock}"` : '';
  return `
<section class="gameplay-block ${lockClass} ${sectionClass}" id="${id}"${dataBlockAttr}>
  <div class="gameplay-block-header">
    <h2 data-i18n="${titleKey}"></h2>
    <button type="button" class="gameplay-block-toggle" aria-expanded="true" aria-label="Collapse" title="Collapse"><span class="gameplay-block-toggle-icon" aria-hidden="true">▼</span></button>
  </div>
  <div class="gameplay-block-body">
${bodyHtml}
  </div>
</section>`;
}
