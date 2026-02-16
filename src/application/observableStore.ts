/**
 * Lightweight Observable store for reactive state. Subscribers are notified when the value changes.
 * Use for decoupling state updates from UI updates (push instead of poll).
 */

export type Unsubscribe = () => void;

export interface ObservableStore<T> {
  get(): T;
  set(value: T): void;
  subscribe(listener: (value: T) => void): Unsubscribe;
}

export function createObservableStore<T>(initial: T): ObservableStore<T> {
  let value = initial;
  const listeners: Set<(v: T) => void> = new Set();

  return {
    get() {
      return value;
    },
    set(next: T) {
      if (Object.is(value, next)) return;
      value = next;
      for (const fn of listeners) fn(value);
    },
    subscribe(listener: (value: T) => void): Unsubscribe {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
