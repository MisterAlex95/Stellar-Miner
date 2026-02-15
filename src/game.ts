import './game.css';
import { startStarfield } from './presentation/StarfieldCanvas.js';
import { mount } from './presentation/mount.js';
import {
  getOrCreateSession,
  setSession,
  setGameStartTime,
  setNextEventAt,
  getNextEventAt,
  getSession,
  getEventMultiplier,
  getSettings,
  getEventContext,
  saveLoad,
  starfieldApi,
  setStarfieldApi,
  mineZoneCanvasApi,
} from './application/gameState.js';
import { SAVE_INTERVAL_MS, EVENT_INTERVAL_MS, MIN_EVENT_DELAY_MS } from './application/catalogs.js';
import { recordStatsIfDue, loadStatsHistory } from './application/statsHistory.js';
import { updateStats, updateCoinDisplay, updateProductionDisplay, syncCoinDisplay, syncProductionDisplay } from './presentation/statsView.js';
import { updateStatisticsSection } from './presentation/statisticsView.js';
import { renderUpgradeList, updateUpgradeListInPlace } from './presentation/upgradeListView.js';
import { renderPlanetList } from './presentation/planetListView.js';
import { renderQuestSection } from './presentation/questView.js';
import { updateComboIndicator } from './presentation/comboView.js';
import { maybeShowWelcomeModal, updateProgressionVisibility, updateTabVisibility } from './presentation/progressionView.js';
import { switchTab } from './presentation/mount.js';
import { updateDebugPanel } from './application/handlers.js';
import { saveSession } from './application/handlers.js';
import { triggerRandomEvent } from './application/handlers.js';
import { showOfflineToast } from './presentation/toasts.js';

let lastTime = performance.now();
const QUEST_RENDER_INTERVAL_MS = 150;
let lastQuestRenderMs = 0;

function gameLoop(now: number): void {
  const session = getSession();
  if (!session) {
    requestAnimationFrame(gameLoop);
    return;
  }
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  const nowMs = Date.now();
  if (nowMs >= getNextEventAt()) {
    triggerRandomEvent();
    setNextEventAt(nowMs + EVENT_INTERVAL_MS);
  }

  const eventMult = getEventMultiplier();
  const rate = session.player.effectiveProductionRate * eventMult;
  const shouldProduce = !getSettings().pauseWhenBackground || document.visibilityState !== 'hidden';
  if (rate > 0 && shouldProduce) {
    session.player.addCoins(rate * dt);
    updateStats();
    updateUpgradeListInPlace();
  }
  recordStatsIfDue(nowMs, session.player.coins.value, rate, session.player.totalCoinsEver);
  updateCoinDisplay(dt);
  updateProductionDisplay(dt);
  if (nowMs - lastQuestRenderMs >= QUEST_RENDER_INTERVAL_MS) {
    lastQuestRenderMs = nowMs;
    renderQuestSection();
  }
  const planetViews = session.player.planets.map((p) => {
    const upgradeCounts: Record<string, number> = {};
    for (const u of p.upgrades) {
      upgradeCounts[u.id] = (upgradeCounts[u.id] ?? 0) + 1;
    }
    return {
      id: p.id,
      name: p.name,
      usedSlots: p.usedSlots,
      maxUpgrades: p.maxUpgrades,
      upgradeCounts,
    };
  });
  starfieldApi?.update(dt);
  starfieldApi?.draw();
  mineZoneCanvasApi?.setPlanets(planetViews);
  mineZoneCanvasApi?.update(dt);
  mineZoneCanvasApi?.draw();

  updateComboIndicator();
  updateProgressionVisibility();
  updateTabVisibility(switchTab);
  updateStatisticsSection();

  const debugPanel = document.getElementById('debug-panel');
  if (debugPanel && !debugPanel.classList.contains('debug-panel--closed')) {
    updateDebugPanel();
  }

  requestAnimationFrame(gameLoop);
}

async function init(): Promise<void> {
  const session = await getOrCreateSession();
  setSession(session);
  loadStatsHistory();
  const offlineCoins = saveLoad.getLastOfflineCoins();
  const gameStartTime = Date.now();
  setGameStartTime(gameStartTime);
  setNextEventAt(gameStartTime + MIN_EVENT_DELAY_MS);
  setStarfieldApi(startStarfield(getSettings, getEventContext));
  mount();
  updateTabVisibility(switchTab);
  syncCoinDisplay();
  syncProductionDisplay();
  updateStats();
  renderUpgradeList();
  renderPlanetList();
  maybeShowWelcomeModal();
  if (offlineCoins > 0) showOfflineToast(offlineCoins, saveLoad.getLastOfflineWasCapped());
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
  setInterval(saveSession, SAVE_INTERVAL_MS);
}

init();
