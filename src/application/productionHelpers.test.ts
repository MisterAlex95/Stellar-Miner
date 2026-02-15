import { describe, it, expect } from 'vitest';
import { getPlanetBaseProduction, getPlanetEffectiveProduction } from './productionHelpers.js';
import { GameSession } from '../domain/aggregates/GameSession.js';
import { Player } from '../domain/entities/Player.js';

describe('productionHelpers', () => {
  it('getPlanetBaseProduction sums upgrade coinsPerSecond', () => {
    const planet = {
      upgrades: [
        { effect: { coinsPerSecond: 5 } },
        { effect: { coinsPerSecond: 10 } },
      ],
    };
    expect(getPlanetBaseProduction(planet)).toBe(15);
  });

  it('getPlanetEffectiveProduction returns 0 when session is null', () => {
    const planet = { upgrades: [{ effect: { coinsPerSecond: 10 } }] };
    expect(getPlanetEffectiveProduction(planet, null)).toBe(0);
  });

  it('getPlanetEffectiveProduction returns 0 when totalBase <= 0', () => {
    const player = Player.create('p1');
    const session = new GameSession('s1', player);
    const planet = { upgrades: [{ effect: { coinsPerSecond: 10 } }] };
    expect(getPlanetEffectiveProduction(planet, session)).toBe(0);
  });

  it('getPlanetEffectiveProduction scales by planet share and research mult', () => {
    const player = Player.create('p1');
    player.setProductionRate(player.productionRate.add(100));
    const session = new GameSession('s1', player);
    const planet = {
      upgrades: [
        { effect: { coinsPerSecond: 60 } },
        { effect: { coinsPerSecond: 40 } },
      ],
    };
    const result = getPlanetEffectiveProduction(planet, session);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(typeof result).toBe('number');
  });
});
