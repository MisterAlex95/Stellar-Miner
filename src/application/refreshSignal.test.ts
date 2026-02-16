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
});
