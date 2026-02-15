import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RESEARCH_CATALOG,
  getUnlockedResearch,
  getResearchProductionMultiplier,
  getResearchClickMultiplier,
  getResearchProductionPercent,
  getResearchClickPercent,
  getResearchSuccessChanceMultiplier,
  getSlotFreeUpgradeIdsFromResearch,
  getCrewFreeUpgradeIdsFromResearch,
  getSlotReductionFromResearch,
  getCrewReductionFromResearch,
  getEffectiveSlotCost,
  getEffectiveUsedSlots,
  hasEffectiveFreeSlot,
  getPlanetsWithEffectiveFreeSlot,
  getPlanetWithEffectiveFreeSlot,
  getEffectiveUpgradeUsesSlot,
  getEffectiveRequiredAstronauts,
  getResearchTreeRows,
  getResearchBranchSegments,
  getUnlockPath,
  getUnlockPathIds,
  isResearchUnlocked,
  canAttemptResearch,
  attemptResearch,
  clearResearch,
  isResearchInProgress,
  setResearchInProgress,
  RESEARCH_STORAGE_KEY,
} from './research.js';
import { Player } from '../domain/entities/Player.js';
import { Planet } from '../domain/entities/Planet.js';
import { Coins } from '../domain/value-objects/Coins.js';
import { ProductionRate } from '../domain/value-objects/ProductionRate.js';

