import { describe, it, expect, vi } from 'vitest';
import { subscribeRefresh, notifyRefresh } from './refreshSignal.js';

describe('refreshSignal', () => {
  it('notifyRefresh calls all subscribers', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    subscribeRefresh(fn1);
    subscribeRefresh(fn2);
    notifyRefresh();
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
    notifyRefresh();
    expect(fn1).toHaveBeenCalledTimes(2);
    expect(fn2).toHaveBeenCalledTimes(2);
  });

  it('unsubscribe stops notifications', () => {
    const fn = vi.fn();
    const unsub = subscribeRefresh(fn);
    notifyRefresh();
    expect(fn).toHaveBeenCalledTimes(1);
    unsub();
    notifyRefresh();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('notifyRefresh runs synchronously when requestAnimationFrame is undefined', () => {
    const raf = globalThis.requestAnimationFrame;
    // @ts-expect-error - simulate env without rAF (e.g. Node, SSR)
    globalThis.requestAnimationFrame = undefined;
    try {
      const fn = vi.fn();
      subscribeRefresh(fn);
      notifyRefresh();
      expect(fn).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.requestAnimationFrame = raf;
    }
  });

  it('notifyRefresh uses requestAnimationFrame when available', () => {
    const raf = globalThis.requestAnimationFrame;
    const mockRaf = vi.fn((cb: () => void) => {
      cb();
      return 1;
    });
    // @ts-expect-error - inject mock rAF
    globalThis.requestAnimationFrame = mockRaf;
    try {
      const fn = vi.fn();
      subscribeRefresh(fn);
      notifyRefresh();
      expect(mockRaf).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.requestAnimationFrame = raf;
    }
  });

});
