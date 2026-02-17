/**
 * Toast API for non-Vue code (port, toasts.ts). Delegates to Pinia useToastStore.
 */
import { getPinia } from './piniaInstance.js';
import { useToastStore, type ToastVariant } from './stores/toast.js';

export type { ToastVariant } from './stores/toast.js';
export type { ToastItem } from './stores/toast.js';

export function getToastStore(): { items: { id: number; message: string; variant: ToastVariant; duration: number }[] } {
  const pinia = getPinia();
  if (!pinia) return { items: [] };
  return useToastStore(pinia);
}

export function pushToast(message: string, variant: ToastVariant, duration: number): void {
  const pinia = getPinia();
  if (!pinia) return;
  useToastStore(pinia).push(message, variant, duration);
}
