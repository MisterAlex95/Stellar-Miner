import type { Player } from '../entities/Player.js';
import type { GameEvent } from '../entities/GameEvent.js';

/** Aggregate root: current game session. Holds player, active events, global state. */
export class GameSession {
  constructor(
    public readonly id: string,
    public readonly player: Player,
    public readonly activeEvents: GameEvent[] = []
  ) {}
}
