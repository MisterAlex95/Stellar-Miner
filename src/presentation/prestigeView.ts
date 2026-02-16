import { getSession, getSettings } from '../application/gameState.js';
import { formatNumber } from '../application/format.js';
import { PRESTIGE_COIN_THRESHOLD, PRESTIGE_BONUS_PER_LEVEL } from '../domain/constants.js';
import { updateTooltipForButton } from './components/buttonTooltip.js';

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
  const prestigePct = Math.round(player.prestigeLevel * PRESTIGE_BONUS_PER_LEVEL * 100);
  statusEl.textContent =
    player.prestigeLevel > 0
      ? `Prestige level ${player.prestigeLevel} — ${title} (+${prestigePct}% prod). Need ${formatNumber(PRESTIGE_COIN_THRESHOLD, settings.compactNumbers)} ⬡ to prestige again.`
      : `Reach ${formatNumber(PRESTIGE_COIN_THRESHOLD, settings.compactNumbers)} ⬡ to unlock Prestige.`;
  const tooltipPct = Math.round(PRESTIGE_BONUS_PER_LEVEL * 100);
  const tooltipText = canPrestige
    ? `Reset coins and planets to gain +${tooltipPct}% production per prestige level forever`
    : `Reach ${formatNumber(PRESTIGE_COIN_THRESHOLD, settings.compactNumbers)} ⬡ to prestige`;
  updateTooltipForButton(btnEl, tooltipText);
  btnEl.toggleAttribute('disabled', !canPrestige);
  if (canPrestige && !lastCanPrestige) {
    btnEl.classList.add('prestige-btn--just-unlocked');
    setTimeout(() => btnEl.classList.remove('prestige-btn--just-unlocked'), 1500);
  }
  lastCanPrestige = canPrestige;
  const prestigeSummaryEl = document.getElementById('prestige-section-summary');
  if (prestigeSummaryEl) prestigeSummaryEl.textContent = canPrestige ? 'Ready' : (player.prestigeLevel > 0 ? `Lv. ${player.prestigeLevel}` : '');
}
