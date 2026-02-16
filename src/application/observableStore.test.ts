import { describe, it, expect } from 'vitest';
import { createObservableStore } from './observableStore.js';

describe('observableStore', () => {
  it('get returns initial value', () => {
    const store = createObservableStore(42);
    expect(store.get()).toBe(42);
  });

  it('set updates value', () => {
    const store = createObservableStore(42);
    store.set(100);
    expect(store.get()).toBe(100);
  });

  it('subscribe notifies on change', () => {
    const store = createObservableStore(0);
    const values: number[] = [];
    const unsub = store.subscribe((v) => values.push(v));
    store.set(1);
    store.set(2);
    expect(values).toEqual([1, 2]);
    unsub();
    store.set(3);
    expect(values).toEqual([1, 2]);
  });

  it('unsubscribe stops notifications', () => {
    const store = createObservableStore(0);
    let count = 0;
    const unsub = store.subscribe(() => count++);
    store.set(1);
    unsub();
    store.set(2);
    expect(count).toBe(1);
  });

  it('does not notify when value is same reference (Object.is)', () => {
    const ref = { x: 1 };
    const store = createObservableStore(ref);
    let count = 0;
    store.subscribe(() => count++);
    store.set(ref);
    expect(count).toBe(0);
  });
});
