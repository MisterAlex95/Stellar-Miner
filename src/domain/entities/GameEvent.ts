import type { EventEffect } from '../value-objects/EventEffect.js';

/** Entity: random in-game event (e.g. meteor storm). */
export class GameEvent {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly effect: EventEffect
  ) {}
}
