import type { Player } from '../entities/Player.js';
import type { Planet } from '../entities/Planet.js';
import { Planet as PlanetEntity } from '../entities/Planet.js';
import {
  getNewPlanetCost,
  getAddSlotCost,
  getPlanetName,
  getExpeditionAstronautsRequired,
  EXPEDITION_DEATH_CHANCE,
  getHousingCost,
} from '../constants.js';

export type ExpeditionOutcome = {
  success: boolean;
  totalSent: number;
  survivors: number;
  deaths: number;
  planetName?: string;
};

/** Domain service: discover new planets via expedition (astronauts at risk) or expand a planet's slots. */
export class PlanetService {
  getNewPlanetCost(player: Player) {
    return getNewPlanetCost(player.planets.length);
  }

  getExpeditionAstronautsRequired(player: Player): number {
    return getExpeditionAstronautsRequired(player.planets.length);
  }

  canLaunchExpedition(player: Player): boolean {
    const cost = this.getNewPlanetCost(player);
    const required = this.getExpeditionAstronautsRequired(player);
    return player.coins.gte(cost) && player.astronautCount >= required;
  }

  /** Launch expedition: spend coins + N astronauts. Each astronaut has a death chance; if at least one survives, discover planet and return survivors. */
  launchExpedition(player: Player, roll: () => number = Math.random): ExpeditionOutcome {
    const cost = this.getNewPlanetCost(player);
    const required = this.getExpeditionAstronautsRequired(player);
    if (!player.coins.gte(cost) || !player.spendAstronauts(required)) {
      return { success: false, totalSent: 0, survivors: 0, deaths: 0 };
    }
    player.spendCoins(cost);
    let deaths = 0;
    for (let i = 0; i < required; i++) {
      if (roll() < EXPEDITION_DEATH_CHANCE) deaths++;
    }
    const survivors = required - deaths;
    const success = survivors >= 1;
    if (success) {
      const id = `planet-${player.planets.length + 1}`;
      const name = getPlanetName(player.planets.length);
      player.addPlanet(PlanetEntity.create(id, name));
      player.addAstronauts(survivors);
      return { success: true, totalSent: required, survivors, deaths, planetName: name };
    }
    return { success: false, totalSent: required, survivors: 0, deaths: required, planetName: undefined };
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
