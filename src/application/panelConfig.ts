/**
 * Centralized panel IDs and DOM element IDs. Single source of truth for tabs and lazy refresh.
 */

export const PANEL_IDS = [
  'mine',
  'dashboard',
  'empire',
  'research',
  'upgrades',
  'stats',
  'archive',
] as const;

export type PanelId = (typeof PANEL_IDS)[number];

export function getPanelElementId(panelId: PanelId): string {
  return `panel-${panelId}`;
}

export function isPanelId(id: string): id is PanelId {
  return (PANEL_IDS as readonly string[]).includes(id);
}
