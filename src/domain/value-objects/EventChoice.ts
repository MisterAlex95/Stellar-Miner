import type { EventEffect } from './EventEffect.js';

/** Value object: one option in a choice event (e.g. "Risk 1 astronaut for x2 for 30s"). */
export class EventChoice {
  constructor(
    public readonly id: string,
    /** i18n key for the button label. */
    public readonly labelKey: string,
    public readonly effect: EventEffect,
    /** If set, choosing this option spends that many astronauts (from free pool). */
    public readonly costAstronauts: number = 0,
    /** If set, choosing this option spends that many coins. */
    public readonly costCoins: number = 0,
    /** If set, choosing this option sacrifices that many installed modules (no refund). */
    public readonly costUpgrade: number = 0,
    /** If set in (0, 1], a random roll is made; below this = success (apply effect), else apply failureEffect or nothing. */
    public readonly successChance: number | undefined = undefined,
    /** Applied when successChance is set and the roll fails. If undefined, failure = no effect. */
    public readonly failureEffect: EventEffect | undefined = undefined
  ) {
    if (costAstronauts < 0 || costCoins < 0 || costUpgrade < 0)
      throw new Error('EventChoice costs must be non-negative');
    if (successChance != null && (successChance <= 0 || successChance > 1))
      throw new Error('EventChoice successChance must be in (0, 1]');
  }
}
