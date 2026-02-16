import { Decimal, toDecimal, type DecimalSource } from '../bigNumber.js';
import { Coins } from '../value-objects/Coins.js';
import { ProductionRate } from '../value-objects/ProductionRate.js';
import type { Upgrade } from './Upgrade.js';
import type { Artifact } from './Artifact.js';
import { Planet } from './Planet.js';
import {
  PLANET_PRODUCTION_BONUS,
  PRESTIGE_BONUS_PER_LEVEL,
  MINER_PRODUCTION_BONUS,
  OTHER_CREW_PRODUCTION_BONUS,
  VETERAN_PRODUCTION_BONUS,
  MORALE_BONUS_WHEN_COMFORTABLE,
  MORALE_MALUS_WHEN_OVERCROWDED,
  generatePlanetName,
  getMaxAstronauts,
  type CrewRole,
  type CrewByRole,
  type ExpeditionComposition,
  CREW_ROLES,
} from '../constants.js';

const DEFAULT_CREW_BY_ROLE: CrewByRole = {
  astronaut: 0,
  miner: 0,
  scientist: 0,
  pilot: 0,
  medic: 0,
  engineer: 0,
};

/** Order to deduct crew when spending (e.g. for expeditions). Generic astronauts first, then job roles. */
const SPEND_ORDER: CrewRole[] = ['astronaut', 'miner', 'scientist', 'pilot', 'medic', 'engineer'];

/** Aggregate root: player and their progression. Holds planets, crew (astronauts by role + assigned to equipment), veterans, artifacts, coins. */
export class Player {
  /** Mutable array of planets. Each planet has upgrade slots (expandable) and contributes to production bonus. */
  public readonly planets: Planet[];

  public readonly totalCoinsEver: Decimal;

  /** Crew count per role (astronaut = no job, miner/scientist/pilot = jobs unlocked via research). Free pool for capacity and equipment. */
  public readonly crewByRole: CrewByRole;

  /** Crew assigned to equipment (upgrades that cost crew). Taken from the free pool when buying; miner/scientist/pilot counts stay unchanged. */
  public readonly crewAssignedToEquipment: number;

  /** Expedition survivors; give production bonus, lost on prestige. */
  public readonly veteranCount: number;

  constructor(
    public readonly id: string,
    public coins: Coins,
    public productionRate: ProductionRate,
    planets: Planet[],
    public readonly artifacts: Artifact[],
    public readonly prestigeLevel: number,
    totalCoinsEver: DecimalSource,
    crewByRoleOrAstronautCount?: CrewByRole | number,
    veteranCount: number = 0,
    crewAssignedToEquipment: number = 0
  ) {
    this.planets = planets ? [...planets] : [];
    this.totalCoinsEver = toDecimal(totalCoinsEver);
    if (typeof crewByRoleOrAstronautCount === 'object' && crewByRoleOrAstronautCount != null) {
      this.crewByRole = { ...DEFAULT_CREW_BY_ROLE, ...crewByRoleOrAstronautCount };
    } else {
      const n = typeof crewByRoleOrAstronautCount === 'number' ? crewByRoleOrAstronautCount : 0;
      this.crewByRole = { ...DEFAULT_CREW_BY_ROLE, astronaut: n };
    }
    this.veteranCount = Math.max(0, veteranCount);
    this.crewAssignedToEquipment = Math.max(0, crewAssignedToEquipment);
  }

  /** Free crew (all roles). Used for capacity, bonuses, expedition, etc. */
  get freeCrewCount(): number {
    return CREW_ROLES.reduce((s, r) => s + (this.crewByRole[r] ?? 0), 0);
  }

  /** Free astronauts only. Upgrades that require crew take from this pool (cannot use miners/scientists/etc). */
  get freeAstronautCount(): number {
    return this.crewByRole.astronaut ?? 0;
  }

