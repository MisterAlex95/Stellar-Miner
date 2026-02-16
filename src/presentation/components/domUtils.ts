/**
 * Shared DOM utilities: element lookup, safe attribute/HTML escaping.
 */

function escapeAmpLt(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

export function escapeAttr(s: string): string {
  return escapeAmpLt(s).replace(/"/g, '&quot;');
}

export function escapeHtml(s: string): string {
  return escapeAmpLt(s).replace(/>/g, '&gt;');
}

/** Get element by id. Returns null if not found. */
export function getElement(id: string): HTMLElement | null {
  return document.getElementById(id);
}
