import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadQuestState, saveQuestState, type QuestState } from './questState.js';
import { QUEST_STORAGE_KEY } from './catalogs.js';

describe('questState', () => {
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

  it('loadQuestState returns quest null when no localStorage', () => {
    const orig = globalThis.localStorage;
    vi.stubGlobal('localStorage', undefined);
    expect(loadQuestState()).toEqual({ quest: null });
    vi.stubGlobal('localStorage', orig);
  });

  it('loadQuestState returns quest null when key missing', () => {
    expect(loadQuestState()).toEqual({ quest: null });
  });

  it('loadQuestState returns quest from valid JSON', () => {
    const quest = { type: 'coins' as const, target: 100, reward: 50, description: 'Reach 100 coins' };
    storage[QUEST_STORAGE_KEY] = JSON.stringify({ quest });
    expect(loadQuestState()).toEqual({ quest });
  });

  it('loadQuestState returns quest null when data has no quest', () => {
    storage[QUEST_STORAGE_KEY] = JSON.stringify({});
    expect(loadQuestState()).toEqual({ quest: null });
  });

  it('loadQuestState returns quest null on parse error', () => {
    storage[QUEST_STORAGE_KEY] = 'invalid json';
    expect(loadQuestState()).toEqual({ quest: null });
  });

  it('saveQuestState writes to localStorage', () => {
    const state: QuestState = {
      quest: { type: 'coins', target: 500, reward: 100, description: 'Reach 500' },
    };
    saveQuestState(state);
    expect(JSON.parse(storage[QUEST_STORAGE_KEY] ?? '{}')).toEqual(state);
  });

  it('saveQuestState does nothing when localStorage undefined', () => {
    const orig = globalThis.localStorage;
    vi.stubGlobal('localStorage', undefined);
    saveQuestState({ quest: null });
    vi.stubGlobal('localStorage', orig);
  });
});