  /** Total crew = free (by role) + assigned to equipment. Used for capacity and UI total. */
  get astronautCount(): number {
    return this.freeCrewCount + this.crewAssignedToEquipment;
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

  /** Production rate from upgrades × planet bonus × prestige × crew jobs (miner/scientist/pilot only) × veterans × morale. */
  get effectiveProductionRate(): Decimal {
    const planetBonus = 1 + (this.planets.length - 1) * PLANET_PRODUCTION_BONUS;
    const prestigeBonus = 1 + this.prestigeLevel * PRESTIGE_BONUS_PER_LEVEL;
    const minerBonus = 1 + this.crewByRole.miner * MINER_PRODUCTION_BONUS;
    const otherCrewBonus =
      1 +
      (this.crewByRole.scientist +
        this.crewByRole.pilot +
        this.crewByRole.medic +
        this.crewByRole.engineer) *
        OTHER_CREW_PRODUCTION_BONUS;
    const veteranBonus = 1 + this.veteranCount * VETERAN_PRODUCTION_BONUS;
    const totalCrewAndVeterans = this.astronautCount + this.veteranCount;
    const totalHousing = this.planets.reduce((s, p) => s + p.housingCount, 0);
    const maxCrew = getMaxAstronauts(this.planets.length, totalHousing);
    const morale =
      totalCrewAndVeterans === 0
        ? 1
        : this.astronautCount <= maxCrew
          ? 1 + MORALE_BONUS_WHEN_COMFORTABLE
          : 1 - MORALE_MALUS_WHEN_OVERCROWDED;
    return this.productionRate.value.mul(
      planetBonus * prestigeBonus * minerBonus * otherCrewBonus * veteranBonus * morale
    );
  }

  /** Hire one astronaut in the given role if the player can afford the cost. Returns true if hired. */
  hireAstronaut(cost: DecimalSource, role: CrewRole = 'astronaut'): boolean {
    if (!this.coins.gte(cost)) return false;
    this.spendCoins(cost);
    (this as { crewByRole: CrewByRole }).crewByRole[role] = this.crewByRole[role] + 1;
    return true;
  }

  /**
   * Assign crew to equipment (when buying an upgrade that costs crew).
   * Takes only from the astronaut role (not miners/scientists/etc). Returns true if enough free astronauts.
   */
  assignCrewToEquipment(count: number): boolean {
    if (count <= 0) return true;
    if (this.freeAstronautCount < count) return false;
    (this as { crewByRole: CrewByRole }).crewByRole.astronaut = this.crewByRole.astronaut - count;
    (this as { crewAssignedToEquipment: number }).crewAssignedToEquipment += count;
    return true;
  }

  /**
   * Remove crew from equipment.
   * @param returnToAstronautPool - If true (default), freed crew go back to the astronaut pool (e.g. upgrade purchase rollback). If false, they do not (e.g. research then adds them as miners).
   */
  unassignCrewFromEquipment(count: number, returnToAstronautPool: boolean = true): void {
    if (count <= 0) return;
    const n = Math.min(count, this.crewAssignedToEquipment);
    (this as { crewAssignedToEquipment: number }).crewAssignedToEquipment = Math.max(0, this.crewAssignedToEquipment - n);
    if (returnToAstronautPool && n > 0) {
      (this as { crewByRole: CrewByRole }).crewByRole.astronaut = this.crewByRole.astronaut + n;
    }
  }

  /** Spend astronauts from crew by role (e.g. for expeditions). Deducts in order: miner, scientist, pilot. Returns true if enough. */
  spendAstronauts(count: number): boolean {
    if (count <= 0) return true;
    if (this.freeCrewCount < count) return false;
    const crew = this.crewByRole as CrewByRole;
    let remaining = count;
    for (const r of SPEND_ORDER) {
      const take = Math.min(remaining, crew[r]);
      if (take > 0) {
        crew[r] = crew[r] - take;
        remaining -= take;
      }
      if (remaining <= 0) break;
    }
    return true;
  }

  /** Add astronauts back to a role (e.g. expedition survivors returned to pool — not used; survivors become veterans). */
  addAstronauts(count: number, role: CrewRole = 'miner'): void {
    if (count <= 0) return;
    (this as { crewByRole: CrewByRole }).crewByRole[role] = this.crewByRole[role] + count;
  }

  /** Add veterans (expedition survivors). They give production bonus but are not crew. */
  addVeterans(count: number): void {
    if (count <= 0) return;
    (this as { veteranCount: number }).veteranCount += count;
  }

  /** Spend crew from composition (for expedition). Returns true if enough of each role. */
  spendCrewByComposition(comp: ExpeditionComposition): boolean {
    for (const r of CREW_ROLES) {
      if (this.crewByRole[r] < (comp[r] ?? 0)) return false;
    }
    for (const r of CREW_ROLES) {
      (this as { crewByRole: CrewByRole }).crewByRole[r] = this.crewByRole[r] - (comp[r] ?? 0);
    }
    return true;
  }

  /** Returns a fresh player after prestige: one empty planet, 0 coins, 0 crew, 0 veterans, prestige level +1. */
  static createAfterPrestige(oldPlayer: Player): Player {
    const firstPlanetName = generatePlanetName(`planet-1-${Date.now()}-${Math.random()}`);
    return new Player(
      oldPlayer.id,
      Coins.from(0),
      ProductionRate.from(0),
      [Planet.create('planet-1', firstPlanetName)],
      [],
      oldPlayer.prestigeLevel + 1,
      oldPlayer.totalCoinsEver,
      DEFAULT_CREW_BY_ROLE,
      0,
      0
    );
  }

  static create(id: string): Player {
    const firstPlanetName = generatePlanetName(`planet-1-${Date.now()}-${Math.random()}`);
    const firstPlanet = Planet.create('planet-1', firstPlanetName);
    return new Player(id, Coins.from(0), ProductionRate.from(0), [firstPlanet], [], 0, 0, DEFAULT_CREW_BY_ROLE, 0, 0);
  }
}
