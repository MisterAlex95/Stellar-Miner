/** Cost in coins to unlock a new planet. Can scale with number of planets. */
export const NEW_PLANET_BASE_COST = 500;

export function getNewPlanetCost(planetCount: number): number {
  return NEW_PLANET_BASE_COST * (planetCount + 1);
}
