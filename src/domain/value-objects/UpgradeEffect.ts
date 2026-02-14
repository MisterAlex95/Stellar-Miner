/** Value object: effect of an upgrade (e.g. +1 coin/s). Immutable. */
export class UpgradeEffect {
  constructor(public readonly coinsPerSecond: number) {
    if (!Number.isFinite(coinsPerSecond)) {
      throw new Error('UpgradeEffect.coinsPerSecond must be finite');
    }
  }
}
