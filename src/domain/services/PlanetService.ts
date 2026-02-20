import type { Player } from '../entities/Player.js';
import type { Planet } from '../entities/Planet.js';
import { Planet as PlanetEntity } from '../entities/Planet.js';
import type { Decimal } from '../bigNumber.js';
import {
  getExpeditionCost,
  getNewPlanetCost,
  getAddSlotCost,
  generatePlanetName,
  getExpeditionAstronautsRequired,
  getExpeditionDeathChanceWithMedics,
  getExpeditionDurationMs,
  getExpeditionTier,
  getMiningExpeditionCoins,
  getRescueCrewCount,
  getHousingCost,
  CREW_ROLES,
  type ExpeditionComposition,
  type ExpeditionTierId,
  type ExpeditionTypeId,
} from '../constants.js';

export type ExpeditionOutcome = {
  success: boolean;
  totalSent: number;
  survivors: number;
  deaths: number;
  planetName?: string;
  /** Mining success: coins brought back. */
  coinsEarned?: Decimal;
  /** Rescue success: extra crew rescued (capped by housing in handler). */
  rescuedCrew?: number;
};

/** Build default composition: fill required from pool (astronauts first, then job roles). */
function defaultComposition(player: Player, required: number): ExpeditionComposition {
  const comp: ExpeditionComposition = {
    astronaut: 0,
    miner: 0,
    scientist: 0,
    pilot: 0,
    medic: 0,
    engineer: 0,
  };
  const order: (keyof ExpeditionComposition)[] = [
    'astronaut',
    'miner',
    'scientist',
    'pilot',
    'medic',
    'engineer',
  ];
  let left = required;
  for (const r of order) {
    const take = Math.min(left, player.crewByRole[r]);
    comp[r] = take;
    left -= take;
    if (left <= 0) break;
  }
  return comp;
}

/** Domain service: discover new planets via expedition (astronauts at risk) or expand a planet's slots. */
export class PlanetService {
  getNewPlanetCost(player: Player) {
    return getNewPlanetCost(player.planets.length);
  }

  /** Expedition cost depends on type: Scout = new planet cost, Mining/Rescue = type-specific. */
  getExpeditionCost(player: Player, typeId: ExpeditionTypeId = 'scout') {
    return getExpeditionCost(player.planets.length, typeId);
  }

  getExpeditionAstronautsRequired(player: Player): number {
    return getExpeditionAstronautsRequired(player.planets.length);
  }

  canLaunchExpedition(player: Player, composition?: ExpeditionComposition | null, typeId: ExpeditionTypeId = 'scout'): boolean {
    const cost = this.getExpeditionCost(player, typeId);
    const required = this.getExpeditionAstronautsRequired(player);
    if (!player.coins.gte(cost) || player.astronautCount < required) return false;
    if (composition) {
      const sum = CREW_ROLES.reduce((s, r) => s + (composition[r] ?? 0), 0);
      if (sum !== required) return false;
      for (const r of CREW_ROLES) {
        if ((player.crewByRole[r] ?? 0) < (composition[r] ?? 0)) return false;
      }
    }
    return true;
  }

  /** Expedition duration in ms. researchDurationPercent optional (from research, negative = faster). typeId optional (scout/mining/rescue). */
  getExpeditionDurationMs(
    player: Player,
    tierId?: ExpeditionTierId,
    pilotCount: number = 0,
    researchDurationPercent: number = 0,
    typeId?: ExpeditionTypeId
  ): number {
    return getExpeditionDurationMs(player.planets.length, tierId, pilotCount, researchDurationPercent, typeId);
  }

  /** Start expedition: spend coins + crew (cost depends on type). Returns composition, tier and type for completion. */
  startExpedition(
    player: Player,
    compositionOrDefault?: ExpeditionComposition | null,
    tierId: ExpeditionTierId = 'medium',
    typeId: ExpeditionTypeId = 'scout'
  ): { started: true; composition: ExpeditionComposition; tierId: ExpeditionTierId; typeId: ExpeditionTypeId } | { started: false } {
    const cost = this.getExpeditionCost(player, typeId);
    const required = this.getExpeditionAstronautsRequired(player);
    const composition =
      compositionOrDefault && CREW_ROLES.reduce((s, r) => s + (compositionOrDefault[r] ?? 0), 0) === required
        ? { ...compositionOrDefault }
        : defaultComposition(player, required);
    if (!player.coins.gte(cost) || !player.spendCrewByComposition(composition)) {
      return { started: false };
    }
    player.spendCoins(cost);
    return { started: true, composition: { ...composition }, tierId, typeId };
  }

