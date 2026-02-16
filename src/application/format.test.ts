import { describe, it, expect } from 'vitest';
import Decimal from 'break_infinity.js';
import { formatNumber } from './format.js';

describe('format', () => {
  it('formats zero and small numbers in compact mode', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(0.8)).toBe('0.8');
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(1000)).toBe('1.0K');
    expect(formatNumber(1500)).toBe('1.5K');
    expect(formatNumber(1_000_000)).toBe('1.0M');
    expect(formatNumber(1_000_000_000)).toBe('1.0B');
  });

  it('formats Decimal in compact mode with suffixes', () => {
    expect(formatNumber(new Decimal(1e12))).toBe('1.0T');
    expect(formatNumber(new Decimal(2.5e15))).toBe('2.5Qa');
  });

  it('formats very large numbers (suffix or scientific fallback)', () => {
    const d308 = new Decimal('1e308');
    expect(formatNumber(d308).length).toBeGreaterThan(0);
    expect(formatNumber(d308)).toBeDefined();
    const d400 = new Decimal('1e400');
    expect(formatNumber(d400)).toBeDefined();
    expect(formatNumber(d400).length).toBeGreaterThan(0);
  });

  it('formatNumber compact uses toString when exponent > 308 and beyond suffix range', () => {
    const beyondSuffix = new Decimal('1e1000');
    expect(formatNumber(beyondSuffix, true)).toBe(beyondSuffix.toString());
  });

  it('formatNumber with compact false uses toLocaleString', () => {
    expect(formatNumber(1234, false)).toBe('1,234');
    expect(formatNumber(0, false)).toBe('0');
    expect(formatNumber(0.8, false)).toBe('0.8');
  });

  it('formatNumber compact false with huge Decimal uses toString', () => {
    const huge = new Decimal('1e400');
    expect(formatNumber(huge, false)).toBe(huge.toString());
  });
});
