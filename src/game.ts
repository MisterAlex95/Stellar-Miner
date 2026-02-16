import './styles/index.css';
import { startStarfield } from './presentation/StarfieldCanvas.js';
import { mount, updateTabMenuVisibility, updateTabMoreActiveState, updateTabBadges, switchTab } from './presentation/mount.js';
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
  addRunCoins,
  getSessionClickCount,
  getSessionCoinsFromClicks,
} from './application/gameState.js';
import { SAVE_INTERVAL_MS, EVENT_INTERVAL_MS, MIN_EVENT_DELAY_MS, FIRST_EVENT_DELAY_MS } from './application/catalogs.js';
import { recordStatsIfDue, loadStatsHistory } from './application/statsHistory.js';
import { getResearchProductionMultiplier, isResearchInProgress } from './application/research.js';
import { updateStats, updateCoinDisplay, updateProductionDisplay, syncCoinDisplay, syncProductionDisplay } from './presentation/statsView.js';
import { updateStatisticsSection } from './presentation/statisticsView.js';
import { renderUpgradeList, updateUpgradeListInPlace } from './presentation/upgradeListView.js';
import { renderPlanetList, updateExpeditionProgress } from './presentation/planetListView.js';
import { renderResearchSection } from './presentation/researchView.js';
import { renderCrewSection } from './presentation/crewView.js';
import { renderPrestigeSection } from './presentation/prestigeView.js';
import { renderQuestSection } from './presentation/questView.js';
import { updateDashboard } from './presentation/dashboardView.js';
import { updateComboIndicator } from './presentation/comboView.js';
import { getPlanetDisplayName } from './application/solarSystems.js';
import { getUnlockedBlocks } from './application/progression.js';
import { maybeShowWelcomeModal, updateProgressionVisibility, updateTabVisibility } from './presentation/progressionView.js';
import { updateDebugPanel, saveSession, triggerRandomEvent, completeExpeditionIfDue } from './application/handlers.js';
import { completeUpgradeInstallations } from './application/upgradeInstallation.js';
import { showOfflineToast } from './presentation/toasts.js';
import { wireRefreshSubscribers } from './application/refreshSubscribers.js';

let lastTime = performance.now();
const QUEST_RENDER_INTERVAL_MS = 150;
const DASHBOARD_UPDATE_INTERVAL_MS = 500;
const EMPIRE_UPDATE_INTERVAL_MS = 1500;
const RESEARCH_UPDATE_INTERVAL_MS = 1500;
let lastQuestRenderMs = 0;
let lastDashboardRenderMs = 0;
let lastEmpireRenderMs = 0;
let lastResearchRenderMs = 0;
let lastStatsUpdateMs = 0;
const STATS_UPDATE_INTERVAL_MS = 100;
let lastEventsUnlocked = false;
let pageWasHidden = document.visibilityState === 'hidden';

