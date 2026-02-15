import { describe, it, expect, beforeEach } from 'vitest';
import { setSession, getSession, getEventMultiplier, getEventContext } from './gameState.js';
import { GameSession } from '../domain/aggregates/GameSession.js';
import { Player } from '../domain/entities/Player.js';

describe('gameState', () => {
  beforeEach(() => {
    const player = Player.create('player-1');
    const session = new GameSession('s1', player);
    setSession(session);
  });

  it('getSession returns current session', () => {
    const s = getSession();
    expect(s).not.toBeNull();
    expect(s?.player.id).toBe('player-1');
  });

  it('getEventMultiplier returns 1 when no active events', () => {
    expect(getEventMultiplier()).toBe(1);
  });

  it('getEventContext returns empty activeEventIds when no events', () => {
    expect(getEventContext()).toEqual({ activeEventIds: [] });
  });
});
