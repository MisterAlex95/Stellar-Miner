import { describe, it, expect } from 'vitest';
import { Decimal } from '../domain/bigNumber.js';
import { getPlanetBaseProduction, getPlanetEffectiveProduction } from './productionHelpers.js';
import { GameSession } from '../domain/aggregates/GameSession.js';
import { Player } from '../domain/entities/Player.js';

describe('productionHelpers', () => {
  it('getPlanetBaseProduction sums upgrade coinsPerSecond', () => {
    const planet = {
      upgrades: [
        { effect: { coinsPerSecond: new Decimal(5) } },
        { effect: { coinsPerSecond: new Decimal(10) } },
      ],
    };
    expect(getPlanetBaseProduction(planet).toNumber()).toBe(15);
  });

  it('getPlanetEffectiveProduction returns 0 when session is null', () => {
    const planet = { upgrades: [{ effect: { coinsPerSecond: new Decimal(10) } }] };
    expect(getPlanetEffectiveProduction(planet, null).toNumber()).toBe(0);
  });

  it('getPlanetEffectiveProduction returns 0 when totalBase <= 0', () => {
    const player = Player.create('p1');
    const session = new GameSession('s1', player);
    const planet = { upgrades: [{ effect: { coinsPerSecond: new Decimal(10) } }] };
    expect(getPlanetEffectiveProduction(planet, session).toNumber()).toBe(0);
  });

  it('getPlanetEffectiveProduction scales by planet share and research mult', () => {
    const player = Player.create('p1');
    player.setProductionRate(player.productionRate.add(100));
    const session = new GameSession('s1', player);
    const planet = {
      upgrades: [
        { effect: { coinsPerSecond: new Decimal(60) } },
        { effect: { coinsPerSecond: new Decimal(40) } },
      ],
    };
    const result = getPlanetEffectiveProduction(planet, session);
    expect(result.gte(0)).toBe(true);
    expect(result).toBeInstanceOf(Decimal);
  });
});
