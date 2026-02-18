/**
 * Pinia store for toasts. Push from port/domain toasts; ToastContainer renders.
 */
import { defineStore } from 'pinia';

export type ToastVariant =
  | 'achievement'
  | 'milestone'
  | 'negative'
  | 'event-positive'
  | 'offline'
  | 'super-lucky'
  | 'streak'
  | 'daily'
  | 'critical'
  | 'prestige-milestone'
  | '';

export interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
  duration: number;
}

export const useToastStore = defineStore('toast', {
  state: () => ({
    items: [] as ToastItem[],
    nextId: 0,
  }),
  actions: {
    push(message: string, variant: ToastVariant, duration: number): void {
      const id = ++this.nextId;
      this.items.push({ id, message, variant, duration });
      setTimeout(() => {
        const idx = this.items.findIndex((x) => x.id === id);
        if (idx >= 0) this.items.splice(idx, 1);
      }, duration);
    },
  },
});
