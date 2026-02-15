/**
 * Reusable modal overlay: overlay div + inner dialog div with role and optional aria attributes.
 */
export interface ModalOverlayOptions {
  overlayId: string;
  overlayClass: string;
  dialogClass: string;
  role?: 'dialog' | 'alertdialog';
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  bodyHtml: string;
}

/**
 * Returns HTML for an overlay containing a modal dialog. bodyHtml is the full content inside the dialog div.
 */
export function createModalOverlay(options: ModalOverlayOptions): string {
  const {
    overlayId,
    overlayClass,
    dialogClass,
    role = 'dialog',
    ariaLabelledBy,
    ariaDescribedBy,
    bodyHtml,
  } = options;
  const labelledBy = ariaLabelledBy ? ` aria-labelledby="${ariaLabelledBy}"` : '';
  const describedBy = ariaDescribedBy ? ` aria-describedby="${ariaDescribedBy}"` : '';
  return `
    <div class="${overlayClass}" id="${overlayId}" aria-hidden="true">
      <div class="${dialogClass}" role="${role}"${labelledBy}${describedBy}>
${bodyHtml}
      </div>
    </div>`;
}
