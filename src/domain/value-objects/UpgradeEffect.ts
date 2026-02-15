import { Decimal, toDecimal, type DecimalSource } from '../bigNumber.js';

/** Value object: effect of an upgrade (e.g. +1 coin/s). Immutable. Supports unbounded values (Decimal). */
export class UpgradeEffect {
  public readonly coinsPerSecond: Decimal;

  constructor(source: DecimalSource) {
    if (typeof source === 'number' && !Number.isFinite(source)) {
      throw new Error('UpgradeEffect.coinsPerSecond must be finite');
    }
    const value = toDecimal(source);
    if (value.lt(0)) {
      throw new Error('UpgradeEffect.coinsPerSecond must be non-negative');
    }
    this.coinsPerSecond = value;
  }
}
