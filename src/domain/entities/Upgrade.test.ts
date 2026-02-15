import { describe, it, expect } from 'vitest';
import { Upgrade } from './Upgrade.js';
import { UpgradeEffect } from '../value-objects/UpgradeEffect.js';

describe('Upgrade', () => {
  it('stores id, name, cost, effect', () => {
    const effect = new UpgradeEffect(10);
    const u = new Upgrade('drill-mk1', 'Drill Mk.I', 200, effect);
    expect(u.id).toBe('drill-mk1');
    expect(u.name).toBe('Drill Mk.I');
    expect(u.cost.toNumber()).toBe(200);
    expect(u.effect).toBe(effect);
    expect(u.effect.coinsPerSecond.toNumber()).toBe(10);
  });
});
