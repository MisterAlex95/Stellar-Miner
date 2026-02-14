import { describe, it, expect } from 'vitest';
import { ProductionRate } from './ProductionRate.js';

describe('ProductionRate', () => {
  it('creates with non-negative finite value', () => {
    expect(new ProductionRate(0).value).toBe(0);
    expect(new ProductionRate(10).value).toBe(10);
  });

  it('throws when value is negative', () => {
    expect(() => new ProductionRate(-1)).toThrow(
      'ProductionRate must be a non-negative finite number'
    );
  });

  it('throws when value is not finite', () => {
    expect(() => new ProductionRate(Number.NaN)).toThrow(
      'ProductionRate must be a non-negative finite number'
    );
    expect(() => new ProductionRate(Infinity)).toThrow(
      'ProductionRate must be a non-negative finite number'
    );
  });

  it('add returns new ProductionRate with sum', () => {
    const a = new ProductionRate(5);
    const b = a.add(3);
    expect(a.value).toBe(5);
    expect(b.value).toBe(8);
  });

  it('applyMultiplier returns new ProductionRate', () => {
    const a = new ProductionRate(10);
    const b = a.applyMultiplier(2);
    expect(a.value).toBe(10);
    expect(b.value).toBe(20);
  });

  it('applyMultiplier with decimal', () => {
    const a = new ProductionRate(100);
    expect(a.applyMultiplier(0.5).value).toBe(50);
  });
});
