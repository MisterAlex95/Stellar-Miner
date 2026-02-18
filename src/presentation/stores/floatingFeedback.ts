/**
 * Pinia store for floating feedback (rewards, coins). Push from toasts.ts; FloatingFeedback.vue renders.
 */
import { defineStore } from 'pinia';

export type FloatParent = 'body' | 'mine-zone';

export interface FloatItem {
  id: number;
  content: string;
  left: number;
  top: number;
  parent: FloatParent;
  className: string;
  activeClass: string;
  durationMs: number;
  exitMs: number;
  /** Set by store after mount so visibility does not depend on ref callback. */
  active: boolean;
}

export const useFloatingFeedbackStore = defineStore('floatingFeedback', {
  state: () => ({
    items: [] as FloatItem[],
    nextId: 0,
  }),
  actions: {
    push(item: Omit<FloatItem, 'id' | 'active'>): number {
      const id = ++this.nextId;
      const entry: FloatItem = { ...item, id, active: false };
      this.items.push(entry);
      const totalMs = item.durationMs + item.exitMs;
      requestAnimationFrame(() => {
        entry.active = true;
      });
      setTimeout(() => {
        this.remove(id);
      }, totalMs);
      return id;
    },
    remove(id: number): void {
      const idx = this.items.findIndex((x) => x.id === id);
      if (idx >= 0) this.items.splice(idx, 1);
    },
  },
});
