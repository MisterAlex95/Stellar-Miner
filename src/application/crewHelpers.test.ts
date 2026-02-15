import { describe, it, expect } from 'vitest';
import { getAssignedAstronauts } from './crewHelpers.js';
import { GameSession } from '../domain/aggregates/GameSession.js';
import { Player } from '../domain/entities/Player.js';
import { Upgrade } from '../domain/entities/Upgrade.js';
import { UpgradeEffect } from '../domain/value-objects/UpgradeEffect.js';

describe('crewHelpers', () => {
  it('returns 0 when session is null', () => {
    expect(getAssignedAstronauts(null)).toBe(0);
  });

  it('returns total assigned astronauts from upgrades', () => {
    const player = Player.create('p1');
    const session = new GameSession('s1', player);
    player.planets[0].addUpgrade(new Upgrade('drill-mk1', 'Drill', 500, new UpgradeEffect(10)));
    player.planets[0].addUpgrade(new Upgrade('drill-mk1', 'Drill', 500, new UpgradeEffect(10)));
    expect(getAssignedAstronauts(session)).toBe(2);
  });
});
