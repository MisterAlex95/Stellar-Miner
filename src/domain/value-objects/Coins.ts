import { Decimal, toDecimal, type DecimalSource } from '../bigNumber.js';

/** Value object: in-game currency. Immutable. Supports unbounded values (Decimal). */
export class Coins {
  public readonly value: Decimal;

  constructor(source: DecimalSource) {
    if (typeof source === 'number' && !Number.isFinite(source)) {
      throw new Error('Coins must be a non-negative finite number');
    }
    const value = toDecimal(source);
    if (value.lt(0)) {
      throw new Error('Coins must be a non-negative number');
    }
    this.value = value;
  }

  static from(source: DecimalSource): Coins {
    return new Coins(source);
  }

  add(amount: DecimalSource): Coins {
    return new Coins(this.value.add(amount));
  }

  subtract(amount: DecimalSource): Coins {
    const next = this.value.sub(amount);
    if (next.lt(-1e-6)) throw new Error('Insufficient coins');
    return new Coins(next.lt(0) ? new Decimal(0) : next);
  }

  gte(other: Coins | DecimalSource): boolean {
    const v = other instanceof Coins ? other.value : toDecimal(other);
    return this.value.gte(v.minus(1e-6));
  }

  /** Safe number for display animation (capped so lerp works). */
  toNumber(): number {
    const n = this.value.toNumber();
    return Number.isFinite(n) ? n : Number.MAX_VALUE;
  }
}
