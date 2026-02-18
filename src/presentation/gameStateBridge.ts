/**
 * Bridge: game loop updates view state here; Vue reads via Pinia store.
 * Delegates to useGameStateStore when Pinia is available.
 */
import { getPinia } from './piniaInstance.js';
import { useGameStateStore, type GameStateSnapshot, type PlanetViewItem } from './stores/gameState.js';
import type { HistoryPoint } from '../application/statsHistory.js';
import type { RunStats } from '../application/gameState.js';

export type { PlanetViewItem, GameStateSnapshot };

export interface GameStateBridge extends GameStateSnapshot {
  setActiveTab(tabId: string): void;
}

export type UpdateBridgePayload = GameStateSnapshot;

export function getGameStateBridge(): GameStateBridge {
  const pinia = getPinia();
  if (!pinia) throw new Error('Pinia not set; mountVueApp() must run first');
  return useGameStateStore(pinia);
}

export function updateGameStateBridge(payload: UpdateBridgePayload): void {
  const pinia = getPinia();
  if (!pinia) return;
  useGameStateStore(pinia).setSnapshot(payload);
}

/** Composable for Vue components (prefer useGameStateStore() from stores/gameState for Pinia DevTools). */
export function useGameState(): GameStateBridge {
  return getGameStateBridge();
}
