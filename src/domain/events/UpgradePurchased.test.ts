import { describe, it, expect } from 'vitest';
import { createUpgradePurchased } from './UpgradePurchased.js';

describe('UpgradePurchased', () => {
  it('createUpgradePurchased returns event with type, playerId, upgradeId', () => {
    const e = createUpgradePurchased('player-1', 'drill-mk1');
    expect(e).toEqual({
      type: 'UpgradePurchased',
      playerId: 'player-1',
      upgradeId: 'drill-mk1',
    });
  });
});
