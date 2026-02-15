import { describe, it, expect } from 'vitest';
import {
  createUpgrade,
  getUnlockedUpgradeTiers,
  getComboName,
  UPGRADE_CATALOG,
  EVENT_CATALOG,
  COMBO_NAMES,
} from './catalogs.js';
import { UpgradeEffect } from '../domain/value-objects/UpgradeEffect.js';

describe('catalogs', () => {
  it('createUpgrade returns Upgrade instance', () => {
    const u = createUpgrade(UPGRADE_CATALOG[0]);
    expect(u.id).toBe('mining-robot');
    expect(u.effect.coinsPerSecond.toNumber()).toBe(1);
  });

  it('getUnlockedUpgradeTiers includes tier+1 for owned', () => {
    const tiers = getUnlockedUpgradeTiers(['mining-robot', 'drill-mk1']);
    expect(tiers.has(1)).toBe(true);
    expect(tiers.has(2)).toBe(true);
    expect(tiers.has(3)).toBe(true);
  });

  it('getUnlockedUpgradeTiers ignores unknown id', () => {
    const tiers = getUnlockedUpgradeTiers(['unknown-id']);
    expect(tiers.size).toBe(1);
    expect(tiers.has(1)).toBe(true);
  });

  it('getComboName returns name for mult >= tier', () => {
    expect(getComboName(1.6)).toBe('Mega');
    expect(getComboName(1.1)).toBe('Combo');
  });

  it('getComboName returns Combo when mult below lowest', () => {
    expect(getComboName(1.0)).toBe('Combo');
  });

  it('EVENT_CATALOG has events', () => {
    expect(EVENT_CATALOG.length).toBeGreaterThan(0);
    expect(EVENT_CATALOG[0].id).toBeDefined();
  });
});
