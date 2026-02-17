import { getClickTimestamps, updateRunMaxComboMult } from '../application/gameState.js';
import { COMBO_WINDOW_MS, COMBO_MIN_CLICKS, COMBO_MULT_PER_LEVEL, COMBO_MAX_MULT } from '../application/catalogs.js';
import { getCatalogComboName } from '../application/i18nCatalogs.js';
import type { ComboSnapshot } from './vue/stores/gameState.js';

const COMBO_FADING_MS = 700;

/** Build combo indicator snapshot for Vue (no DOM). */
export function getComboSnapshot(): ComboSnapshot {
  const clickTimestamps = getClickTimestamps();
  const now = Date.now();
  const recent = clickTimestamps.filter((t) => t > now - COMBO_WINDOW_MS);
  const comboCount = recent.length;
  const mult =
    comboCount >= COMBO_MIN_CLICKS
      ? Math.min(COMBO_MAX_MULT, 1 + (comboCount - COMBO_MIN_CLICKS + 1) * COMBO_MULT_PER_LEVEL)
      : 0;
  if (mult <= 1) {
    return { active: false, multLabel: '', timeSec: '', dataTier: '', fading: false };
  }
  updateRunMaxComboMult(mult);
  const name = getCatalogComboName(mult);
  const oldest = recent.length > 0 ? Math.min(...recent) : 0;
  const timeLeft = oldest > 0 ? COMBO_WINDOW_MS - (now - oldest) : COMBO_WINDOW_MS;
  const timeSec = (timeLeft / 1000).toFixed(1);
  const dataTier = name.toLowerCase().replace(/\s+/g, '-');
  const fading = timeLeft < COMBO_FADING_MS && timeLeft > 0;
  return {
    active: true,
    multLabel: `${name} ×${mult.toFixed(1)}`,
    timeSec: `${timeSec}s`,
    dataTier,
    fading,
  };
}

