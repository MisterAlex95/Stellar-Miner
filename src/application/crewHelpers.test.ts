import { describe, it, expect } from 'vitest';
import { getAssignedAstronauts } from './crewHelpers.js';
import { GameSession } from '../domain/aggregates/GameSession.js';
import { Player } from '../domain/entities/Player.js';
import { Planet } from '../domain/entities/Planet.js';
import { Coins } from '../domain/value-objects/Coins.js';
import { ProductionRate } from '../domain/value-objects/ProductionRate.js';

describe('crewHelpers', () => {
  it('returns 0 when session is null', () => {
    expect(getAssignedAstronauts(null)).toBe(0);
  });

  it('returns crewAssignedToEquipment from player', () => {
    const player = new Player(
      'p1',
      Coins.from(0),
      ProductionRate.from(0),
      [Planet.create('planet-1', 'Titan')],
      [],
      0,
      0,
      0,
      0,
      2
    );
    const session = new GameSession('s1', player);
    expect(getAssignedAstronauts(session)).toBe(2);
  });
});
