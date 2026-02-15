import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadSettings, saveSettings } from './settings.js';

describe('settings', () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
    });
  });

  it('loadSettings returns defaults when nothing stored', () => {
    const s = loadSettings();
    expect(s).toEqual({
      starfieldSpeed: 1,
      showOrbitLines: true,
      clickParticles: true,
      compactNumbers: true,
      spaceKeyRepeat: false,
      layout: 'tabs',
      pauseWhenBackground: false,
      reducedMotion: false,
      theme: 'dark',
      soundEnabled: true,
      language: 'en',
    });
  });

  it('loadSettings returns defaults when localStorage is undefined', () => {
    const orig = globalThis.localStorage;
    vi.stubGlobal('localStorage', undefined);
    const s = loadSettings();
    expect(s).toEqual({
      starfieldSpeed: 1,
      showOrbitLines: true,
      clickParticles: true,
      compactNumbers: true,
      spaceKeyRepeat: false,
      layout: 'tabs',
      pauseWhenBackground: false,
      reducedMotion: false,
      theme: 'dark',
      soundEnabled: true,
      language: 'en',
    });
    vi.stubGlobal('localStorage', orig);
  });

  it('loadSettings merges stored values with defaults', () => {
    storage['stellar-miner-settings'] = JSON.stringify({
      starfieldSpeed: 2,
      compactNumbers: false,
    });
    const s = loadSettings();
    expect(s.starfieldSpeed).toBe(2);
    expect(s.compactNumbers).toBe(false);
    expect(s.showOrbitLines).toBe(true);
    expect(s.clickParticles).toBe(true);
    expect(s.spaceKeyRepeat).toBe(false);
    expect(s.layout).toBe('tabs');
  });

  it('loadSettings returns defaults on invalid JSON', () => {
    storage['stellar-miner-settings'] = 'not json';
    const s = loadSettings();
    expect(s).toEqual({
      starfieldSpeed: 1,
      showOrbitLines: true,
      clickParticles: true,
      compactNumbers: true,
      spaceKeyRepeat: false,
      layout: 'tabs',
      pauseWhenBackground: false,
      reducedMotion: false,
      theme: 'dark',
      soundEnabled: true,
      language: 'en',
    });
  });

  it('saveSettings writes to localStorage', () => {
    saveSettings({
      starfieldSpeed: 3,
      showOrbitLines: false,
      clickParticles: false,
      compactNumbers: false,
      spaceKeyRepeat: true,
      layout: 'one-page',
      pauseWhenBackground: false,
      reducedMotion: false,
      theme: 'dark',
      soundEnabled: true,
      language: 'en',
    });
    const raw = storage['stellar-miner-settings'];
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw);
    expect(parsed.starfieldSpeed).toBe(3);
    expect(parsed.showOrbitLines).toBe(false);
  });

  it('saveSettings does nothing when localStorage is undefined', () => {
    const orig = globalThis.localStorage;
    vi.stubGlobal('localStorage', undefined);
    expect(() =>
      saveSettings({
        starfieldSpeed: 1,
        showOrbitLines: true,
        clickParticles: true,
        compactNumbers: true,
        spaceKeyRepeat: false,
        layout: 'tabs',
        pauseWhenBackground: false,
        reducedMotion: false,
        theme: 'dark',
        soundEnabled: true,
        language: 'en',
      })
    ).not.toThrow();
    vi.stubGlobal('localStorage', orig);
  });

  it('saveSettings ignores setItem errors', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('QuotaExceeded');
      },
    });
    expect(() =>
      saveSettings({
        starfieldSpeed: 1,
        showOrbitLines: true,
        clickParticles: true,
        compactNumbers: true,
        spaceKeyRepeat: false,
        layout: 'tabs',
        pauseWhenBackground: false,
        reducedMotion: false,
        theme: 'dark',
        soundEnabled: true,
        language: 'en',
      })
    ).not.toThrow();
  });
});
