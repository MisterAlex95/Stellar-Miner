import { describe, it, expect, vi } from 'vitest';
import { withErrorBoundary } from './errorBoundary.js';

describe('errorBoundary', () => {
  it('returns result when fn succeeds', () => {
    const fn = vi.fn(() => 42);
    const wrapped = withErrorBoundary(fn);
    expect(wrapped()).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('rethrows when fn throws', () => {
    vi.stubGlobal('document', { getElementById: () => null });
    const fn = vi.fn(() => {
      throw new Error('test error');
    });
    const wrapped = withErrorBoundary(fn);
    expect(() => wrapped()).toThrow('test error');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
