import { getSession, getNextEventAt, getActiveEventInstances, setActiveEventInstances, incrementRunEventsTriggered, addDiscoveredEvent } from './gameState.js';
import { getEventMultiplier } from './gameState.js';
import { getResearchProductionMultiplier } from './research.js';
import { getEventPoolForRun } from './catalogs.js';
import { getRunStats } from './gameState.js';
import { pushActiveEventInstance } from './gameState.js';
import { ACHIEVEMENTS, getUnlockedAchievements } from './achievements.js';
import { getCatalogAchievementName } from './i18nCatalogs.js';
import { t } from './strings.js';
import { updateStats } from '../presentation/statsView.js';
import { renderUpgradeList } from '../presentation/upgradeListView.js';
import { renderPlanetList } from '../presentation/planetListView.js';
import { renderPrestigeSection } from '../presentation/prestigeView.js';
import { saveSession } from './handlersSave.js';
import { showEventToast } from '../presentation/toasts.js';

const DEBUG_PANEL_ID = 'debug-panel';

function getDebugPanel(): HTMLElement | null {
  return document.getElementById(DEBUG_PANEL_ID);
}

function refreshAfterDebugAction(): void {
  saveSession();
  updateStats();
  renderUpgradeList();
  renderPlanetList();
  renderPrestigeSection();
  updateDebugPanel();
}

export function triggerRandomEvent(): void {
  const pool = getEventPoolForRun(getRunStats().runEventsTriggered);
  const event = pool[Math.floor(Math.random() * pool.length)];
  pushActiveEventInstance({ event, endsAt: Date.now() + event.effect.durationMs });
  incrementRunEventsTriggered();
  addDiscoveredEvent(event.id);
  showEventToast(event);
}

export function openDebugMenu(): void {
  const panel = getDebugPanel();
  if (panel) {
    panel.classList.remove('debug-panel--closed');
    panel.setAttribute('aria-hidden', 'false');
    updateDebugPanel();
  }
}

export function closeDebugMenu(): void {
  const panel = getDebugPanel();
  if (panel) {
    panel.classList.add('debug-panel--closed');
    panel.setAttribute('aria-hidden', 'true');
  }
}

export function toggleDebugMenu(): void {
  const panel = getDebugPanel();
  if (!panel) return;
  const isClosed = panel.classList.contains('debug-panel--closed');
  if (isClosed) openDebugMenu();
  else closeDebugMenu();
}

export function updateDebugPanel(): void {
  const statsEl = document.getElementById('debug-stats');
  const session = getSession();
  if (!statsEl || !session) return;
  const player = session.player;
  const eventMult = getEventMultiplier();
  const researchMult = getResearchProductionMultiplier();
  const effectiveRate = player.effectiveProductionRate.mul(eventMult * researchMult);
  const now = Date.now();
  const nextEventAt = getNextEventAt();
  const nextEventIn = Math.max(0, Math.ceil((nextEventAt - now) / 1000));
  const activeCount = getActiveEventInstances().filter((a) => a.endsAt > now).length;

  const rateNum = effectiveRate.toNumber();
  statsEl.innerHTML = `
    <div class="debug-row"><span>${t('debugCoinsRaw')}</span><span>${player.coins.value.toString()}</span></div>
    <div class="debug-row"><span>${t('debugProductionBase')}</span><span>${player.productionRate.value.toString()}/s</span></div>
    <div class="debug-row"><span>${t('debugProductionEffective')}</span><span>${Number.isFinite(rateNum) ? rateNum.toFixed(1) : effectiveRate.toString()}/s</span></div>
    <div class="debug-row"><span>${t('debugEventMult')}</span><span>×${eventMult.toFixed(2)}</span></div>
    <div class="debug-row"><span>${t('debugPrestigeLevel')}</span><span>${player.prestigeLevel}</span></div>
    <div class="debug-row"><span>${t('debugPlanets')}</span><span>${player.planets.length}</span></div>
    <div class="debug-row"><span>${t('debugUpgradesTotal')}</span><span>${player.upgrades.length}</span></div>
    <div class="debug-row"><span>${t('debugNextEventIn')}</span><span>${nextEventIn}s</span></div>
    <div class="debug-row"><span>${t('debugActiveEvents')}</span><span>${activeCount}</span></div>
  `;
}

export function handleDebugAction(action: string): void {
  const session = getSession();
  if (!session) return;
  if (action === 'coins-1k') session.player.addCoins(1000);
  else if (action === 'coins-50k') session.player.addCoins(50_000);
  else if (action === 'trigger-event') triggerRandomEvent();
  else if (action === 'clear-events') setActiveEventInstances([]);
  refreshAfterDebugAction();
}

export function renderAchievementsList(container: HTMLElement): void {
  const unlocked = getUnlockedAchievements();
  container.innerHTML = ACHIEVEMENTS.map((a) => {
    const isUnlocked = unlocked.has(a.id);
    const displayName = isUnlocked ? getCatalogAchievementName(a.id) : (a.secret ? t('achievementSecret') : getCatalogAchievementName(a.id));
    const title = isUnlocked ? displayName : t('achievementLockedTitle');
    const label = isUnlocked ? displayName : (a.secret ? t('achievementSecret') : t('locked'));
    const statusClass = isUnlocked ? 'unlocked' : 'locked';
    const icon = isUnlocked ? '✓' : '?';
    return `<div class="achievement-item achievement-item--${statusClass}" title="${title}">${icon} ${label}</div>`;
  }).join('');
}
