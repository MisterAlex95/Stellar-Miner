import { describe, it, expect } from 'vitest';
import { createThrottledRun } from './runIfDue.js';

describe('runIfDue', () => {
  it('runs callback when condition is true and interval elapsed', () => {
    const run = createThrottledRun(100);
    let count = 0;
    run(0, () => true, () => count++);
    expect(count).toBe(1);
    run(50, () => true, () => count++);
    expect(count).toBe(1);
    run(100, () => true, () => count++);
    expect(count).toBe(2);
  });

  it('does not run when condition is false', () => {
    const run = createThrottledRun(100);
    let count = 0;
    run(0, () => false, () => count++);
    expect(count).toBe(0);
    run(200, () => false, () => count++);
    expect(count).toBe(0);
  });
});
