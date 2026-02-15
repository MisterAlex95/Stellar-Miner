import { Decimal, toDecimal, type DecimalSource } from '../bigNumber.js';
import type { UpgradeEffect } from '../value-objects/UpgradeEffect.js';

/** Entity: purchasable upgrade (e.g. mining robot). Cost supports unbounded values (Decimal). */
export class Upgrade {
  public readonly cost: Decimal;

  constructor(
    public readonly id: string,
    public readonly name: string,
    cost: DecimalSource,
    public readonly effect: UpgradeEffect
  ) {
    this.cost = toDecimal(cost);
    if (this.cost.lt(0)) {
      throw new Error('Upgrade cost must be non-negative');
    }
  }
}
