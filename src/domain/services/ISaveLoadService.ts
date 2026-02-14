import type { GameSession } from '../aggregates/GameSession.js';

/** Port for persistence: save and load game state (implemented in infrastructure). */
export interface ISaveLoadService {
  save(session: GameSession): Promise<void>;
  load(): Promise<GameSession | null>;
}
