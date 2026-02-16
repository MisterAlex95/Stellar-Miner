import type { Decimal } from '../bigNumber.js';
import type { Upgrade } from './Upgrade.js';
import { HOUSING_ASTRONAUT_CAPACITY } from '../constants.js';

/** Default max upgrade slots on a new planet (can be expanded later). */
export const UPGRADES_PER_PLANET = 6;

export type InstallingUpgrade = { upgrade: Upgrade; startAt: number; endsAt: number; rateToAdd: Decimal };

/** Pending uninstall: upgrade stays on planet until endsAt, then it is removed and application refunds. */
export type UninstallingUpgrade = { upgradeId: string; startAt: number; endsAt: number };

/** Entity: a planet with upgrade slots (expandable by paying coins) and optional housing (uses slots, +crew capacity). */
export class Planet {
  /** Mutable array so we can push upgrades. */
  public readonly upgrades: Upgrade[];
  /** Upgrades currently installing; they reserve a slot but do not contribute production until endsAt. */
  public readonly installingUpgrades: InstallingUpgrade[];
  /** Upgrades currently uninstalling; they reserve a slot until endsAt, then application refunds. */
  public readonly uninstallingUpgrades: UninstallingUpgrade[];
  private _maxUpgrades: number;
  private _housingCount: number;
  /** Crew assigned to this planet (for production bonus). Cap = housingCount * HOUSING_ASTRONAUT_CAPACITY. */
  private _assignedCrew: number;
  /** Seed for procedural texture; set at creation so each planet looks different. Omit for legacy saves. */
  public readonly visualSeed: number | undefined;

  constructor(
    public readonly id: string,
    public readonly name: string,
    maxUpgrades: number,
    upgrades: Upgrade[] = [],
    housingCount: number = 0,
    assignedCrew: number = 0,
    visualSeed?: number,
    installingUpgrades: InstallingUpgrade[] = [],
    uninstallingUpgrades: UninstallingUpgrade[] = []
  ) {
    this._maxUpgrades = maxUpgrades;
    this.upgrades = upgrades ? [...upgrades] : [];
    this.installingUpgrades = installingUpgrades ? [...installingUpgrades] : [];
    this.uninstallingUpgrades = uninstallingUpgrades ? [...uninstallingUpgrades] : [];
    this._housingCount = Math.max(0, housingCount);
    this._assignedCrew = Math.max(0, assignedCrew);
    this.visualSeed = visualSeed;
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

  /** Used slots = installed + installing + housing (upgrade stays on planet until uninstall completes). */
  get usedSlots(): number {
    const fromUpgrades = this.upgrades.filter((u) => u.usesSlot).length;
    const fromInstalling = this.installingUpgrades.filter((i) => i.upgrade.usesSlot).length;
    return fromUpgrades + fromInstalling + this._housingCount;
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

  /**
   * Remove one installed upgrade by id (last occurrence). Returns the removed upgrade or null if none.
   */
  removeUpgrade(upgradeId: string): Upgrade | null {
    const idx = this.upgrades.findIndex((u) => u.id === upgradeId);
    if (idx < 0) return null;
    const [removed] = this.upgrades.splice(idx, 1);
    return removed ?? null;
  }

  /** Start installing an upgrade; it reserves a slot and will contribute production after endsAt (ms). */
  addInstallingUpgrade(upgrade: Upgrade, startAt: number, endsAt: number, rateToAdd: Decimal): void {
    if (upgrade.usesSlot && !this.hasFreeSlot()) throw new Error('Planet has no free upgrade slot');
    this.installingUpgrades.push({ upgrade, startAt, endsAt, rateToAdd });
  }

  /**
   * Move any installing upgrades with endsAt <= now into upgrades and return their rates to add to player production.
   */
  tickInstallations(now: number): Decimal[] {
    const toAdd: Decimal[] = [];
    for (let i = this.installingUpgrades.length - 1; i >= 0; i--) {
      const entry = this.installingUpgrades[i];
      if (entry.endsAt <= now) {
        this.upgrades.push(entry.upgrade);
        toAdd.push(entry.rateToAdd);
        this.installingUpgrades.splice(i, 1);
      }
    }
    return toAdd;
  }

  /**
   * Cancel the last `count` installing upgrades of this type (e.g. user cancelled the progress).
   * Returns the removed entries so the application can refund and unassign crew.
   */
  cancelInstallingUpgrades(upgradeId: string, count: number): InstallingUpgrade[] {
    const removed: InstallingUpgrade[] = [];
    for (let i = this.installingUpgrades.length - 1; i >= 0 && removed.length < count; i--) {
      if (this.installingUpgrades[i].upgrade.id === upgradeId) {
        removed.push(this.installingUpgrades[i]);
        this.installingUpgrades.splice(i, 1);
      }
    }
    return removed;
  }

  /** Schedule one upgrade for uninstall at endsAt; the upgrade stays on planet (and produces) until then. */
  addUninstallingUpgrade(upgradeId: string, startAt: number, endsAt: number): void {
    this.uninstallingUpgrades.push({ upgradeId, startAt, endsAt });
  }

  /**
   * For each pending uninstall with endsAt <= now: remove that upgrade from planet and return it for refund.
   */
  tickUninstallations(now: number): Upgrade[] {
    const removed: Upgrade[] = [];
    for (let i = this.uninstallingUpgrades.length - 1; i >= 0; i--) {
      const entry = this.uninstallingUpgrades[i];
      if (entry.endsAt <= now) {
        const upgrade = this.removeUpgrade(entry.upgradeId);
        if (upgrade) removed.push(upgrade);
        this.uninstallingUpgrades.splice(i, 1);
      }
    }
    return removed;
  }

  /** Cancel one pending uninstall (upgrade stays on planet). */
  cancelUninstallingUpgrade(upgradeId: string): boolean {
    const idx = this.uninstallingUpgrades.findIndex((u) => u.upgradeId === upgradeId);
    if (idx < 0) return false;
    this.uninstallingUpgrades.splice(idx, 1);
    return true;
  }

  /**
   * Build one housing module (uses 1 slot). Call after paying cost.
   * When the caller has already verified with effective slots (e.g. research slot-free),
   * pass skipSlotCheck: true to avoid throwing when entity.usedSlots disagrees with effective count.
   */
  addHousing(skipSlotCheck?: boolean): void {
    if (!skipSlotCheck && !this.hasFreeSlot()) throw new Error('Planet has no free slot for housing');
    this._housingCount += 1;
  }

  /** Add one slot to this planet (called after paying cost in PlanetService). */
  addSlot(): void {
    this._maxUpgrades += 1;
  }

  static create(id: string, name: string, maxUpgrades: number = UPGRADES_PER_PLANET): Planet {
    const visualSeed = Math.floor(Math.random() * 0xffff_ffff);
    return new Planet(id, name, maxUpgrades, [], 0, 0, visualSeed);
  }
}
