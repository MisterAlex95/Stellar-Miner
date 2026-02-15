/**
 * Shared DOM helpers for safe attribute and HTML string building.
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
