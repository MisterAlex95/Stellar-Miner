/**
 * DOM access helpers. Use for consistent element lookup.
 */

/** Get element by id. Returns null if not found. */
export function getElement(id: string): HTMLElement | null {
  return document.getElementById(id);
}
