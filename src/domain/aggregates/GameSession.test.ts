import { describe, it, expect } from 'vitest';
import { GameSession } from './GameSession.js';
import { Player } from '../entities/Player.js';
import { GameEvent } from '../entities/GameEvent.js';
import { EventEffect } from '../value-objects/EventEffect.js';

describe('GameSession', () => {
  it('holds id and player', () => {
    const player = Player.create('p1');
    const session = new GameSession('session-1', player);
    expect(session.id).toBe('session-1');
    expect(session.player).toBe(player);
    expect(session.activeEvents).toEqual([]);
  });

  it('accepts optional activeEvents', () => {
    const player = Player.create('p1');
    const evt = new GameEvent('e1', 'Event 1', new EventEffect(2, 5000));
    const session = new GameSession('session-1', player, [evt]);
    expect(session.activeEvents).toHaveLength(1);
    expect(session.activeEvents[0].id).toBe('e1');
  });
});
