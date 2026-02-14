/** Domain event: triggered when player buys an upgrade. */
export type UpgradePurchased = {
  type: 'UpgradePurchased';
  playerId: string;
  upgradeId: string;
};

export function createUpgradePurchased(
  playerId: string,
  upgradeId: string
): UpgradePurchased {
  return { type: 'UpgradePurchased', playerId, upgradeId };
}
