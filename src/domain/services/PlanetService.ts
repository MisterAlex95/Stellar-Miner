import type { Player } from '../entities/Player.js';
import type { Planet } from '../entities/Planet.js';
import { Planet as PlanetEntity } from '../entities/Planet.js';
import { getNewPlanetCost, getAddSlotCost, getPlanetName } from '../constants.js';

/** Domain service: buy a new planet or expand a planet's slots. */
export class PlanetService {
  getNewPlanetCost(player: Player): number {
    return getNewPlanetCost(player.planets.length);
  }

  canBuyNewPlanet(player: Player): boolean {
    const cost = this.getNewPlanetCost(player);
    return player.coins.gte(cost);
  }

  buyNewPlanet(player: Player): boolean {
    if (!this.canBuyNewPlanet(player)) return false;
    const cost = this.getNewPlanetCost(player);
    player.spendCoins(cost);
    const id = `planet-${player.planets.length + 1}`;
    const name = getPlanetName(player.planets.length);
    player.addPlanet(PlanetEntity.create(id, name));
    return true;
  }

  getAddSlotCost(planet: Planet): number {
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
}
