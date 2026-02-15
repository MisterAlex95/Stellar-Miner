import { describe, it, expect, vi } from 'vitest';
import { subscribe, emit } from './eventBus.js';

describe('eventBus', () => {
  it('calls subscriber when event is emitted', () => {
    const fn = vi.fn();
    subscribe('upgrade_purchased', fn);
    emit('upgrade_purchased', { upgradeId: 'drill-mk1', planetId: 'planet-1' });
    expect(fn).toHaveBeenCalledWith({ upgradeId: 'drill-mk1', planetId: 'planet-1' });
  });

  it('unsubscribe removes listener', () => {
    const fn = vi.fn();
    const unsub = subscribe('prestige', fn);
    emit('prestige', { level: 1 });
    expect(fn).toHaveBeenCalledTimes(1);
    unsub();
    emit('prestige', { level: 2 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('supports save_success with void payload', () => {
    const fn = vi.fn();
    subscribe('save_success', fn);
    emit('save_success', undefined);
    expect(fn).toHaveBeenCalledWith(undefined);
  });
});