function gameLoop(now: number): void {
  if (typeof performance !== 'undefined' && performance.mark) performance.mark('game-loop-start');
  const session = getSession();
  if (!session) {
    requestAnimationFrame(gameLoop);
    return;
  }
  if (document.visibilityState === 'visible') {
    if (pageWasHidden) {
      lastTime = now;
      pageWasHidden = false;
    }
  } else {
    pageWasHidden = true;
  }
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  const canvasDt = document.visibilityState === 'hidden' ? 0 : dt;

  const nowMs = Date.now();
  completeExpeditionIfDue();
  completeUpgradeInstallations(session, nowMs);
  updateExpeditionProgress();
  const eventsUnlocked = getUnlockedBlocks(session).has('events');
  if (eventsUnlocked) {
    if (!lastEventsUnlocked) {
      setNextEventAt(nowMs + FIRST_EVENT_DELAY_MS);
    }
    lastEventsUnlocked = true;
    if (nowMs >= getNextEventAt()) {
      triggerRandomEvent();
      setNextEventAt(nowMs + EVENT_INTERVAL_MS);
    }
  } else {
    lastEventsUnlocked = false;
  }

  const eventMult = getEventMultiplier();
  const researchMult = getResearchProductionMultiplier();
  const rateDec = session.player.effectiveProductionRate.mul(eventMult * researchMult);
  const shouldProduce = !getSettings().pauseWhenBackground || document.visibilityState !== 'hidden';
  if (rateDec.gt(0) && shouldProduce) {
    session.player.addCoins(rateDec.mul(dt));
    const earned = rateDec.mul(dt).toNumber();
    if (Number.isFinite(earned)) addRunCoins(earned);
  }
  updateUpgradeListInPlace();
  if (nowMs - lastStatsUpdateMs >= STATS_UPDATE_INTERVAL_MS) {
    lastStatsUpdateMs = nowMs;
    updateStats();
  }
  recordStatsIfDue(
    nowMs,
    session.player.coins.value,
    rateDec,
    session.player.totalCoinsEver,
    getSessionClickCount(),
    getSessionCoinsFromClicks()
  );
  updateCoinDisplay(dt);
  updateProductionDisplay(dt);
  if (nowMs - lastQuestRenderMs >= QUEST_RENDER_INTERVAL_MS) {
    lastQuestRenderMs = nowMs;
    renderQuestSection();
  }
  const dashboardPanel = document.getElementById('panel-dashboard');
  if (dashboardPanel && !dashboardPanel.hidden && nowMs - lastDashboardRenderMs >= DASHBOARD_UPDATE_INTERVAL_MS) {
    lastDashboardRenderMs = nowMs;
    updateDashboard();
  }
  const empirePanel = document.getElementById('panel-empire');
  if (empirePanel && !empirePanel.hidden && nowMs - lastEmpireRenderMs >= EMPIRE_UPDATE_INTERVAL_MS) {
    lastEmpireRenderMs = nowMs;
    renderCrewSection();
    renderPrestigeSection();
  }
  const researchPanel = document.getElementById('panel-research');
  if (
    researchPanel &&
    !researchPanel.hidden &&
    !isResearchInProgress() &&
    nowMs - lastResearchRenderMs >= RESEARCH_UPDATE_INTERVAL_MS
  ) {
    lastResearchRenderMs = nowMs;
    renderResearchSection();
  }
  const planetViews = session.player.planets.map((p, index) => {
    const upgradeCounts: Record<string, number> = {};
    for (const u of p.upgrades) {
      upgradeCounts[u.id] = (upgradeCounts[u.id] ?? 0) + 1;
    }
    return {
      id: p.id,
      name: p.name,
      displayName: getPlanetDisplayName(p.name, index),
      usedSlots: p.usedSlots,
      maxUpgrades: p.maxUpgrades,
      upgradeCounts,
      visualSeed: p.visualSeed,
    };
  });
  starfieldApi?.update(canvasDt);
  if (document.visibilityState !== 'hidden') starfieldApi?.draw();
  mineZoneCanvasApi?.setPlanets(planetViews);
  mineZoneCanvasApi?.update(canvasDt);
  if (document.visibilityState !== 'hidden') mineZoneCanvasApi?.draw();

  updateComboIndicator();
  updateProgressionVisibility();
  updateTabVisibility(switchTab);
  updateTabMenuVisibility();
  updateTabBadges();
  updateTabMoreActiveState();
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => updateStatisticsSection(), { timeout: 100 });
  } else {
    updateStatisticsSection();
  }

  const debugPanel = document.getElementById('debug-panel');
  if (debugPanel && !debugPanel.classList.contains('debug-panel--closed')) {
    updateDebugPanel();
  }

  requestAnimationFrame(gameLoop);
}

function createRefreshViews(): () => void {
  return () => {
    saveSession();
    updateStats();
    renderUpgradeList();
    renderQuestSection();
    renderCrewSection();
    renderPrestigeSection();
    renderPlanetList();
    updateDashboard();
  };
}

async function init(): Promise<void> {
  const session = await getOrCreateSession();
  setSession(session);
  loadStatsHistory();
  wireRefreshSubscribers(createRefreshViews());
  const offlineCoins = saveLoad.getLastOfflineCoins();
  const offlineHours = saveLoad.getLastOfflineHours();
  const gameStartTime = Date.now();
  setGameStartTime(gameStartTime);
  setNextEventAt(gameStartTime + MIN_EVENT_DELAY_MS);
  setStarfieldApi(startStarfield(getSettings, getEventContext));
  mount();
  updateTabVisibility(switchTab);
  updateTabMenuVisibility();
  syncCoinDisplay();
  syncProductionDisplay();
  updateStats();
  renderUpgradeList();
  renderPlanetList();
  maybeShowWelcomeModal();
  if (offlineCoins > 0) showOfflineToast(offlineCoins, saveLoad.getLastOfflineWasCapped(), offlineHours > 0 ? offlineHours : undefined);
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
  setInterval(saveSession, SAVE_INTERVAL_MS);
}

init();
