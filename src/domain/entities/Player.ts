import { Coins } from '../value-objects/Coins.js';
import { ProductionRate } from '../value-objects/ProductionRate.js';
import type { Upgrade } from './Upgrade.js';
import type { Artifact } from './Artifact.js';
import { Planet } from './Planet.js';
import { PLANET_PRODUCTION_BONUS, getPlanetName } from '../constants.js';

/** Aggregate root: player and their progression. Holds planets (expandable slots + production bonus), artifacts, coins. */
export class Player {
  /** Mutable array of planets. Each planet has upgrade slots (expandable) and contributes to production bonus. */
  public readonly planets: Planet[];

  constructor(
    public readonly id: string,
    public coins: Coins,
    public productionRate: ProductionRate,
    planets: Planet[],
    public readonly artifacts: Artifact[],
    public readonly prestigeLevel: number,
    public readonly totalCoinsEver: number
  ) {
    this.planets = planets ? [...planets] : [];
  }

  /** All upgrades across all planets (for backward compatibility and UI totals). */
  get upgrades(): Upgrade[] {
    return this.planets.flatMap((p) => p.upgrades);
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

  addPlanet(planet: Planet): void {
    this.planets.push(planet);
  }

  /** Returns a planet that has at least one free upgrade slot, or null. */
  getPlanetWithFreeSlot(): Planet | null {
    return this.planets.find((p) => p.hasFreeSlot()) ?? null;
  }

  /** All planets that have at least one free upgrade slot (for UI choice). */
  getPlanetsWithFreeSlot(): Planet[] {
    return this.planets.filter((p) => p.hasFreeSlot());
  }

  /** Production rate from upgrades, multiplied by planet bonus (+5% per extra planet). */
  get effectiveProductionRate(): number {
    const bonus = 1 + (this.planets.length - 1) * PLANET_PRODUCTION_BONUS;
    return this.productionRate.value * bonus;
  }

  static create(id: string): Player {
    const firstPlanet = Planet.create('planet-1', getPlanetName(0));
    return new Player(
      id,
      new Coins(0),
      new ProductionRate(0),
      [firstPlanet],
      [],
      0,
      0
    );
  }
}
