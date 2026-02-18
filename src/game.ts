import './styles/index.css';
import { setPresentationPort } from './application/uiBridge.js';
import { createPresentationPort } from './presentation/presentationPortImpl.js';
import { startStarfield } from './presentation/canvas/StarfieldCanvas.js';
import { mountVueApp } from './presentation/main.js';
import { initPresentation } from './presentation/initPresentation.js';
import { switchTab, getTabsSnapshot } from './presentation/mount/tabs.js';
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
import { getStatsSnapshot } from './application/statsSnapshot.js';
import { updateQuestProgressStore } from './application/questProgressStore.js';
import { getQuestSnapshot } from './application/questSnapshot.js';
import { getComboSnapshot } from './application/comboSnapshot.js';
import { getPlanetDisplayName } from './application/solarSystems.js';
import { getUnlockedBlocks } from './application/progression.js';
import { getProgressionSnapshot } from './application/progressionSnapshot.js';
import { maybeShowWelcomeModal, updateProgressionVisibility } from './presentation/modals/intro.js';
import { updateDebugPanel, saveSession, triggerRandomEvent, completeExpeditionIfDue } from './application/handlers.js';
import { completeUpgradeInstallations, completeUpgradeUninstallations } from './application/upgradeInstallation.js';
import { showOfflineToast } from './presentation/toasts/index.js';
import { wireRefreshSubscribers, wireEventBusToRefresh } from './application/refreshSubscribers.js';
import { createThrottledRun } from './application/runIfDue.js';
import { withErrorBoundary } from './application/errorBoundary.js';
import { getPresentationPort } from './application/uiBridge.js';
import { isPanelHydrated } from './application/lazyPanels.js';
import { PANEL_IDS, getPanelElementId, type PanelId } from './application/panelConfig.js';
import { updateGameStateBridge, getGameStateBridge } from './presentation/gameStateBridge.js';

let lastTime = performance.now();
const QUEST_RENDER_INTERVAL_MS = 80;
const DASHBOARD_UPDATE_INTERVAL_MS = 500;
const RESEARCH_UPDATE_INTERVAL_MS = 1500;
const runQuestIfDue = createThrottledRun(QUEST_RENDER_INTERVAL_MS);
const runDashboardIfDue = createThrottledRun(DASHBOARD_UPDATE_INTERVAL_MS);
const runResearchIfDue = createThrottledRun(RESEARCH_UPDATE_INTERVAL_MS);
let lastEventsUnlocked = false;
let pageWasHidden = document.visibilityState === 'hidden';

function runProductionTick(session: ReturnType<typeof getSession>, dt: number, nowMs: number): void {
  completeExpeditionIfDue();
  completeUpgradeInstallations(session, nowMs);
  completeUpgradeUninstallations(session, nowMs);
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
  recordStatsIfDue(nowMs, session.player.coins.value, rateDec, session.player.totalCoinsEver, getSessionClickCount(), getSessionCoinsFromClicks());
}

function runPanelUpdates(nowMs: number): void {
  runQuestIfDue(nowMs, () => true, updateQuestProgressStore);
  // Dashboard, Research, Upgrades: Vue panels watch the bridge and update themselves
  // Empire panel is Vue; combo indicator is driven by bridge
  updateProgressionVisibility();
  // Tabs visibility/badges driven by Vue (bridge.tabs)
  // Stats panel is Vue-driven; it watches the bridge and updates itself
  if (getPresentationPort().getDebugOpen()) updateDebugPanel();
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

// All tab panels (dashboard, empire, research, upgrades, stats) are Vue; they watch the bridge.
const PANEL_REFRESH_ACTIONS: Partial<Record<PanelId, () => void>> = {};

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
      stats: getStatsSnapshot(),
      quest: getQuestSnapshot(),
      combo: getComboSnapshot(),
      tabs: getTabsSnapshot(),
      progression: getProgressionSnapshot(),
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
    stats: getStatsSnapshot(),
    quest: getQuestSnapshot(),
    combo: getComboSnapshot(),
    tabs: getTabsSnapshot(),
    progression: getProgressionSnapshot(),
  };
}

function createRefreshViews(): () => void {
  return () => {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark('refresh-start');
    }
    saveSession();
    updateQuestProgressStore();
    for (const panelId of PANEL_IDS) {
      const action = PANEL_REFRESH_ACTIONS[panelId];
      if (action && isPanelHydrated(panelId)) action();
    }
    updateProgressionVisibility();
    updateGameStateBridge(getBridgeSnapshot());
    const bridge = getGameStateBridge();
    if (!bridge.tabs.visible[bridge.activeTab]) {
      switchTab('mine');
      bridge.setActiveTab('mine');
    }
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
  initPresentation();
  updateGameStateBridge(getBridgeSnapshot());
  const bridge = getGameStateBridge();
  if (!bridge.tabs.visible[bridge.activeTab]) {
    switchTab('mine');
    bridge.setActiveTab('mine');
  }
  maybeShowWelcomeModal();
  if (offlineCoins > 0) showOfflineToast(offlineCoins, saveLoad.getLastOfflineWasCapped(), offlineHours > 0 ? offlineHours : undefined);
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
  setInterval(saveSession, SAVE_INTERVAL_MS);
}

init();
