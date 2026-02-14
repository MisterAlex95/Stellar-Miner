/** Value object: coins per second production rate. Immutable. */
export class ProductionRate {
  constructor(public readonly value: number) {
    if (value < 0 || !Number.isFinite(value)) {
      throw new Error('ProductionRate must be a non-negative finite number');
    }
  }

  add(rate: number): ProductionRate {
    return new ProductionRate(this.value + rate);
  }

  applyMultiplier(multiplier: number): ProductionRate {
    return new ProductionRate(this.value * multiplier);
  }
}
