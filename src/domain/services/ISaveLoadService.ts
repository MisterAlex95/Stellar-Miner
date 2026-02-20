import type { GameSession } from '../aggregates/GameSession.js';

/** Run stats (since last prestige) persisted with the session. */
export type RunStatsPayload = {
  runStartTime: number;
  runCoinsEarned: number;
  runQuestsClaimed: number;
  runEventsTriggered: number;
  runMaxComboMult: number;
  runNewSystemDiscoveries?: number;
  runConsecutiveNegativeSurvived?: number;
  runMaxConsecutiveNegativeSurvived?: number;
};

/** Port for persistence: save and load game state (implemented in infrastructure). */
export interface ISaveLoadService {
  save(session: GameSession, runStats?: RunStatsPayload, options?: { discoveredEventIds?: string[]; codexUnlocks?: Array<{ id: string; at: number }>; narratorShown?: string[]; expedition?: unknown }): Promise<void>;
  load(): Promise<{ session: GameSession; runStats?: RunStatsPayload; discoveredEventIds?: string[]; codexUnlocks?: Array<{ id: string; at: number }>; narratorShown?: string[]; expedition?: unknown } | null>;
}
