import { describe, it, expect } from 'vitest';
import { createPrestigeActivated } from './PrestigeActivated.js';

describe('PrestigeActivated', () => {
  it('createPrestigeActivated returns event with type, playerId, newPrestigeLevel', () => {
    const e = createPrestigeActivated('player-1', 3);
    expect(e).toEqual({
      type: 'PrestigeActivated',
      playerId: 'player-1',
      newPrestigeLevel: 3,
    });
  });
});
