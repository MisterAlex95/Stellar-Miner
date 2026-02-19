/**
 * Combo indicator snapshot for the game state bridge. Moved from presentation/comboView.
 */
import { getClickTimestamps, updateRunMaxComboMult } from './gameState.js';
import { COMBO_WINDOW_MS, getComboMultFromCount } from './catalogs.js';
import { getCatalogComboName } from './i18nCatalogs.js';

export type ComboSnapshot = {
  active: boolean;
  multLabel: string;
  timeSec: string;
  dataTier: string;
  fading: boolean;
};

const COMBO_FADING_MS = 700;

/** Build combo indicator snapshot for Vue bridge (no DOM). */
export function getComboSnapshot(): ComboSnapshot {
  const clickTimestamps = getClickTimestamps();
  const now = Date.now();
  const recent = clickTimestamps.filter((t) => t > now - COMBO_WINDOW_MS);
  const comboCount = recent.length;
  const mult = getComboMultFromCount(comboCount);
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
