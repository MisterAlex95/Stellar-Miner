import { Decimal, toDecimal, type DecimalSource } from '../bigNumber.js';
import type { UpgradeEffect } from '../value-objects/UpgradeEffect.js';

/** Entity: purchasable upgrade (e.g. mining robot). Cost supports unbounded values (Decimal). */
export class Upgrade {
  public readonly cost: Decimal;
  /** If false, this upgrade does not consume a planet slot (e.g. Mining Robot). */
  public readonly usesSlot: boolean;

  constructor(
    public readonly id: string,
    public readonly name: string,
    cost: DecimalSource,
    public readonly effect: UpgradeEffect,
    usesSlot: boolean = true
  ) {
    this.cost = toDecimal(cost);
    if (this.cost.lt(0)) {
      throw new Error('Upgrade cost must be non-negative');
    }
    this.usesSlot = usesSlot;
  }
}
