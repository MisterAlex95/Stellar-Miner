import type { EventChoice } from '../value-objects/EventChoice.js';

/** Entity: in-game event that presents player choices (e.g. risk astronaut for bonus). */
export class ChoiceEvent {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly choices: readonly EventChoice[],
    /** Optional one-line story shown when the event appears. */
    public readonly flavor?: string
  ) {
    if (choices.length === 0) throw new Error('ChoiceEvent must have at least one choice');
  }
}
