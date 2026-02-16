/**
 * Tracks which tab panels have been rendered (hydrated). Use for lazy loading:
 * only render panel content when the user first switches to that tab.
 */

const hydratedPanels = new Set<string>();

export function markPanelHydrated(panelId: string): void {
  hydratedPanels.add(panelId);
}

export function isPanelHydrated(panelId: string): boolean {
  return hydratedPanels.has(panelId);
}

export function getHydratedPanels(): ReadonlySet<string> {
  return hydratedPanels;
}

/** Clear hydrated state. Call before DOM replace without reload (e.g. for future reset flows). */
export function resetPanelHydration(): void {
  hydratedPanels.clear();
}
