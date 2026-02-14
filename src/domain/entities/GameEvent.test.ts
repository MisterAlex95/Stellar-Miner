import { describe, it, expect } from 'vitest';
import { GameEvent } from './GameEvent.js';
import { EventEffect } from '../value-objects/EventEffect.js';

describe('GameEvent', () => {
  it('stores id, name, effect', () => {
    const effect = new EventEffect(2, 10000);
    const e = new GameEvent('meteor-storm', 'Meteor Storm', effect);
    expect(e.id).toBe('meteor-storm');
    expect(e.name).toBe('Meteor Storm');
    expect(e.effect).toBe(effect);
    expect(e.effect.multiplier).toBe(2);
    expect(e.effect.durationMs).toBe(10000);
  });
});
