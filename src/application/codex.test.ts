import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCodexEntries,
  isCodexEntryUnlocked,
  unlockCodexEntry,
  checkCodexUnlocks,
  type CodexEntry,
} from './codex.js';
import * as gameState from './gameState.js';
import * as achievements from './achievements.js';

vi.mock('./gameState.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./gameState.js')>();
  return {
    ...actual,
    getSession: vi.fn(),
    getCodexUnlocks: vi.fn(() => [] as string[]),
    addCodexUnlock: vi.fn(),
    getDiscoveredEventIds: vi.fn(() => [] as string[]),
  };
});
vi.mock('./achievements.js', () => ({
  getUnlockedAchievements: vi.fn(() => new Set<string>()),
}));

describe('codex', () => {
  beforeEach(() => {
    vi.mocked(gameState.getCodexUnlocks).mockReturnValue([]);
    vi.mocked(gameState.addCodexUnlock).mockClear();
    vi.mocked(achievements.getUnlockedAchievements).mockReturnValue(new Set());
  });

  it('getCodexEntries returns entries from codex.json', () => {
    const entries = getCodexEntries();
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThan(0);
    entries.forEach((e: CodexEntry) => {
      expect(e).toHaveProperty('id');
      expect(e).toHaveProperty('title');
      expect(e).toHaveProperty('body');
      expect(e).toHaveProperty('unlockCondition');
      expect(['achievement', 'eventSeen', 'planetsCount', 'prestigeLevel']).toContain(e.unlockCondition.type);
    });
  });

  it('isCodexEntryUnlocked returns false when not in unlocks', () => {
    vi.mocked(gameState.getCodexUnlocks).mockReturnValue([]);
    const entry = getCodexEntries()[0];
    expect(isCodexEntryUnlocked(entry.id)).toBe(false);
  });

  it('isCodexEntryUnlocked returns true when id in unlocks', () => {
    const entry = getCodexEntries()[0];
    vi.mocked(gameState.getCodexUnlocks).mockReturnValue([entry.id]);
    expect(isCodexEntryUnlocked(entry.id)).toBe(true);
  });

  it('unlockCodexEntry does not add when already unlocked', () => {
    const entry = getCodexEntries()[0];
    vi.mocked(gameState.getCodexUnlocks).mockReturnValue([entry.id]);
    unlockCodexEntry(entry.id);
    expect(gameState.addCodexUnlock).not.toHaveBeenCalled();
  });

  it('checkCodexUnlocks runs without throwing', () => {
    vi.mocked(gameState.getSession).mockReturnValue(null as unknown as ReturnType<typeof gameState.getSession>);
    expect(() => checkCodexUnlocks()).not.toThrow();
  });

  it('checkCodexUnlocks calls addCodexUnlock when condition is met', () => {
    const entries = getCodexEntries();
    const achievementEntry = entries.find((e) => e.unlockCondition.type === 'achievement');
    if (!achievementEntry) return;
    const aid = (achievementEntry.unlockCondition as { id: string }).id;
    vi.mocked(achievements.getUnlockedAchievements).mockReturnValue(new Set([aid]));
    vi.mocked(gameState.getCodexUnlocks).mockReturnValue([]);
    checkCodexUnlocks();
    expect(gameState.addCodexUnlock).toHaveBeenCalledWith(achievementEntry.id);
  });
});
