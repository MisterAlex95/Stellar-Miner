import { describe, it, expect } from 'vitest';
import { getPrestigeLore } from './prestigeLore.js';

describe('prestigeLore', () => {
  it('returns title and optional quote for a level defined in data', () => {
    const lore = getPrestigeLore(5);
    expect(lore.title).toBe('Veteran of the Belt');
    expect(lore.quote).toBe("You've seen the cycle. You choose it.");
  });

  it('returns default title for level not in data', () => {
    const lore = getPrestigeLore(7);
    expect(lore.title).toBe('Prestige 7');
    expect(lore.quote).toBeUndefined();
  });

  it('returns entry for level 1', () => {
    const lore = getPrestigeLore(1);
    expect(lore.title).toBe('Rebirth');
    expect(lore.quote).toBeDefined();
  });
});
