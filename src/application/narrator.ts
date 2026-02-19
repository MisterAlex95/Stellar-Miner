/**
 * One-off narrator/ship-log toasts on milestones. Trigger IDs are checked against
 * narratorShown in state/save; if not yet shown, toast is displayed and trigger is marked shown.
 */

import narratorData from '../data/narrator.json';
import { getNarratorShown, addNarratorShown } from './gameState.js';
import { getPresentationPort } from './uiBridge.js';
import { getPlayTimeStats } from './playTimeStats.js';

type NarratorEntry = { trigger: string; message: string };
const entries: NarratorEntry[] = narratorData as NarratorEntry[];

const PLAY_TIME_TRIGGERS: { trigger: string; ms: number }[] = [
  { trigger: 'play_10min', ms: 10 * 60 * 1000 },
  { trigger: 'play_30min', ms: 30 * 60 * 1000 },
  { trigger: 'play_1h', ms: 60 * 60 * 1000 },
  { trigger: 'play_2h', ms: 2 * 60 * 60 * 1000 },
  { trigger: 'play_5h', ms: 5 * 60 * 60 * 1000 },
  { trigger: 'play_10h', ms: 10 * 60 * 60 * 1000 },
  { trigger: 'play_24h', ms: 24 * 60 * 60 * 1000 },
];

/**
 * If the trigger is defined in narrator.json and not yet in narratorShown,
 * shows the message as a toast and marks the trigger as shown.
 * No-op if already shown or unknown trigger.
 */
export function tryShowNarrator(triggerId: string): void {
  if (typeof triggerId !== 'string') return;
  const shown = getNarratorShown();
  if (shown.includes(triggerId)) return;
  const entry = entries.find((e) => e.trigger === triggerId);
  if (!entry?.message) return;
  addNarratorShown(triggerId);
  getPresentationPort().showToast(entry.message, 'milestone', { duration: 4000 });
}

/**
 * Checks total play time and shows one-off narrator toasts for time milestones (10 min, 1 h, etc.).
 * Call from game loop or on click; only one toast per threshold, persisted in narratorShown.
 */
export function checkPlayTimeNarrators(): void {
  const { totalPlayTimeMs } = getPlayTimeStats();
  for (const { trigger, ms } of PLAY_TIME_TRIGGERS) {
    if (totalPlayTimeMs >= ms) tryShowNarrator(trigger);
  }
}
