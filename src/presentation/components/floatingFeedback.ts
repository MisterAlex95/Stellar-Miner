/**
 * Shared floating feedback UI: reward and coin popups with a single animation lifecycle.
 */

const REWARD_DURATION_MS = 1200;
const REWARD_EXIT_MS = 400;
const COIN_DURATION_MS = 650;
const COIN_EXIT_MS = 350;
const COIN_COMBO_DURATION_MS = 800;
const COIN_COMBO_EXIT_MS = 350;

export interface FloatingElementOptions {
  content: string;
  className: string;
  activeClass: string;
  left: number;
  top: number;
  parent: HTMLElement;
  durationMs: number;
  exitMs: number;
}

/**
 * Shows a single floating element: append, animate in, then after duration animate out and remove.
 */
function showFloatingElement(options: FloatingElementOptions): void {
  const { content, className, activeClass, left, top, parent, durationMs, exitMs } = options;
  const el = document.createElement('span');
  el.className = className;
  el.textContent = content;
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  parent.appendChild(el);
  requestAnimationFrame(() => el.classList.add(activeClass));
  setTimeout(() => {
    el.classList.remove(activeClass);
    setTimeout(() => el.remove(), exitMs);
  }, durationMs);
}

/**
 * Shows a floating reward label anchored to an element (e.g. quest claim button).
 * Caller provides the formatted text (e.g. "+123 ⬡").
 */
export function showFloatingReward(formattedText: string, anchor: HTMLElement): void {
  const rect = anchor.getBoundingClientRect();
  const left = rect.left + rect.width / 2;
  const top = rect.top + rect.height / 2;
  const parent = document.body;
  showFloatingElement({
    content: formattedText.startsWith('+') ? formattedText : `+${formattedText}`,
    className: 'float-reward',
    activeClass: 'float-reward--active',
    left,
    top,
    parent,
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
 * Caller provides the display text (e.g. "+12" or "★ +12") and optional combo label.
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
  showFloatingElement({
    content: displayText,
    className: baseClass,
    activeClass: 'float-coin--active',
    left,
    top,
    parent: container.floats,
    durationMs: COIN_DURATION_MS,
    exitMs: COIN_EXIT_MS,
  });
  if (options?.comboText) {
    showFloatingElement({
      content: options.comboText,
      className: 'float-coin-combo',
      activeClass: 'float-coin--active',
      left,
      top: top - 12,
      parent: container.floats,
      durationMs: COIN_COMBO_DURATION_MS,
      exitMs: COIN_COMBO_EXIT_MS,
    });
  }
}
