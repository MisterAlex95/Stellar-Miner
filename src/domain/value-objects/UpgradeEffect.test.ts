import { describe, it, expect } from 'vitest';
import { UpgradeEffect } from './UpgradeEffect.js';

describe('UpgradeEffect', () => {
  it('creates with finite coinsPerSecond', () => {
    const e = new UpgradeEffect(5);
    expect(e.coinsPerSecond).toBe(5);
  });

  it('allows zero', () => {
    const e = new UpgradeEffect(0);
    expect(e.coinsPerSecond).toBe(0);
  });

  it('throws when coinsPerSecond is not finite', () => {
    expect(() => new UpgradeEffect(Number.NaN)).toThrow(
      'UpgradeEffect.coinsPerSecond must be finite'
    );
    expect(() => new UpgradeEffect(Infinity)).toThrow(
      'UpgradeEffect.coinsPerSecond must be finite'
    );
  });
});
