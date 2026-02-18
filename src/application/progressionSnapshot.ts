/**
 * Progression (section unlocked) snapshot for the game state bridge. Moved from presentation/progressionView.
 */
import { getSession } from './gameState.js';
import { PROGRESSION_BLOCKS, getUnlockedBlocks } from './progression.js';

export type ProgressionSnapshot = {
  sectionUnlocked: Record<string, boolean>;
};

/** Build section unlocked map for Vue bridge (no DOM). */
export function getProgressionSnapshot(): ProgressionSnapshot {
  const session = getSession();
  const unlocked = session ? getUnlockedBlocks(session) : new Set<string>();
  const sectionUnlocked: Record<string, boolean> = {};
  for (const block of PROGRESSION_BLOCKS) {
    if (block.sectionId) sectionUnlocked[block.sectionId] = unlocked.has(block.id);
  }
  return { sectionUnlocked };
}
