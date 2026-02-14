/** Domain event: triggered when player activates prestige. */
export type PrestigeActivated = {
  type: 'PrestigeActivated';
  playerId: string;
  newPrestigeLevel: number;
};

export function createPrestigeActivated(
  playerId: string,
  newPrestigeLevel: number
): PrestigeActivated {
  return { type: 'PrestigeActivated', playerId, newPrestigeLevel };
}
