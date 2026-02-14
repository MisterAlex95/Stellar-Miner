import { describe, it, expect } from 'vitest';
import { Coins } from './Coins.js';

describe('Coins', () => {
  it('creates with non-negative finite value', () => {
    expect(new Coins(0).value).toBe(0);
    expect(new Coins(100).value).toBe(100);
  });

  it('throws when value is negative', () => {
    expect(() => new Coins(-1)).toThrow('Coins must be a non-negative finite number');
  });

  it('throws when value is not finite', () => {
    expect(() => new Coins(Number.NaN)).toThrow('Coins must be a non-negative finite number');
    expect(() => new Coins(Infinity)).toThrow('Coins must be a non-negative finite number');
  });

  it('add returns new Coins with sum', () => {
    const a = new Coins(10);
    const b = a.add(5);
    expect(a.value).toBe(10);
    expect(b.value).toBe(15);
  });

  it('subtract returns new Coins with difference', () => {
    const a = new Coins(20);
    const b = a.subtract(7);
    expect(a.value).toBe(20);
    expect(b.value).toBe(13);
  });

  it('subtract clamps to zero when result is small positive', () => {
    const a = new Coins(1);
    const b = a.subtract(1);
    expect(b.value).toBe(0);
  });

  it('subtract throws when result would be negative beyond epsilon', () => {
    const a = new Coins(10);
    expect(() => a.subtract(20)).toThrow('Insufficient coins');
  });

  it('gte returns true when this >= other (Coins)', () => {
    const a = new Coins(50);
    expect(a.gte(new Coins(50))).toBe(true);
    expect(a.gte(new Coins(49))).toBe(true);
    expect(a.gte(new Coins(51))).toBe(false);
  });

  it('gte returns true when this >= number', () => {
    const a = new Coins(50);
    expect(a.gte(50)).toBe(true);
    expect(a.gte(49)).toBe(true);
    expect(a.gte(51)).toBe(false);
  });

  it('gte handles floating point with epsilon', () => {
    const a = new Coins(49.999999);
    expect(a.gte(50)).toBe(true);
  });
});
