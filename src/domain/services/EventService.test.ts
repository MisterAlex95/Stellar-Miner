import { describe, it, expect } from 'vitest';
import { EventService } from './EventService.js';
import { GameEvent } from '../entities/GameEvent.js';
import { EventEffect } from '../value-objects/EventEffect.js';

describe('EventService', () => {
  it('triggerEvent returns EventTriggered with event id and name', () => {
    const gameEvent = new GameEvent(
      'meteor-storm',
      'Meteor Storm',
      new EventEffect(2, 10000)
    );
    const service = new EventService();

    const event = service.triggerEvent(gameEvent);

    expect(event).toEqual({
      type: 'EventTriggered',
      eventId: 'meteor-storm',
      eventName: 'Meteor Storm',
    });
  });
});
