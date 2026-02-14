/** Value object: effect of a random event (e.g. x2 production). Immutable. */
export class EventEffect {
  constructor(
    public readonly multiplier: number,
    public readonly durationMs: number
  ) {
    if (!Number.isFinite(multiplier) || !Number.isFinite(durationMs) || durationMs < 0) {
      throw new Error('EventEffect multiplier must be finite, durationMs non-negative');
    }
  }
}
