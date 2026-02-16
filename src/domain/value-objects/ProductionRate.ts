import { Decimal, toDecimal, type DecimalSource } from '../bigNumber.js';

/** Value object: coins per second production rate. Immutable. Supports unbounded values (Decimal). */
export class ProductionRate {
  public readonly value: Decimal;

  constructor(source: DecimalSource) {
    if (typeof source === 'number' && !Number.isFinite(source)) {
      throw new Error('ProductionRate must be a non-negative finite number');
    }
    const value = toDecimal(source);
    if (value.lt(0)) {
      throw new Error('ProductionRate must be a non-negative number');
    }
    this.value = value;
  }

  static from(source: DecimalSource): ProductionRate {
    return new ProductionRate(source);
  }

  add(rate: DecimalSource): ProductionRate {
    return new ProductionRate(this.value.add(rate));
  }

  subtract(rate: DecimalSource): ProductionRate {
    return new ProductionRate(this.value.sub(toDecimal(rate)));
  }

  applyMultiplier(multiplier: number): ProductionRate {
    return new ProductionRate(this.value.mul(multiplier));
  }

  toNumber(): number {
    const n = this.value.toNumber();
    return Number.isFinite(n) ? n : Number.MAX_VALUE;
  }
}
