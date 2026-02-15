import { describe, it, expect } from 'vitest';
import { formatNumber } from './format.js';

describe('format', () => {
  it('formats numbers in compact mode by default', () => {
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(1000)).toBe('1.0K');
    expect(formatNumber(1500)).toBe('1.5K');
    expect(formatNumber(1_000_000)).toBe('1.0M');
    expect(formatNumber(1_000_000_000)).toBe('1.0B');
  });

  it('formatNumber with compact false uses toLocaleString', () => {
    expect(formatNumber(1234, false)).toBe('1,234');
    expect(formatNumber(0, false)).toBe('0');
  });
});
