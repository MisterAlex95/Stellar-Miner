import { Decimal, toDecimal, type DecimalSource } from '../bigNumber.js';
import { Coins } from '../value-objects/Coins.js';
import { ProductionRate } from '../value-objects/ProductionRate.js';
import type { Upgrade } from './Upgrade.js';
import type { Artifact } from './Artifact.js';
import { Planet } from './Planet.js';
import { PLANET_PRODUCTION_BONUS, PRESTIGE_BONUS_PER_LEVEL, ASTRONAUT_PRODUCTION_BONUS, getPlanetName } from '../constants.js';

/** Aggregate root: player and their progression. Holds planets, crew (astronauts), artifacts, coins. */
export class Player {
  /** Mutable array of planets. Each planet has upgrade slots (expandable) and contributes to production bonus. */
  public readonly planets: Planet[];

  public readonly totalCoinsEver: Decimal;

  constructor(
    public readonly id: string,
    public coins: Coins,
    public productionRate: ProductionRate,
    planets: Planet[],
    public readonly artifacts: Artifact[],
    public readonly prestigeLevel: number,
    totalCoinsEver: DecimalSource,
    public readonly astronautCount: number = 0
  ) {
    this.planets = planets ? [...planets] : [];
    this.totalCoinsEver = toDecimal(totalCoinsEver);
  }

  /** All upgrades across all planets (for backward compatibility and UI totals). */
  get upgrades(): Upgrade[] {
    return this.planets.flatMap((p) => p.upgrades);
  }

  addCoins(amount: DecimalSource): void {
    const a = toDecimal(amount);
    this.coins = this.coins.add(a);
    (this as { totalCoinsEver: Decimal }).totalCoinsEver = this.totalCoinsEver.add(a);
  }

  spendCoins(amount: DecimalSource): void {
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

  /** Production rate from upgrades × planet bonus × prestige × crew (astronauts +2% each). */
  get effectiveProductionRate(): Decimal {
    const planetBonus = 1 + (this.planets.length - 1) * PLANET_PRODUCTION_BONUS;
    const prestigeBonus = 1 + this.prestigeLevel * PRESTIGE_BONUS_PER_LEVEL;
    const crewBonus = 1 + this.astronautCount * ASTRONAUT_PRODUCTION_BONUS;
    return this.productionRate.value.mul(planetBonus * prestigeBonus * crewBonus);
  }

  /** Hire one astronaut if the player can afford the cost. Returns true if hired. */
  hireAstronaut(cost: DecimalSource): boolean {
    if (!this.coins.gte(cost)) return false;
    this.spendCoins(cost);
    (this as { astronautCount: number }).astronautCount++;
    return true;
  }

  /** Spend astronauts (e.g. to assign to an upgrade or send on expedition). Returns true if enough crew. */
  spendAstronauts(count: number): boolean {
    if (count <= 0) return true;
    if (this.astronautCount < count) return false;
    (this as { astronautCount: number }).astronautCount -= count;
    return true;
  }

  /** Add astronauts back (e.g. expedition survivors). */
  addAstronauts(count: number): void {
    if (count <= 0) return;
    (this as { astronautCount: number }).astronautCount += count;
  }

  /** Returns a fresh player after prestige: one empty planet, 0 coins, 0 crew, prestige level +1. */
  static createAfterPrestige(oldPlayer: Player): Player {
    return new Player(
      oldPlayer.id,
      Coins.from(0),
      ProductionRate.from(0),
      [Planet.create('planet-1', getPlanetName(0))],
      [],
      oldPlayer.prestigeLevel + 1,
      oldPlayer.totalCoinsEver,
      0
    );
  }

  static create(id: string): Player {
    const firstPlanet = Planet.create('planet-1', getPlanetName(0));
    return new Player(id, Coins.from(0), ProductionRate.from(0), [firstPlanet], [], 0, 0, 0);
  }
}
