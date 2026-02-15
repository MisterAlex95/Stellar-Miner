import type { GameSession } from '../aggregates/GameSession.js';

/** Run stats (since last prestige) persisted with the session. */
export type RunStatsPayload = {
  runStartTime: number;
  runCoinsEarned: number;
  runQuestsClaimed: number;
  runEventsTriggered: number;
  runMaxComboMult: number;
};

/** Port for persistence: save and load game state (implemented in infrastructure). */
export interface ISaveLoadService {
  save(session: GameSession, runStats?: RunStatsPayload): Promise<void>;
  load(): Promise<{ session: GameSession; runStats?: RunStatsPayload } | null>;
}