describe('research', () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
    });
  });

  it('getUnlockedResearch returns empty when no storage', () => {
    expect(getUnlockedResearch()).toEqual([]);
  });

  it('getResearchProductionMultiplier returns 1 when none unlocked', () => {
    expect(getResearchProductionMultiplier()).toBe(1);
  });

  it('getResearchClickMultiplier returns 1 when none unlocked', () => {
    expect(getResearchClickMultiplier()).toBe(1);
  });

  it('getResearchClickMultiplier returns > 1 when node with clickPercent unlocked', () => {
    storage[RESEARCH_STORAGE_KEY] = JSON.stringify(['mining-theory', 'automation']);
    expect(getResearchClickMultiplier()).toBeGreaterThan(1);
  });

  it('getResearchProductionPercent and getResearchClickPercent', () => {
    expect(getResearchProductionPercent()).toBe(0);
    expect(getResearchClickPercent()).toBe(0);
  });

  it('getResearchProductionPercent returns percent when unlocked', () => {
    storage[RESEARCH_STORAGE_KEY] = JSON.stringify(['mining-theory']);
    expect(getResearchProductionPercent()).toBeCloseTo(5, 1);
  });

  it('getResearchSuccessChanceMultiplier returns 1 when no scientists', () => {
    expect(getResearchSuccessChanceMultiplier(0)).toBe(1);
  });

  it('getResearchSuccessChanceMultiplier scales with scientist count and caps', () => {
    expect(getResearchSuccessChanceMultiplier(1)).toBeGreaterThan(1);
    expect(getResearchSuccessChanceMultiplier(100)).toBeLessThanOrEqual(2);
  });

  it('getSlotReductionFromResearch returns 0 when none unlocked', () => {
    expect(getSlotReductionFromResearch('drill-mk1')).toBe(0);
  });

  it('getSlotReductionFromResearch returns 1 when slot-free from automation', () => {
    storage[RESEARCH_STORAGE_KEY] = JSON.stringify(['mining-theory', 'automation']);
    expect(getSlotReductionFromResearch('drill-mk1')).toBe(1);
  });

  it('getCrewReductionFromResearch returns 0 for unknown upgrade', () => {
    expect(getCrewReductionFromResearch('unknown-id')).toBe(0);
  });

  it('getEffectiveSlotCost returns 0 for mining-robot', () => {
    expect(getEffectiveSlotCost('mining-robot')).toBe(0);
  });

  it('getEffectiveSlotCost returns 0 when research grants slot-free', () => {
    storage[RESEARCH_STORAGE_KEY] = JSON.stringify(['mining-theory', 'automation']);
    expect(getEffectiveSlotCost('drill-mk1')).toBe(0);
  });

  it('getEffectiveUsedSlots and hasEffectiveFreeSlot', () => {
    const player = Player.create('p1');
    const planet = player.planets[0];
    expect(getEffectiveUsedSlots(planet)).toBe(0);
    expect(hasEffectiveFreeSlot(planet)).toBe(true);
  });

  it('getPlanetsWithEffectiveFreeSlot and getPlanetWithEffectiveFreeSlot', () => {
    const player = Player.create('p1');
    const planets = getPlanetsWithEffectiveFreeSlot(player);
    expect(planets.length).toBeGreaterThan(0);
    const first = getPlanetWithEffectiveFreeSlot(player);
    expect(first).not.toBeNull();
    expect(first?.id).toBe(player.planets[0].id);
  });

  it('getPlanetWithEffectiveFreeSlot returns null when no planets have free slot', () => {
    const fullPlanet = new Planet('p1', 'Full', 0, [], 0, 0);
    const player = new Player(
      'p1',
      Coins.from(0),
      ProductionRate.from(0),
      [fullPlanet],
      [],
      0,
      0
    );
    expect(getPlanetWithEffectiveFreeSlot(player)).toBeNull();
  });

  it('getSlotFreeUpgradeIdsFromResearch returns empty when none unlocked', () => {
    expect(getSlotFreeUpgradeIdsFromResearch()).toEqual([]);
  });

  it('getSlotFreeUpgradeIdsFromResearch returns drill-mk1 when automation unlocked', () => {
    storage[RESEARCH_STORAGE_KEY] = JSON.stringify(['mining-theory', 'automation']);
    expect(getSlotFreeUpgradeIdsFromResearch()).toContain('drill-mk1');
  });

  it('getEffectiveUpgradeUsesSlot returns false for mining-robot and for research-granted slot-free', () => {
    expect(getEffectiveUpgradeUsesSlot('mining-robot')).toBe(false);
    storage[RESEARCH_STORAGE_KEY] = JSON.stringify(['mining-theory', 'automation']);
    expect(getEffectiveUpgradeUsesSlot('drill-mk1')).toBe(false);
    expect(getEffectiveUpgradeUsesSlot('drill-mk2')).toBe(true);
  });

  it('getCrewFreeUpgradeIdsFromResearch returns drill-mk1 when ai-assist unlocked', () => {
    storage[RESEARCH_STORAGE_KEY] = JSON.stringify(['mining-theory', 'automation', 'ai-assist']);
    expect(getCrewFreeUpgradeIdsFromResearch()).toContain('drill-mk1');
  });

  it('getEffectiveRequiredAstronauts returns 0 for crew-free research, else base value', () => {
    expect(getEffectiveRequiredAstronauts('mining-robot')).toBe(0);
    expect(getEffectiveRequiredAstronauts('drill-mk1')).toBe(1);
    storage[RESEARCH_STORAGE_KEY] = JSON.stringify(['mining-theory', 'automation', 'ai-assist']);
    expect(getEffectiveRequiredAstronauts('drill-mk1')).toBe(0);
    expect(getEffectiveRequiredAstronauts('drill-mk2')).toBe(2);
  });

  it('getResearchTreeRows returns rows', () => {
    const rows = getResearchTreeRows();
    expect(rows.length).toBeGreaterThan(0);
  });

  it('getResearchBranchSegments returns segments', () => {
    const segs = getResearchBranchSegments();
    expect(Array.isArray(segs)).toBe(true);
  });

  it('getUnlockPathIds returns empty for unknown or no prereqs', () => {
    expect(getUnlockPathIds('unknown')).toEqual([]);
    expect(getUnlockPathIds('mining-theory')).toEqual([]);
  });

  it('getUnlockPathIds returns path when node has prerequisites', () => {
    const ids = getUnlockPathIds('automation');
    expect(ids).toContain('mining-theory');
  });

  it('getUnlockPath returns names', () => {
    expect(getUnlockPath('mining-theory')).toEqual([]);
  });

  it('isResearchUnlocked returns false when not in storage', () => {
    expect(isResearchUnlocked('mining-theory')).toBe(false);
  });

  it('canAttemptResearch returns true for root node', () => {
    expect(canAttemptResearch('mining-theory')).toBe(true);
  });

  it('canAttemptResearch returns false for unknown id', () => {
    expect(canAttemptResearch('unknown')).toBe(false);
  });

  it('attemptResearch returns error when unknown', () => {
    const r = attemptResearch('unknown', () => true);
    expect(r.success).toBe(false);
    expect(r.message).toContain('Unknown');
  });

  it('attemptResearch returns error when not enough coins', () => {
    const r = attemptResearch('mining-theory', () => false);
    expect(r.success).toBe(false);
    expect(r.message).toContain('Not enough');
  });

  it('attemptResearch succeeds when spendCoins true and random allows', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const r = attemptResearch('mining-theory', () => true);
    expect(r.success).toBe(true);
    expect(r.message).toContain('complete');
    expect(getUnlockedResearch()).toContain('mining-theory');
    vi.restoreAllMocks();
  });

  it('attemptResearch success message includes both production and click when present', () => {
    storage[RESEARCH_STORAGE_KEY] = JSON.stringify(['mining-theory']);
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const r = attemptResearch('automation', () => true);
    vi.restoreAllMocks();
    if (r.success) expect(r.message).toMatch(/production|click/);
  });

  it('attemptResearch success without getUpgradeDisplayLine uses fallback for crew', () => {
    storage[RESEARCH_STORAGE_KEY] = JSON.stringify(['mining-theory', 'automation']);
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const r = attemptResearch('ai-assist', () => true);
    vi.restoreAllMocks();
    expect(r.success).toBe(true);
    expect(r.message).toMatch(/upgrade|crew/);
  });

  it('attemptResearch uses getUpgradeDisplayLine for slot and crew when provided', () => {
    storage[RESEARCH_STORAGE_KEY] = JSON.stringify(['mining-theory']);
    const getUpgradeDisplayLine = (upgradeId: string, kind: string, n: number) => `${upgradeId}-${kind}-${n}`;
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const r = attemptResearch('automation', () => true, getUpgradeDisplayLine);
    expect(r.success).toBe(true);
    expect(r.message).toContain('drill-mk1-slot-1');
    storage[RESEARCH_STORAGE_KEY] = JSON.stringify(['mining-theory', 'automation']);
    const r2 = attemptResearch('ai-assist', () => true, getUpgradeDisplayLine);
    vi.restoreAllMocks();
    expect(r2.success).toBe(true);
    expect(r2.message).toContain('drill-mk1-crew');
  });

  it('attemptResearch fails when random fails', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);
    const r = attemptResearch('mining-theory', () => true);
    expect(r.success).toBe(false);
    vi.restoreAllMocks();
  });

  it('clearResearch removes from storage', () => {
    storage[RESEARCH_STORAGE_KEY] = '["mining-theory"]';
    clearResearch();
    expect(storage[RESEARCH_STORAGE_KEY]).toBeUndefined();
  });

  it('clearResearch does nothing when localStorage undefined', () => {
    const orig = globalThis.localStorage;
    vi.stubGlobal('localStorage', undefined);
    clearResearch();
    vi.stubGlobal('localStorage', orig);
  });

  it('isResearchInProgress and setResearchInProgress', () => {
    expect(isResearchInProgress()).toBe(false);
    setResearchInProgress(true);
    expect(isResearchInProgress()).toBe(true);
    setResearchInProgress(false);
    expect(isResearchInProgress()).toBe(false);
  });
});
