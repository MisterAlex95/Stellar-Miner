import type { Upgrade } from './Upgrade.js';
import { HOUSING_ASTRONAUT_CAPACITY } from '../constants.js';

/** Default max upgrade slots on a new planet (can be expanded later). */
export const UPGRADES_PER_PLANET = 6;

/** Entity: a planet with upgrade slots (expandable by paying coins) and optional housing (uses slots, +crew capacity). */
export class Planet {
  /** Mutable array so we can push upgrades. */
  public readonly upgrades: Upgrade[];
  private _maxUpgrades: number;
  private _housingCount: number;
  /** Crew assigned to this planet (for production bonus). Cap = housingCount * HOUSING_ASTRONAUT_CAPACITY. */
  private _assignedCrew: number;

  constructor(
    public readonly id: string,
    public readonly name: string,
    maxUpgrades: number,
    upgrades: Upgrade[] = [],
    housingCount: number = 0,
    assignedCrew: number = 0
  ) {
    this._maxUpgrades = maxUpgrades;
    this.upgrades = upgrades ? [...upgrades] : [];
    this._housingCount = Math.max(0, housingCount);
    this._assignedCrew = Math.max(0, assignedCrew);
  }

  get assignedCrew(): number {
    return this._assignedCrew;
  }

  /** Max crew that can be assigned to this planet (from housing). */
  get maxAssignedCrew(): number {
    return this._housingCount * HOUSING_ASTRONAUT_CAPACITY;
  }

  setAssignedCrew(n: number): void {
    this._assignedCrew = Math.max(0, Math.min(n, this.maxAssignedCrew));
  }

  get maxUpgrades(): number {
    return this._maxUpgrades;
  }

  /** Housing modules (each uses 1 slot and adds crew capacity). */
  get housingCount(): number {
    return this._housingCount;
  }

  /** Used slots = upgrades that use a slot + housing. */
  get usedSlots(): number {
    return this.upgrades.filter((u) => u.usesSlot).length + this._housingCount;
  }

  get freeSlots(): number {
    return Math.max(0, this._maxUpgrades - this.usedSlots);
  }

  hasFreeSlot(): boolean {
    return this.usedSlots < this._maxUpgrades;
  }

  addUpgrade(upgrade: Upgrade): void {
    if (upgrade.usesSlot && !this.hasFreeSlot()) throw new Error('Planet has no free upgrade slot');
    this.upgrades.push(upgrade);
  }

  /** Build one housing module (uses 1 slot). Call only when hasFreeSlot() and after paying cost. */
  addHousing(): void {
    if (!this.hasFreeSlot()) throw new Error('Planet has no free slot for housing');
    this._housingCount += 1;
  }

  /** Add one slot to this planet (called after paying cost in PlanetService). */
  addSlot(): void {
    this._maxUpgrades += 1;
  }

  static create(id: string, name: string, maxUpgrades: number = UPGRADES_PER_PLANET): Planet {
    return new Planet(id, name, maxUpgrades, [], 0, 0);
  }
}
