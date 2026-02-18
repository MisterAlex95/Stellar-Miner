/**
 * Pinia instance set at app bootstrap so stores can be used from non-Vue code (game loop, toasts).
 */
import type { Pinia } from 'pinia';

let pinia: Pinia | null = null;

export function setPinia(p: Pinia): void {
  pinia = p;
}

export function getPinia(): Pinia | null {
  return pinia;
}
