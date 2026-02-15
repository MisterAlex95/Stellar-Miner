import { getClickTimestamps } from '../application/gameState.js';
import { COMBO_WINDOW_MS, COMBO_MIN_CLICKS, COMBO_MULT_PER_LEVEL, COMBO_MAX_MULT, getComboName } from '../application/catalogs.js';

export function updateComboIndicator(): void {
  const clickTimestamps = getClickTimestamps();
  const now = Date.now();
  const recent = clickTimestamps.filter((t) => t > now - COMBO_WINDOW_MS);
  const comboCount = recent.length;
  const mult =
    comboCount >= COMBO_MIN_CLICKS
      ? Math.min(COMBO_MAX_MULT, 1 + (comboCount - COMBO_MIN_CLICKS + 1) * COMBO_MULT_PER_LEVEL)
      : 0;
  const el = document.getElementById('combo-indicator');
  if (!el) return;
  if (mult > 1) {
    const name = getComboName(mult);
    el.textContent = `${name} ×${mult.toFixed(1)}`;
    el.setAttribute('data-combo-tier', name.toLowerCase().replace(/\s+/g, '-'));
    el.classList.add('combo-indicator--active');
  } else {
    el.removeAttribute('data-combo-tier');
    el.classList.remove('combo-indicator--active');
  }
}
