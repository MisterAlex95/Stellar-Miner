import { describe, it, expect } from 'vitest';
import { EventEffect } from './EventEffect.js';

describe('EventEffect', () => {
  it('creates with finite multiplier and non-negative durationMs', () => {
    const e = new EventEffect(2, 5000);
    expect(e.multiplier).toBe(2);
    expect(e.durationMs).toBe(5000);
  });

  it('allows zero duration', () => {
    const e = new EventEffect(1, 0);
    expect(e.durationMs).toBe(0);
  });

  it('throws when multiplier is not finite', () => {
    expect(() => new EventEffect(Number.NaN, 1000)).toThrow(
      'EventEffect multiplier must be finite, durationMs non-negative'
    );
  });

  it('throws when durationMs is negative', () => {
    expect(() => new EventEffect(1, -100)).toThrow(
      'EventEffect multiplier must be finite, durationMs non-negative'
    );
  });
});
