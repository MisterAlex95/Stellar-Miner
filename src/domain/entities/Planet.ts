import type { Upgrade } from './Upgrade.js';

/** Max upgrades that can be placed on a single planet. */
export const UPGRADES_PER_PLANET = 5;

/** Entity: a planet with limited upgrade slots. */
export class Planet {
  /** Mutable array so we can push upgrades. */
  public readonly upgrades: Upgrade[];

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly maxUpgrades: number,
    upgrades: Upgrade[] = []
  ) {
    this.upgrades = upgrades ? [...upgrades] : [];
  }

  get usedSlots(): number {
    return this.upgrades.length;
  }

  get freeSlots(): number {
    return Math.max(0, this.maxUpgrades - this.upgrades.length);
  }

  hasFreeSlot(): boolean {
    return this.upgrades.length < this.maxUpgrades;
  }

  addUpgrade(upgrade: Upgrade): void {
    if (!this.hasFreeSlot()) throw new Error('Planet has no free upgrade slot');
    this.upgrades.push(upgrade);
  }

  static create(id: string, name: string, maxUpgrades: number = UPGRADES_PER_PLANET): Planet {
    return new Planet(id, name, maxUpgrades, []);
  }
}
