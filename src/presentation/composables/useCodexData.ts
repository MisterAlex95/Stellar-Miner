import { computed } from 'vue';
import { useGameStateStore } from '../stores/gameState.js';
import { getCodexUnlocksWithTime } from '../../application/gameState.js';
import { getCodexEntries, isCodexEntryUnlocked, type CodexCategory } from '../../application/codex.js';

export type CodexEntryDisplay = {
  id: string;
  category: CodexCategory | undefined;
  title: string;
  body: string;
  unlocked: boolean;
};

export type CodexLogEntry = {
  id: string;
  title: string;
  body: string;
  category: CodexCategory | undefined;
  at: number;
};

const CATEGORY_ORDER: CodexCategory[] = ['achievement', 'event', 'expedition', 'planet', 'prestige', 'quest', 'research'];

export function useCodexData() {
  const store = useGameStateStore();
  const entries = computed<CodexEntryDisplay[]>(() => {
    void store.coins;
    const list = getCodexEntries();
    return list.map((e) => ({
      id: e.id,
      category: e.category,
      title: e.title,
      body: e.body,
      unlocked: isCodexEntryUnlocked(e.id),
    }));
  });
  const unlockedEntries = computed(() => entries.value.filter((e) => e.unlocked));
  const entriesByCategory = computed(() => {
    const map = new Map<CodexCategory | 'other', CodexEntryDisplay[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    map.set('other', []);
    for (const e of unlockedEntries.value) {
      const cat: CodexCategory | 'other' = e.category && (CATEGORY_ORDER as readonly string[]).includes(e.category) ? e.category : 'other';
      map.get(cat)!.push(e);
    }
    const result: { category: CodexCategory | 'other'; entries: CodexEntryDisplay[] }[] = [];
    for (const cat of CATEGORY_ORDER) {
      const list = map.get(cat)!;
      if (list.length > 0) result.push({ category: cat, entries: list });
    }
    const other = map.get('other')!;
    if (other.length > 0) result.push({ category: 'other', entries: other });
    return result;
  });
  /** Single chronological log (newest first) for ship-log style display. */
  const logEntries = computed<CodexLogEntry[]>(() => {
    void store.coins;
    const catalog = getCodexEntries();
    const byId = new Map(catalog.map((e) => [e.id, e]));
    const withTime = getCodexUnlocksWithTime();
    return withTime
      .map((r) => {
        const e = byId.get(r.id);
        if (!e) return null;
        return { id: e.id, title: e.title, body: e.body, category: e.category, at: r.at };
      })
      .filter((r): r is CodexLogEntry => r !== null)
      .sort((a, b) => b.at - a.at);
  });
  return { entries, unlockedEntries, entriesByCategory, logEntries };
}
