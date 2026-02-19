/**
 * Sprite sheet config for the golden sci-fi icon set (15×10 grid, 150 icons).
 * Each key is mapped to the cell that best matches the concept in the sheet.
 */
import type { ResearchIconKey } from './researchIcons.js';

export const SPRITE_COLS = 14;
export const SPRITE_ROWS = 8;
export const SPRITE_URL = '/icons/icons.png';

/** Map research icon key → sprite cell index (row-major, 0-based). Chosen to match sheet content. */
const KEY_TO_INDEX: Record<ResearchIconKey, number> = {
  scientist: 0,   // beaker (R1C1)
  miner: 1,       // pickaxe striking rock (R1C2)
  pilot: 2,       // rocket (R1C3)
  medic: 3,       // medical cross (R1C4)
  expedition: 5, // compass (R1C6)
  click: 6,       // pointing finger / cursor (R1C7)
  production: 7,  // factory (R1C8)
  refining: 15,   // flask (R2C1)
  neural: 16,     // brain (R2C2)
  secret: 17,     // lock (R2C3)
  research: 18,   // open book (R2C4)
  engineer: 25,   // person with hard hat / gear (R2C11)
};

export function getSpriteIndex(key: ResearchIconKey): number {
  return KEY_TO_INDEX[key] ?? KEY_TO_INDEX.research;
}

/** CSS background-position percentage for the given cell index. */
export function getSpritePosition(index: number): { x: string; y: string } {
  const col = index % SPRITE_COLS;
  const row = Math.floor(index / SPRITE_COLS);
  return {
    x: `${(col / (SPRITE_COLS - 1)) * 100}%`,
    y: `${(row / (SPRITE_ROWS - 1)) * 100}%`,
  };
}
