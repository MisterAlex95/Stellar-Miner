import { describe, it, expect } from 'vitest';
import {
  createUpgrade,
  getUnlockedUpgradeTiers,
  getUpgradeUsesSlot,
  getComboName,
  getEventPoolForRun,
  EVENT_NEGATIVE_UNLOCK_AFTER,
  UPGRADE_CATALOG,
  EVENT_CATALOG,
  COMBO_NAMES,
} from './catalogs.js';
import { UpgradeEffect } from '../domain/value-objects/UpgradeEffect.js';

describe('catalogs', () => {
  it('createUpgrade returns Upgrade instance', () => {
    const u = createUpgrade(UPGRADE_CATALOG[0]);
    expect(u.id).toBe('mining-robot');
    expect(u.effect.coinsPerSecond.toNumber()).toBe(0.8);
    expect(u.usesSlot).toBe(false);
  });

  it('createUpgrade with options.usesSlot overrides catalog', () => {
    const def = UPGRADE_CATALOG.find((d) => d.id === 'drill-mk1')!;
    expect(createUpgrade(def, 0).usesSlot).toBe(true);
    expect(createUpgrade(def, 0, { usesSlot: false }).usesSlot).toBe(false);
    expect(createUpgrade(def, 0, { usesSlot: true }).usesSlot).toBe(true);
  });

  it('getUpgradeUsesSlot returns false for mining-robot, true for others', () => {
    expect(getUpgradeUsesSlot('mining-robot')).toBe(false);
    expect(getUpgradeUsesSlot('drill-mk1')).toBe(true);
    expect(getUpgradeUsesSlot('unknown')).toBe(true);
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

  it('getEventPoolForRun returns only positive events before negative unlock', () => {
    const pool = getEventPoolForRun(0);
    expect(pool.length).toBeLessThanOrEqual(EVENT_CATALOG.length);
    pool.forEach((e) => expect(e.effect.multiplier).toBeGreaterThanOrEqual(1));
  });

  it('getEventPoolForRun returns full catalog when run events >= threshold', () => {
    const pool = getEventPoolForRun(EVENT_NEGATIVE_UNLOCK_AFTER);
    expect(pool).toEqual(EVENT_CATALOG);
    const poolAbove = getEventPoolForRun(EVENT_NEGATIVE_UNLOCK_AFTER + 1);
    expect(poolAbove).toEqual(EVENT_CATALOG);
  });
});
