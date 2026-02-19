/**
 * Codex / Archive: unlockable lore entries. Unlock conditions are evaluated when
 * achievements, events, planets, or prestige change; unlocked IDs are persisted in save.
 */
import codexData from '../data/codex.json';
import { getSession } from './gameState.js';
import { getCodexUnlocks, addCodexUnlock } from './gameState.js';
import { getUnlockedAchievements } from './achievements.js';
import { getDiscoveredEventIds } from './gameState.js';

export type CodexUnlockCondition =
  | { type: 'achievement'; id: string }
  | { type: 'eventSeen'; id: string }
  | { type: 'planetsCount'; value: number }
  | { type: 'prestigeLevel'; value: number };

export type CodexCategory = 'achievement' | 'event' | 'expedition' | 'planet' | 'prestige' | 'quest' | 'research';

export type CodexEntry = {
  id: string;
  category?: CodexCategory;
  title: string;
  body: string;
  unlockCondition: CodexUnlockCondition;
};

const entries: CodexEntry[] = codexData as CodexEntry[];

function evaluateCondition(condition: CodexUnlockCondition): boolean {
  switch (condition.type) {
    case 'achievement':
      return getUnlockedAchievements().has(condition.id);
    case 'eventSeen':
      return getDiscoveredEventIds().includes(condition.id);
    case 'planetsCount': {
      const session = getSession();
      return (session?.player.planets.length ?? 0) >= condition.value;
    }
    case 'prestigeLevel': {
      const session = getSession();
      return (session?.player.prestigeLevel ?? 0) >= condition.value;
    }
    default:
      return false;
  }
}

/** Unlock a single codex entry by id if not already unlocked. Caller ensures condition is met. */
export function unlockCodexEntry(entryId: string): void {
  const unlocked = getCodexUnlocks();
  if (unlocked.includes(entryId)) return;
  const entry = entries.find((e) => e.id === entryId);
  if (!entry || !evaluateCondition(entry.unlockCondition)) return;
  addCodexUnlock(entryId);
}

/** Evaluate all codex conditions and unlock any entries that are now met. Call after achievement, event seen, planet, prestige. */
export function checkCodexUnlocks(): void {
  const unlocked = getCodexUnlocks();
  for (const entry of entries) {
    if (unlocked.includes(entry.id)) continue;
    if (evaluateCondition(entry.unlockCondition)) addCodexUnlock(entry.id);
  }
}

export function getCodexEntries(): CodexEntry[] {
  return [...entries];
}

export function isCodexEntryUnlocked(entryId: string): boolean {
  return getCodexUnlocks().includes(entryId);
}
