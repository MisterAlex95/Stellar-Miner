/**
 * Floating feedback API. Pushes to Pinia store; FloatingFeedback.vue renders.
 */
import { getPinia } from '../piniaInstance.js';
import { useFloatingFeedbackStore } from '../stores/floatingFeedback.js';

const REWARD_DURATION_MS = 1200;
const REWARD_EXIT_MS = 400;
const COIN_DURATION_MS = 650;
const COIN_EXIT_MS = 350;
const COIN_COMBO_DURATION_MS = 800;
const COIN_COMBO_EXIT_MS = 350;

/**
 * Shows a floating reward label anchored to an element (e.g. quest claim button).
 */
export function showFloatingReward(formattedText: string, anchor: HTMLElement): void {
  const rect = anchor.getBoundingClientRect();
  const left = rect.left + rect.width / 2;
  const top = rect.top + rect.height / 2;
  const content = formattedText.startsWith('+') ? formattedText : `+${formattedText}`;
  const pinia = getPinia();
  if (!pinia) return;
  useFloatingFeedbackStore(pinia).push({
    content,
    className: 'float-reward',
    activeClass: 'float-reward--active',
    left,
    top,
    parent: 'body',
    durationMs: REWARD_DURATION_MS,
    exitMs: REWARD_EXIT_MS,
  });
}

export type FloatCoinVariant = 'default' | 'lucky' | 'super-lucky' | 'critical';

export interface ShowFloatingCoinOptions {
  variant?: FloatCoinVariant;
  comboText?: string;
}

/**
 * Shows a floating coin at the given position inside the mine zone.
 */
export function showFloatingCoin(
  displayText: string,
  clientX: number,
  clientY: number,
  container: { zone: HTMLElement; floats: HTMLElement },
  options?: ShowFloatingCoinOptions
): void {
  const rect = container.zone.getBoundingClientRect();
  const left = clientX - rect.left;
  const top = clientY - rect.top;
  const variant = options?.variant ?? 'default';
  const baseClass = 'float-coin' + (variant !== 'default' ? ` float-coin--${variant}` : '');
  const pinia = getPinia();
  if (!pinia) return;
  const store = useFloatingFeedbackStore(pinia);
  store.push({
    content: displayText,
    className: baseClass,
    activeClass: 'float-coin--active',
    left,
    top,
    parent: 'mine-zone',
    durationMs: COIN_DURATION_MS,
    exitMs: COIN_EXIT_MS,
  });
  if (options?.comboText) {
    store.push({
      content: options.comboText,
      className: 'float-coin-combo',
      activeClass: 'float-coin--active',
      left,
      top: top - 12,
      parent: 'mine-zone',
      durationMs: COIN_COMBO_DURATION_MS,
      exitMs: COIN_COMBO_EXIT_MS,
    });
  }
}

/**
 * Shows a floating coin at fixed viewport coordinates (e.g. when mine zone container is not available).
 */
export function showFloatingCoinFixed(
  displayText: string,
  clientX: number,
  clientY: number,
  options?: ShowFloatingCoinOptions
): void {
  const variant = options?.variant ?? 'default';
  const baseClass = 'float-coin' + (variant !== 'default' ? ` float-coin--${variant}` : '');
  const pinia = getPinia();
  if (!pinia) return;
  const store = useFloatingFeedbackStore(pinia);
  store.push({
    content: displayText,
    className: baseClass,
    activeClass: 'float-coin--active',
    left: clientX,
    top: clientY,
    parent: 'body',
    durationMs: COIN_DURATION_MS,
    exitMs: COIN_EXIT_MS,
  });
}
