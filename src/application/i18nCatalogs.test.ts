import { describe, it, expect, beforeEach } from 'vitest';
import { setSettings } from './gameState.js';
import {
  getCatalogUpgradeName,
  getCatalogUpgradeDesc,
  getCatalogResearchName,
  getCatalogResearchDesc,
  getCatalogResearchLore,
  getCatalogEventName,
  getEventFlavor,
  getCatalogAchievementName,
  getCatalogComboName,
  getCatalogPlanetName,
  getCatalogPlanetNameById,
  getCatalogUpgradeGroupLabel,
} from './i18nCatalogs.js';

describe('i18nCatalogs', () => {
  beforeEach(() => {
    setSettings({
      theme: 'dark',
      language: 'en',
      starfieldSpeed: 1,
      showOrbitLines: true,
      clickParticles: true,
      compactNumbers: true,
      spaceKeyRepeat: true,
      layout: 'tabs',
      pauseWhenBackground: false,
      soundEnabled: true,
      reducedMotion: false,
      showStoryToasts: true,
      showTabLabels: true,
    });
  });

  it('getCatalogUpgradeName returns name for id', () => {
    expect(getCatalogUpgradeName('mining-robot')).toBe('Mining Robot');
  });

  it('getCatalogUpgradeDesc returns description', () => {
    expect(getCatalogUpgradeDesc('mining-robot')).toBeDefined();
  });

  it('getCatalogResearchName returns name or fallback', () => {
    expect(getCatalogResearchName('mining-theory')).toBe('Mining Theory');
  });

  it('getCatalogResearchDesc returns description or empty', () => {
    expect(getCatalogResearchDesc('mining-theory')).toBeDefined();
  });

  it('getCatalogResearchLore returns lore when present or empty', () => {
    expect(getCatalogResearchLore('mining-theory')).toContain('belt');
    expect(getCatalogResearchLore('heavy-equipment')).toContain('rigs');
    expect(getCatalogResearchLore('survey-systems')).toContain('map');
  });

  it('getCatalogEventName returns name', () => {
    expect(getCatalogEventName('meteor-storm')).toBeDefined();
  });

  it('getEventFlavor returns lore for known event id', () => {
    expect(getEventFlavor('meteor-storm')).toContain('belt rains ore');
    expect(getEventFlavor('solar-flare')).toBeDefined();
  });

  it('getEventFlavor returns empty string for unknown id', () => {
    expect(getEventFlavor('unknown-event-id')).toBe('');
  });

  it('getCatalogAchievementName returns name', () => {
    expect(getCatalogAchievementName('first-click')).toBeDefined();
  });

  it('getCatalogComboName returns name for mult', () => {
    expect(getCatalogComboName(1.6)).toBeDefined();
    expect(getCatalogComboName(1.0)).toBeDefined();
  });

  it('getCatalogPlanetName returns procedural name by index', () => {
    const name = getCatalogPlanetName(0);
    expect(name).toBeDefined();
    expect(name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
  });

  it('getCatalogPlanetNameById returns same procedural name as getCatalogPlanetName(index)', () => {
    expect(getCatalogPlanetNameById('planet-1')).toBe(getCatalogPlanetName(0));
  });

  it('getCatalogUpgradeGroupLabel returns label or key', () => {
    expect(getCatalogUpgradeGroupLabel('Early')).toBeDefined();
  });

  it('French language returns translated names', () => {
    setSettings({
      theme: 'dark',
      language: 'fr',
      starfieldSpeed: 1,
      showOrbitLines: true,
      clickParticles: true,
      compactNumbers: true,
      spaceKeyRepeat: true,
      layout: 'tabs',
      pauseWhenBackground: false,
      soundEnabled: true,
      reducedMotion: false,
      showStoryToasts: true,
      showTabLabels: true,
    });
    expect(getCatalogUpgradeName('mining-robot')).toBe('Robot minier');
    expect(getCatalogComboName(1.2)).toBeDefined();
  });
});