  /** Complete expedition: outcome depends on type. durationMs required for Mining (coin reward). */
  completeExpedition(
    player: Player,
    composition: ExpeditionComposition,
    tierId: ExpeditionTierId = 'medium',
    roll: () => number = Math.random,
    researchDeathChancePercent: number = 0,
    getDiscoveryFlavor?: (planetName: string) => string,
    typeId: ExpeditionTypeId = 'scout',
    durationMs: number = 0
  ): ExpeditionOutcome {
    const totalSent = CREW_ROLES.reduce((s, r) => s + (composition[r] ?? 0), 0);
    const medicCount = composition.medic ?? 0;
    const deathChance = getExpeditionDeathChanceWithMedics(medicCount, tierId, researchDeathChancePercent, typeId);
    let deaths = 0;
    for (let i = 0; i < totalSent; i++) {
      if (roll() < deathChance) deaths++;
    }
    const survivors = totalSent - deaths;
    const success = survivors >= 1;

    if (success && typeId === 'scout') {
      const id = `planet-${player.planets.length + 1}`;
      const name = generatePlanetName(id);
      const discoveryFlavor = getDiscoveryFlavor?.(name);
      const planet = PlanetEntity.create(id, name, undefined, discoveryFlavor);
      const tier = getExpeditionTier(tierId);
      if (tier?.extraSlot) planet.addSlot();
      player.addPlanet(planet);
      player.addVeterans(survivors);
      return { success: true, totalSent, survivors, deaths, planetName: name };
    }

    if (success && typeId === 'mining') {
      player.addAstronauts(survivors, 'astronaut');
      const minerCount = composition.miner ?? 0;
      const coins = getMiningExpeditionCoins(
        player.effectiveProductionRate,
        durationMs > 0 ? durationMs : 60000,
        tierId,
        minerCount
      );
      player.addCoins(coins);
      return { success: true, totalSent, survivors, deaths, coinsEarned: coins };
    }

    if (success && typeId === 'rescue') {
      player.addAstronauts(survivors, 'astronaut');
      const rescued = getRescueCrewCount(roll, tierId);
      return { success: true, totalSent, survivors, deaths, rescuedCrew: rescued };
    }

    return { success: false, totalSent, survivors: 0, deaths: totalSent, planetName: undefined };
  }

  /** Launch expedition (instant, for tests): scout only — spend scout cost + crew, discover planet on success. */
  launchExpedition(
    player: Player,
    rollOrComposition: (() => number) | ExpeditionComposition = Math.random,
    roll: () => number = Math.random,
    tierId: ExpeditionTierId = 'medium',
    researchDeathChancePercent: number = 0,
    getDiscoveryFlavor?: (planetName: string) => string,
    _typeId?: ExpeditionTypeId
  ): ExpeditionOutcome {
    const cost = this.getExpeditionCost(player, 'scout');
    const required = this.getExpeditionAstronautsRequired(player);
    let composition: ExpeditionComposition;
    let rollFn: () => number;
    if (typeof rollOrComposition === 'function') {
      composition = defaultComposition(player, required);
      rollFn = rollOrComposition;
    } else {
      composition = rollOrComposition;
      rollFn = roll;
    }
    if (!player.coins.gte(cost) || !player.spendCrewByComposition(composition)) {
      return { success: false, totalSent: 0, survivors: 0, deaths: 0 };
    }
    player.spendCoins(cost);
    const totalSent = CREW_ROLES.reduce((s, r) => s + (composition[r] ?? 0), 0);
    const medicCount = composition.medic ?? 0;
    const deathChance = getExpeditionDeathChanceWithMedics(medicCount, tierId, researchDeathChancePercent, 'scout');
    let deaths = 0;
    for (let i = 0; i < totalSent; i++) {
      if (rollFn() < deathChance) deaths++;
    }
    const survivors = totalSent - deaths;
    const success = survivors >= 1;
    if (success) {
      const id = `planet-${player.planets.length + 1}`;
      const name = generatePlanetName(id);
      const discoveryFlavor = getDiscoveryFlavor?.(name);
      const planet = PlanetEntity.create(id, name, undefined, discoveryFlavor);
      const tier = getExpeditionTier(tierId);
      if (tier?.extraSlot) planet.addSlot();
      player.addPlanet(planet);
      player.addVeterans(survivors);
      return { success: true, totalSent, survivors, deaths, planetName: name };
    }
    return { success: false, totalSent, survivors: 0, deaths: totalSent, planetName: undefined };
  }

  /** @deprecated Use launchExpedition. Kept for tests that buy planet without crew. */
  canBuyNewPlanet(player: Player): boolean {
    return this.canLaunchExpedition(player);
  }

  /** @deprecated Use launchExpedition. */
  buyNewPlanet(player: Player): boolean {
    if (!this.canLaunchExpedition(player)) return false;
    const outcome = this.launchExpedition(player, () => 1);
    return outcome.success;
  }

  getAddSlotCost(planet: Planet) {
    return getAddSlotCost(planet.maxUpgrades);
  }

  canAddSlot(player: Player, planet: Planet): boolean {
    return player.coins.gte(this.getAddSlotCost(planet));
  }

  addSlot(player: Player, planet: Planet): boolean {
    if (!this.canAddSlot(player, planet)) return false;
    player.spendCoins(this.getAddSlotCost(planet));
    planet.addSlot();
    return true;
  }

  getHousingCost(planet: Planet) {
    return getHousingCost(planet.housingCount);
  }

  canBuildHousing(player: Player, planet: Planet, hasFreeSlot?: (p: Planet) => boolean): boolean {
    const slotOk = hasFreeSlot ? hasFreeSlot(planet) : planet.hasFreeSlot();
    return slotOk && player.coins.gte(this.getHousingCost(planet));
  }

  buildHousing(player: Player, planet: Planet, hasFreeSlot?: (p: Planet) => boolean): boolean {
    if (!this.canBuildHousing(player, planet, hasFreeSlot)) return false;
    player.spendCoins(this.getHousingCost(planet));
    planet.addHousing(!!hasFreeSlot);
    return true;
  }
}
