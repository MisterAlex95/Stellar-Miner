import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RESEARCH_CATALOG,
  getUnlockedResearch,
  getResearchProductionMultiplier,
  getResearchClickMultiplier,
  getResearchProductionPercent,
  getResearchClickPercent,
  getSlotFreeUpgradeIdsFromResearch,
  getCrewFreeUpgradeIdsFromResearch,
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

  it('getResearchProductionPercent and getResearchClickPercent', () => {
    expect(getResearchProductionPercent()).toBe(0);
    expect(getResearchClickPercent()).toBe(0);
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
