import { getSession, getSettings } from '../application/gameState.js';
import { formatNumber } from '../application/format.js';
import { PRESTIGE_COIN_THRESHOLD } from '../domain/constants.js';

export function renderPrestigeSection(): void {
  const session = getSession();
  if (!session) return;
  const player = session.player;
  const settings = getSettings();
  const statusEl = document.getElementById('prestige-status');
  const btnEl = document.getElementById('prestige-btn');
  if (!statusEl || !btnEl) return;
  const canPrestige = player.coins.gte(PRESTIGE_COIN_THRESHOLD);
  statusEl.textContent =
    player.prestigeLevel > 0
      ? `Prestige level ${player.prestigeLevel} (+${player.prestigeLevel * 5}% prod). Need ${formatNumber(PRESTIGE_COIN_THRESHOLD, settings.compactNumbers)} ⬡ to prestige again.`
      : `Reach ${formatNumber(PRESTIGE_COIN_THRESHOLD, settings.compactNumbers)} ⬡ to unlock Prestige.`;
  btnEl.toggleAttribute('disabled', !canPrestige);
}
