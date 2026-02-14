import type { UpgradeEffect } from '../value-objects/UpgradeEffect.js';

/** Entity: purchasable upgrade (e.g. mining robot). */
export class Upgrade {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly cost: number,
    public readonly effect: UpgradeEffect
  ) {}
}
