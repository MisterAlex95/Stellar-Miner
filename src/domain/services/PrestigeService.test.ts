import { describe, it, expect } from 'vitest';
import { PrestigeService } from './PrestigeService.js';
import { Player } from '../entities/Player.js';
import { Planet } from '../entities/Planet.js';
import { Coins } from '../value-objects/Coins.js';
import { ProductionRate } from '../value-objects/ProductionRate.js';

describe('PrestigeService', () => {
  it('activatePrestige returns event with new prestige level', () => {
    const player = Player.create('p1');
    const service = new PrestigeService();

    const event = service.activatePrestige(player);

    expect(event).toEqual({
      type: 'PrestigeActivated',
      playerId: 'p1',
      newPrestigeLevel: 1,
    });
  });

  it('activatePrestige increments from current prestige level', () => {
    const player = new Player(
      'p1',
      new Coins(0),
      new ProductionRate(0),
      [Planet.create('planet-1', 'Planet 1')],
      [],
      2,
      0
    );
    const service = new PrestigeService();

    const event = service.activatePrestige(player);

    expect(event.newPrestigeLevel).toBe(3);
  });
});
