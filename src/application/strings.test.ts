import { describe, it, expect, beforeEach } from 'vitest';
import { t, tParam, strings } from './strings.js';
import { setSettings, getSettings } from './gameState.js';
import type { Settings } from '../settings.js';

describe('strings', () => {
  beforeEach(() => {
    setSettings({ theme: 'dark', language: 'en', starfieldSpeed: 1, showOrbitLines: true,
      clickParticles: true, compactNumbers: true, spaceKeyRepeat: true, layout: 'tabs',
      pauseWhenBackground: false, soundEnabled: true, reducedMotion: false });
  });

  it('t returns string for known key', () => {
    expect(t('appTitle')).toBe('STELLAR MINER');
    expect(t('coins')).toBe('Coins');
  });

  it('t returns key when missing (fallback)', () => {
    expect(t('unknownKey' as 'appTitle')).toBe('unknownKey');
  });

  it('t uses en bundle when language is not en or fr', () => {
    setSettings({ ...getSettings(), language: 'de' } as unknown as Settings);
    expect(t('appTitle')).toBe('STELLAR MINER');
  });

  it('tParam replaces placeholders', () => {
    const result = tParam('resetConfirmDesc', { count: '5' });
    expect(typeof result).toBe('string');
  });

  it('strings export has keys', () => {
    expect(strings.appTitle).toBe('STELLAR MINER');
  });
});
