import type { Player } from '../entities/Player.js';
import { Planet } from '../entities/Planet.js';
import { getNewPlanetCost } from '../constants.js';

/** Domain service: buy a new planet to get more upgrade slots. */
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
    const name = `Planet ${player.planets.length + 1}`;
    player.addPlanet(Planet.create(id, name));
    return true;
  }
}
