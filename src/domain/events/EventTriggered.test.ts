import { describe, it, expect } from 'vitest';
import { createEventTriggered } from './EventTriggered.js';

describe('EventTriggered', () => {
  it('createEventTriggered returns event with type, eventId, eventName', () => {
    const e = createEventTriggered('meteor-storm', 'Meteor Storm');
    expect(e).toEqual({
      type: 'EventTriggered',
      eventId: 'meteor-storm',
      eventName: 'Meteor Storm',
    });
  });
});
