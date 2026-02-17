import './styles/index.css';
import { setPresentationPort } from './application/uiBridge.js';
import { createPresentationPort } from './presentation/presentationPortImpl.js';
import { startStarfield } from './presentation/StarfieldCanvas.js';
import { mountVueApp } from './presentation/vue/main.js';
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
  getRunStats,
} from './application/gameState.js';
import { SAVE_INTERVAL_MS, EVENT_INTERVAL_MS, MIN_EVENT_DELAY_MS, FIRST_EVENT_DELAY_MS } from './application/catalogs.js';
import { recordStatsIfDue, loadStatsHistory, getStatsHistory } from './application/statsHistory.js';
import { getResearchProductionMultiplier } from './application/research.js';
import { updateStats, updateCoinDisplay, updateProductionDisplay, syncCoinDisplay, syncProductionDisplay } from './presentation/statsView.js';
import { updateUpgradeListInPlace } from './presentation/upgradeListView.js';
import { renderPlanetList, updateExpeditionProgress } from './presentation/planetListView.js';
import { renderCrewSection } from './presentation/crewView.js';
import { renderPrestigeSection } from './presentation/prestigeView.js';
import { updateQuestProgressStore } from './application/questProgressStore.js';
import { renderQuestSection } from './presentation/questView.js';
import { updateComboIndicator } from './presentation/comboView.js';
import { getPlanetDisplayName } from './application/solarSystems.js';
import { getUnlockedBlocks } from './application/progression.js';
import { maybeShowWelcomeModal, updateProgressionVisibility, updateTabVisibility } from './presentation/progressionView.js';
import { updateDebugPanel, saveSession, triggerRandomEvent, completeExpeditionIfDue } from './application/handlers.js';
import { completeUpgradeInstallations, completeUpgradeUninstallations } from './application/upgradeInstallation.js';
import { showOfflineToast } from './presentation/toasts.js';
import { wireRefreshSubscribers, wireEventBusToRefresh } from './application/refreshSubscribers.js';
import { createThrottledRun } from './application/runIfDue.js';
import { withErrorBoundary } from './application/errorBoundary.js';
import { getElement } from './presentation/components/domUtils.js';
import { isPanelHydrated } from './application/lazyPanels.js';
import { PANEL_IDS, getPanelElementId, type PanelId } from './application/panelConfig.js';
import { updateGameStateBridge } from './presentation/vue/gameStateBridge.js';

let lastTime = performance.now();
const QUEST_RENDER_INTERVAL_MS = 80;
const DASHBOARD_UPDATE_INTERVAL_MS = 500;
const EMPIRE_UPDATE_INTERVAL_MS = 1500;
const RESEARCH_UPDATE_INTERVAL_MS = 1500;
const runQuestIfDue = createThrottledRun(QUEST_RENDER_INTERVAL_MS);
const runDashboardIfDue = createThrottledRun(DASHBOARD_UPDATE_INTERVAL_MS);
const runEmpireIfDue = createThrottledRun(EMPIRE_UPDATE_INTERVAL_MS);
const runResearchIfDue = createThrottledRun(RESEARCH_UPDATE_INTERVAL_MS);
let lastStatsUpdateMs = 0;
const STATS_UPDATE_INTERVAL_MS = 100;
let lastEventsUnlocked = false;
let pageWasHidden = document.visibilityState === 'hidden';

