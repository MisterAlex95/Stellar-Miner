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
}

export const useFloatingFeedbackStore = defineStore('floatingFeedback', {
  state: () => ({
    items: [] as FloatItem[],
    nextId: 0,
  }),
  actions: {
    push(item: Omit<FloatItem, 'id'>): number {
      const id = ++this.nextId;
      this.items.push({ ...item, id });
      const totalMs = item.durationMs + item.exitMs;
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
