import { describe, it, expect } from 'vitest';
import { createCoinsMined } from './CoinsMined.js';

describe('CoinsMined', () => {
  it('createCoinsMined returns event with type, playerId, amount, source', () => {
    const e = createCoinsMined('player-1', 5, 'click');
    expect(e).toEqual({
      type: 'CoinsMined',
      playerId: 'player-1',
      amount: 5,
      source: 'click',
    });
  });

  it('supports passive source', () => {
    const e = createCoinsMined('p1', 10, 'passive');
    expect(e.source).toBe('passive');
  });
});
