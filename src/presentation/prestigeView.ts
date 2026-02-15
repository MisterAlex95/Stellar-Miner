import { getSession, getSettings } from '../application/gameState.js';
import { formatNumber } from '../application/format.js';
import { PRESTIGE_COIN_THRESHOLD } from '../domain/constants.js';

let lastCanPrestige = false;

const PRESTIGE_TITLES: { minLevel: number; name: string }[] = [
  { minLevel: 20, name: 'Legend' },
  { minLevel: 10, name: 'Veteran' },
  { minLevel: 5, name: 'Champion' },
  { minLevel: 2, name: 'Rising' },
  { minLevel: 1, name: 'Rookie' },
  { minLevel: 0, name: 'Newcomer' },
];

function getPrestigeTitle(level: number): string {
  for (const t of PRESTIGE_TITLES) {
    if (level >= t.minLevel) return t.name;
  }
  return PRESTIGE_TITLES[PRESTIGE_TITLES.length - 1].name;
}

export function renderPrestigeSection(): void {
  const session = getSession();
  if (!session) return;
  const player = session.player;
  const settings = getSettings();
  const statusEl = document.getElementById('prestige-status');
  const btnEl = document.getElementById('prestige-btn');
  if (!statusEl || !btnEl) return;
  const canPrestige = player.coins.gte(PRESTIGE_COIN_THRESHOLD);
  const title = getPrestigeTitle(player.prestigeLevel);
  statusEl.textContent =
    player.prestigeLevel > 0
      ? `Prestige level ${player.prestigeLevel} — ${title} (+${player.prestigeLevel * 5}% prod). Need ${formatNumber(PRESTIGE_COIN_THRESHOLD, settings.compactNumbers)} ⬡ to prestige again.`
      : `Reach ${formatNumber(PRESTIGE_COIN_THRESHOLD, settings.compactNumbers)} ⬡ to unlock Prestige.`;
  const wrap = btnEl.parentElement?.classList.contains('btn-tooltip-wrap') ? btnEl.parentElement : null;
  const tooltipText = canPrestige
    ? 'Reset coins and planets to gain +5% production per prestige level forever'
    : `Reach ${formatNumber(PRESTIGE_COIN_THRESHOLD, settings.compactNumbers)} ⬡ to prestige`;
  if (wrap) {
    wrap.setAttribute('title', tooltipText);
  } else {
    btnEl.setAttribute('title', tooltipText);
  }
  btnEl.toggleAttribute('disabled', !canPrestige);
  if (canPrestige && !lastCanPrestige) {
    btnEl.classList.add('prestige-btn--just-unlocked');
    setTimeout(() => btnEl.classList.remove('prestige-btn--just-unlocked'), 1500);
  }
  lastCanPrestige = canPrestige;
}
