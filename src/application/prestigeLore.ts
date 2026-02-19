/**
 * Prestige chapter lore: titles and optional quotes per prestige level.
 * Data in src/data/prestigeLore.json.
 */

import prestigeLoreData from '../data/prestigeLore.json';

export type PrestigeLoreEntry = {
  level: number;
  title: string;
  quote?: string;
};

const byLevel = new Map<number, PrestigeLoreEntry>(
  (prestigeLoreData as PrestigeLoreEntry[]).map((e) => [e.level, e])
);

/**
 * Returns the lore entry for a prestige level, or a default title when none is defined.
 */
export function getPrestigeLore(level: number): { title: string; quote?: string } {
  const entry = byLevel.get(level);
  if (entry) return { title: entry.title, quote: entry.quote };
  return { title: `Prestige ${level}` };
}
