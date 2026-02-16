import { describe, it, expect, beforeEach } from 'vitest';
import {
  markPanelHydrated,
  isPanelHydrated,
  getHydratedPanels,
  resetPanelHydration,
} from './lazyPanels.js';

describe('lazyPanels', () => {
  beforeEach(() => {
    resetPanelHydration();
  });

  it('isPanelHydrated returns false for unknown panel', () => {
    expect(isPanelHydrated('unknown')).toBe(false);
  });

  it('markPanelHydrated marks panel as hydrated', () => {
    markPanelHydrated('dashboard');
    expect(isPanelHydrated('dashboard')).toBe(true);
  });

  it('getHydratedPanels returns all hydrated panels', () => {
    markPanelHydrated('dashboard');
    markPanelHydrated('research');
    const panels = getHydratedPanels();
    expect(panels.size).toBe(2);
    expect(panels.has('dashboard')).toBe(true);
    expect(panels.has('research')).toBe(true);
  });

  it('resetPanelHydration clears all hydrated panels', () => {
    markPanelHydrated('dashboard');
    markPanelHydrated('research');
    resetPanelHydration();
    expect(isPanelHydrated('dashboard')).toBe(false);
    expect(isPanelHydrated('research')).toBe(false);
    expect(getHydratedPanels().size).toBe(0);
  });
});
