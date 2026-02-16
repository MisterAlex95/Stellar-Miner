import { describe, it, expect, vi, beforeEach } from 'vitest';
import { wireRefreshSubscribers, wireEventBusToRefresh, wireSettingsSubscribers } from './refreshSubscribers.js';
import { sessionStore, settingsStore } from './gameState.js';
import { emit } from './eventBus.js';
import { GameSession } from '../domain/aggregates/GameSession.js';
import { Player } from '../domain/entities/Player.js';

describe('refreshSubscribers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('wireRefreshSubscribers calls refreshViews when session changes', () => {
    const refreshViews = vi.fn();
    wireRefreshSubscribers(refreshViews);
    const player = Player.create('p1');
    const session = new GameSession('s1', player);
    sessionStore.set(session);
    expect(refreshViews).toHaveBeenCalled();
  });

  it('wireEventBusToRefresh triggers notifyRefresh on domain events', async () => {
    const refreshViews = vi.fn();
    wireRefreshSubscribers(refreshViews);
    wireEventBusToRefresh();
    emit('upgrade_purchased', { upgradeId: 'drill-mk1', planetId: 'planet-1' });
    expect(refreshViews).toHaveBeenCalled();
  });

  it('wireSettingsSubscribers calls applySettings when settings change', () => {
    const applySettings = vi.fn();
    wireSettingsSubscribers(applySettings);
    const current = settingsStore.get();
    settingsStore.set({ ...current, theme: current.theme === 'dark' ? 'light' : 'dark' });
    expect(applySettings).toHaveBeenCalled();
  });
});
