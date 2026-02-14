import type { GameEvent } from '../entities/GameEvent.js';
import { createEventTriggered } from '../events/EventTriggered.js';

/** Domain service: trigger and manage random events. */
export class EventService {
  triggerEvent(gameEvent: GameEvent): ReturnType<typeof createEventTriggered> {
    return createEventTriggered(gameEvent.id, gameEvent.name);
  }
}
