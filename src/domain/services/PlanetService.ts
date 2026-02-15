import type { Player } from '../entities/Player.js';
import type { Planet } from '../entities/Planet.js';
import { Planet as PlanetEntity } from '../entities/Planet.js';
import {
  getNewPlanetCost,
  getAddSlotCost,
  generatePlanetName,
  getExpeditionAstronautsRequired,
  EXPEDITION_DEATH_CHANCE,
  EXPEDITION_MIN_DEATH_CHANCE,
  getHousingCost,
  CREW_ROLES,
  type ExpeditionComposition,
} from '../constants.js';

export type ExpeditionOutcome = {
  success: boolean;
  totalSent: number;
  survivors: number;
  deaths: number;
  planetName?: string;
};

/** Build default composition: fill required from pool (miners first, then scientist, pilot). */
function defaultComposition(player: Player, required: number): ExpeditionComposition {
  const comp: ExpeditionComposition = { miner: 0, scientist: 0, pilot: 0 };
  const order = ['miner', 'scientist', 'pilot'] as const;
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

  getExpeditionAstronautsRequired(player: Player): number {
    return getExpeditionAstronautsRequired(player.planets.length);
  }

  canLaunchExpedition(player: Player, composition?: ExpeditionComposition | null): boolean {
    const cost = this.getNewPlanetCost(player);
    const required = this.getExpeditionAstronautsRequired(player);
    if (!player.coins.gte(cost) || player.astronautCount < required) return false;
    if (composition) {
      const sum = CREW_ROLES.reduce((s, r) => s + composition[r], 0);
      if (sum !== required) return false;
      for (const r of CREW_ROLES) {
        if (player.crewByRole[r] < composition[r]) return false;
      }
    }
    return true;
  }

  /** Launch expedition: spend coins + crew (by composition or default). Pilot guarantees one survivor. Survivors become veterans. */
  launchExpedition(
    player: Player,
    rollOrComposition: (() => number) | ExpeditionComposition = Math.random,
    roll: () => number = Math.random
  ): ExpeditionOutcome {
    const cost = this.getNewPlanetCost(player);
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
    const totalSent = CREW_ROLES.reduce((s, r) => s + composition[r], 0);
    const pilotCount = composition.pilot;
    const deathChance = Math.max(EXPEDITION_MIN_DEATH_CHANCE, EXPEDITION_DEATH_CHANCE);
    let deaths = 0;
    for (let i = 0; i < totalSent; i++) {
      if (rollFn() < deathChance) deaths++;
    }
    let survivors = totalSent - deaths;
    const hasPilot = pilotCount >= 1;
    if (hasPilot && survivors === 0 && totalSent >= 1) {
      survivors = 1;
      deaths = totalSent - 1;
    }
    const success = survivors >= 1;
    if (success) {
      const id = `planet-${player.planets.length + 1}`;
      const name = generatePlanetName(id);
      player.addPlanet(PlanetEntity.create(id, name));
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
    planet.addHousing();
    return true;
  }
}
