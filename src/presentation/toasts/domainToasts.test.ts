import { describe, it, expect, beforeEach, vi } from 'vitest';
import { showToast } from './showToast.js';
import { showEventToast } from './domainToasts.js';
import { GameEvent } from '../../domain/entities/GameEvent.js';
import { EventEffect } from '../../domain/value-objects/EventEffect.js';
import { setSettings, getSettings } from '../../application/gameState.js';

vi.mock('./showToast.js');

describe('domainToasts', () => {
  beforeEach(() => {
    setSettings({
      ...getSettings(),
      language: 'en',
    });
    vi.mocked(showToast).mockClear();
  });

  it('showEventToast shows effect line and flavor when event has flavor', () => {
    const event = new GameEvent('meteor-storm', 'Meteor Storm', new EventEffect(2, 35000));
    showEventToast(event);
    expect(showToast).toHaveBeenCalledTimes(1);
    const [message, variant, options] = vi.mocked(showToast).mock.calls[0];
    expect(message).toContain('Meteor Storm');
    expect(message).toContain('×2');
    expect(message).toContain('35s');
    expect(message).toContain('belt rains ore');
    expect(message).toMatch(/\n/);
    expect(variant).toBe('event-positive');
    expect(options?.duration).toBe(4000);
  });

  it('showEventToast with firstTime appends flavor and uses longer duration', () => {
    const event = new GameEvent('meteor-storm', 'Meteor Storm', new EventEffect(2, 35000));
    showEventToast(event, { firstTime: true });
    expect(showToast).toHaveBeenCalledTimes(1);
    const [message, variant, options] = vi.mocked(showToast).mock.calls[0];
    expect(message).toContain('Meteor Storm');
    expect(message).toContain('×2');
    expect(message).toContain('35s');
    expect(message).toContain('belt rains ore');
    expect(message).toMatch(/\n/);
    expect(variant).toBe('event-positive');
    expect(options?.duration).toBe(5500);
  });

  it('showEventToast negative event uses negative variant and duration', () => {
    const event = new GameEvent('dust-storm', 'Dust Storm', new EventEffect(0.58, 32000));
    showEventToast(event);
    const [, variant, options] = vi.mocked(showToast).mock.calls[0];
    expect(variant).toBe('negative');
    expect(options?.duration).toBe(5000);
  });
});
