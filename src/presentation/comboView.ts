import { getClickTimestamps, updateRunMaxComboMult } from '../application/gameState.js';
import { COMBO_WINDOW_MS, COMBO_MIN_CLICKS, COMBO_MULT_PER_LEVEL, COMBO_MAX_MULT } from '../application/catalogs.js';
import { getCatalogComboName } from '../application/i18nCatalogs.js';

const COMBO_FADING_MS = 700;

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
    updateRunMaxComboMult(mult);
    const name = getCatalogComboName(mult);
    const oldest = recent.length > 0 ? Math.min(...recent) : 0;
    const timeLeft = oldest > 0 ? COMBO_WINDOW_MS - (now - oldest) : COMBO_WINDOW_MS;
    const timeSec = (timeLeft / 1000).toFixed(1);
    el.innerHTML = `<span class="combo-indicator__mult">${name} ×${mult.toFixed(1)}</span> <span class="combo-indicator__time">${timeSec}s</span>`;
    el.setAttribute('data-combo-tier', name.toLowerCase().replace(/\s+/g, '-'));
    el.classList.add('combo-indicator--active');
    el.classList.toggle('combo-indicator--fading', timeLeft < COMBO_FADING_MS && timeLeft > 0);
  } else {
    el.textContent = '';
    el.removeAttribute('data-combo-tier');
    el.classList.remove('combo-indicator--active', 'combo-indicator--fading');
  }
}