function runProductionTick(session: ReturnType<typeof getSession>, dt: number, nowMs: number): void {
  completeExpeditionIfDue();
  completeUpgradeInstallations(session, nowMs);
  completeUpgradeUninstallations(session, nowMs);
  updateExpeditionProgress();
  const eventsUnlocked = getUnlockedBlocks(session).has('events');
  if (eventsUnlocked) {
    if (!lastEventsUnlocked) setNextEventAt(nowMs + FIRST_EVENT_DELAY_MS);
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
  recordStatsIfDue(nowMs, session.player.coins.value, rateDec, session.player.totalCoinsEver, getSessionClickCount(), getSessionCoinsFromClicks());
  updateCoinDisplay(dt);
  updateProductionDisplay(dt);
}

function runPanelUpdates(nowMs: number): void {
  runQuestIfDue(nowMs, () => true, updateQuestProgressStore);
  // Dashboard, Research, Upgrades: Vue panels watch the bridge and update themselves
  runEmpireIfDue(nowMs, () => !getElement(getPanelElementId('empire'))?.hidden, () => {
    renderCrewSection();
    renderPrestigeSection();
  });
  updateComboIndicator();
  updateProgressionVisibility();
  updateTabVisibility(switchTab);
  updateTabMenuVisibility();
  updateTabBadges();
  updateTabMoreActiveState();
  // Stats panel is Vue-driven; it watches the bridge and updates itself
  const debugPanel = getElement('debug-panel');
  if (debugPanel && !debugPanel.classList.contains('debug-panel--closed')) updateDebugPanel();
}

function runCanvasUpdates(session: ReturnType<typeof getSession>, canvasDt: number): void {
  if (document.visibilityState === 'hidden') return;
  const planetViews = session.player.planets.map((p, index) => {
    const upgradeCounts: Record<string, number> = {};
    for (const u of p.upgrades) upgradeCounts[u.id] = (upgradeCounts[u.id] ?? 0) + 1;
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
  starfieldApi?.draw();
  mineZoneCanvasApi?.setPlanets(planetViews);
  mineZoneCanvasApi?.update(canvasDt);
  mineZoneCanvasApi?.draw();
}

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

  runProductionTick(session, dt, nowMs);
  runPanelUpdates(nowMs);
  runCanvasUpdates(session, canvasDt);
  updateGameStateBridge(getBridgeSnapshot());

  requestAnimationFrame(gameLoop);
}

const PANEL_REFRESH_ACTIONS: Partial<Record<PanelId, () => void>> = {
  empire: renderPlanetList,
  // dashboard, research, upgrades, stats: Vue panels watch the bridge and update themselves
};

function getBridgeSnapshot(): Parameters<typeof updateGameStateBridge>[0] {
  const session = getSession();
  const appEl = document.getElementById('app');
  if (!session) {
    return {
      activeTab: appEl?.getAttribute('data-active-tab') ?? 'mine',
      layout: getSettings().layout,
      coins: 0,
      production: 0,
      planets: [],
      statsHistoryRecent: getStatsHistory('recent'),
      statsHistoryLongTerm: getStatsHistory('longTerm'),
      runStats: getRunStats(),
    };
  }
  const planetViews = session.player.planets.map((p, index) => {
    const upgradeCounts: Record<string, number> = {};
    for (const u of p.upgrades) upgradeCounts[u.id] = (upgradeCounts[u.id] ?? 0) + 1;
    return {
      id: p.id,
      name: p.name,
      displayName: getPlanetDisplayName(p.name, index),
      usedSlots: p.usedSlots,
      maxUpgrades: p.maxUpgrades,
      upgradeCounts,
      visualSeed: p.visualSeed ?? 0,
    };
  });
  return {
    activeTab: appEl?.getAttribute('data-active-tab') ?? 'mine',
    layout: getSettings().layout,
    coins: session.player.coins.toNumber(),
    production: session.player.effectiveProductionRate.toNumber(),
    planets: planetViews,
    statsHistoryRecent: getStatsHistory('recent'),
    statsHistoryLongTerm: getStatsHistory('longTerm'),
    runStats: getRunStats(),
  };
}

function createRefreshViews(): () => void {
  return () => {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark('refresh-start');
    }
    saveSession();
    updateStats();
    updateQuestProgressStore();
    for (const panelId of PANEL_IDS) {
      const action = PANEL_REFRESH_ACTIONS[panelId];
      if (action && isPanelHydrated(panelId)) action();
    }
    updateProgressionVisibility();
    updateTabMenuVisibility();
    updateTabVisibility(switchTab);
    updateTabBadges();
    updateGameStateBridge(getBridgeSnapshot());
    if (typeof performance !== 'undefined' && performance.measure) {
      performance.mark('refresh-end');
      performance.measure('refresh', 'refresh-start', 'refresh-end');
    }
  };
}

async function init(): Promise<void> {
  setPresentationPort(createPresentationPort());
  mountVueApp();
  const legacyRoot = document.getElementById('legacy-root');
  if (!legacyRoot) throw new Error('legacy-root not found after Vue mount');
  const session = await getOrCreateSession();
  setSession(session);
  loadStatsHistory();
  wireRefreshSubscribers(withErrorBoundary(createRefreshViews()));
  wireEventBusToRefresh();
  const offlineCoins = saveLoad.getLastOfflineCoins();
  const offlineHours = saveLoad.getLastOfflineHours();
  const gameStartTime = Date.now();
  setGameStartTime(gameStartTime);
  setNextEventAt(gameStartTime + MIN_EVENT_DELAY_MS);
  setStarfieldApi(startStarfield(getSettings, getEventContext));
  mount(legacyRoot);
  updateTabVisibility(switchTab);
  updateTabMenuVisibility();
  syncCoinDisplay();
  syncProductionDisplay();
  updateStats();
  maybeShowWelcomeModal();
  if (offlineCoins > 0) showOfflineToast(offlineCoins, saveLoad.getLastOfflineWasCapped(), offlineHours > 0 ? offlineHours : undefined);
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
  setInterval(saveSession, SAVE_INTERVAL_MS);
}

init();
