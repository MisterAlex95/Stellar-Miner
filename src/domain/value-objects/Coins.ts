/** Value object: in-game currency. Immutable. */
export class Coins {
  constructor(public readonly value: number) {
    if (value < 0 || !Number.isFinite(value)) {
      throw new Error('Coins must be a non-negative finite number');
    }
  }

  add(amount: number): Coins {
    return new Coins(this.value + amount);
  }

  subtract(amount: number): Coins {
    const next = this.value - amount;
    if (next < -1e-6) throw new Error('Insufficient coins');
    return new Coins(Math.max(0, next));
  }

  /** Use small epsilon to avoid floating-point errors (e.g. 49.999999 < 50). */
  gte(other: Coins | number): boolean {
    const v = typeof other === 'number' ? other : other.value;
    return this.value >= v - 1e-6;
  }
}
