import { Coins } from '../value-objects/Coins.js';
import { ProductionRate } from '../value-objects/ProductionRate.js';
import type { Upgrade } from './Upgrade.js';
import type { Artifact } from './Artifact.js';

/** Aggregate root: player and their progression. Holds upgrades, artifacts, coins. */
export class Player {
  /** Mutable array so we can push multiple of the same upgrade. */
  public readonly upgrades: Upgrade[];

  constructor(
    public readonly id: string,
    public coins: Coins,
    public productionRate: ProductionRate,
    upgrades: Upgrade[],
    public readonly artifacts: Artifact[],
    public readonly prestigeLevel: number,
    public readonly totalCoinsEver: number
  ) {
    this.upgrades = upgrades ? [...upgrades] : [];
  }

  addCoins(amount: number): void {
    this.coins = this.coins.add(amount);
  }

  spendCoins(amount: number): void {
    this.coins = this.coins.subtract(amount);
  }

  setProductionRate(rate: ProductionRate): void {
    (this as { productionRate: ProductionRate }).productionRate = rate;
  }

  addUpgrade(upgrade: Upgrade): void {
    this.upgrades.push(upgrade);
  }

  static create(id: string): Player {
    return new Player(
      id,
      new Coins(0),
      new ProductionRate(0),
      [],
      [],
      0,
      0
    );
  }
}
