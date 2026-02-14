import type { Upgrade } from './Upgrade.js';

/** Default max upgrade slots on a new planet (can be expanded later). */
export const UPGRADES_PER_PLANET = 6;

/** Entity: a planet with upgrade slots (expandable by paying coins). */
export class Planet {
  /** Mutable array so we can push upgrades. */
  public readonly upgrades: Upgrade[];
  private _maxUpgrades: number;

  constructor(
    public readonly id: string,
    public readonly name: string,
    maxUpgrades: number,
    upgrades: Upgrade[] = []
  ) {
    this._maxUpgrades = maxUpgrades;
    this.upgrades = upgrades ? [...upgrades] : [];
  }

  get maxUpgrades(): number {
    return this._maxUpgrades;
  }

  get usedSlots(): number {
    return this.upgrades.length;
  }

  get freeSlots(): number {
    return Math.max(0, this._maxUpgrades - this.upgrades.length);
  }

  hasFreeSlot(): boolean {
    return this.upgrades.length < this._maxUpgrades;
  }

  addUpgrade(upgrade: Upgrade): void {
    if (!this.hasFreeSlot()) throw new Error('Planet has no free upgrade slot');
    this.upgrades.push(upgrade);
  }

  /** Add one slot to this planet (called after paying cost in PlanetService). */
  addSlot(): void {
    this._maxUpgrades += 1;
  }

  static create(id: string, name: string, maxUpgrades: number = UPGRADES_PER_PLANET): Planet {
    return new Planet(id, name, maxUpgrades, []);
  }
}
