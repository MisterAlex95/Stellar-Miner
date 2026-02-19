import type { EventEffect } from '../value-objects/EventEffect.js';

/** Entity: random in-game event (e.g. meteor storm). */
export class GameEvent {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly effect: EventEffect,
    /** Optional one-line story/lore shown in toast when story toasts are enabled. */
    public readonly flavor?: string
  ) {}
}
