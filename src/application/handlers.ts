import { Player } from '../domain/entities/Player.js';
import { GameSession } from '../domain/aggregates/GameSession.js';
import { PRESTIGE_COIN_THRESHOLD, getAstronautCost, getMaxAstronauts } from '../domain/constants.js';
import {
  getSession,
  setSession,
  setActiveEventInstances,
  setQuestState,
  setClickTimestamps,
  getClickTimestamps,
  setSessionClickCount,
  getSessionClickCount,
  setSessionCoinsFromClicks,
  getSessionCoinsFromClicks,
  getEventMultiplier,
  getNextEventAt,
  getActiveEventInstances,
  saveLoad,
  upgradeService,
  planetService,
  mineZoneCanvasApi,
  pushActiveEventInstance,
} from './gameState.js';
import {
  UPGRADE_CATALOG,
  EVENT_CATALOG,
  createUpgrade,
  LAST_DAILY_BONUS_KEY,
  DAILY_BONUS_COINS,
  COMBO_WINDOW_MS,
  COMBO_MIN_CLICKS,
  COMBO_MULT_PER_LEVEL,
  COMBO_MAX_MULT,
  LUCKY_CLICK_CHANCE,
  LUCKY_MIN,
  LUCKY_MAX,
  SUPER_LUCKY_CHANCE,
  SUPER_LUCKY_MIN,
  SUPER_LUCKY_MAX,
  CRITICAL_CLICK_CHANCE,
  QUEST_STORAGE_KEY,
  QUEST_STREAK_KEY,
  QUEST_LAST_CLAIM_KEY,
  MILESTONES_STORAGE_KEY,
  TOTAL_CLICKS_KEY,
  ACHIEVEMENTS_KEY,
  COMBO_MASTER_KEY,
} from './catalogs.js';
import { generateQuest, getQuestProgress, getQuestStreak } from './quests.js';
import { saveQuestState } from './questState.js';
import { incrementTotalClicksEver } from './achievements.js';
import { checkAchievements } from './achievements.js';
import { checkAndShowMilestones } from './milestones.js';
import { updateStats } from '../presentation/statsView.js';
import { renderUpgradeList, getMaxBuyCount, flashUpgradeCard } from '../presentation/upgradeListView.js';
import { renderPlanetList } from '../presentation/planetListView.js';
import { renderResearchSection } from '../presentation/researchView.js';
import { renderHousingSection } from '../presentation/housingView.js';
import { renderPrestigeSection } from '../presentation/prestigeView.js';
import { renderCrewSection } from '../presentation/crewView.js';
import { renderQuestSection } from '../presentation/questView.js';
import { updateComboIndicator } from '../presentation/comboView.js';
import { ACHIEVEMENTS, getUnlockedAchievements } from './achievements.js';
import { clearProgression } from './progression.js';
import {
  showFloatingCoin,
  showSuperLuckyToast,
  showCriticalToast,
  showDailyBonusToast,
  showPrestigeMilestoneToast,
  showFloatingReward,
  showQuestStreakToast,
  showEventToast,
  showMilestoneToast,
  showMiniMilestoneToast,
} from '../presentation/toasts.js';
import { getAssignedAstronauts } from './crewHelpers.js';
import { claimQuest } from './quests.js';
import { emit } from './eventBus.js';
import { attemptResearch, clearResearch, getResearchProductionMultiplier, getResearchClickMultiplier, setResearchInProgress, isResearchInProgress, RESEARCH_CATALOG } from './research.js';
import { t, tParam } from './strings.js';
import { getCatalogResearchName, getCatalogAchievementName } from './i18nCatalogs.js';

const RESEARCH_PROGRESS_DURATION_MS = 2500;

export function saveSession(): void {
  const session = getSession();
  saveLoad.save(session);
}

export function handleExportSave(): void {
  const session = getSession();
  const json = saveLoad.exportSession(session);
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(json).catch(() => {});
  }
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stellar-miner-save-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function handleImportSave(json: string): Promise<boolean> {
  const session = saveLoad.importSession(json);
  if (!session) return false;
  setSession(session);
  await saveLoad.save(session);
  return true;
}

export function handleUpgradeBuy(upgradeId: string, planetId?: string): void {
  const session = getSession();
  if (!session) return;
  const def = UPGRADE_CATALOG.find((d) => d.id === upgradeId);
  if (!def) return;
  const player = session.player;
  const upgrade = createUpgrade(def);
  const targetPlanet = planetId ? player.planets.find((p) => p.id === planetId) : undefined;
  if (!player.coins.gte(upgrade.cost) || !player.getPlanetWithFreeSlot()) return;
  if (planetId && !targetPlanet?.hasFreeSlot()) return;
  if (player.astronautCount < def.requiredAstronauts) return;
  if (!player.spendAstronauts(def.requiredAstronauts)) return;
  upgradeService.purchaseUpgrade(player, upgrade, targetPlanet ?? null);
  emit('upgrade_purchased', { upgradeId, planetId });
  if (player.upgrades.length === 1 && typeof localStorage !== 'undefined') {
    const key = 'stellar-miner-first-upgrade-toast';
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, '1');
      showMiniMilestoneToast('First upgrade!');
    }
  }
  saveSession();
  updateStats();
  renderUpgradeList();
  renderCrewSection();
  renderPlanetList();
  flashUpgradeCard(upgradeId);
  renderQuestSection();
  checkAchievements();
}

export function handleUpgradeBuyMax(upgradeId: string, planetId?: string): void {
  const session = getSession();
  if (!session) return;
  const def = UPGRADE_CATALOG.find((d) => d.id === upgradeId);
  if (!def) return;
  const player = session.player;
  let bought = 0;
  while (player.coins.gte(def.cost) && player.astronautCount >= def.requiredAstronauts) {
    let target = planetId ? player.planets.find((p) => p.id === planetId) : null;
    if (!target?.hasFreeSlot()) target = player.getPlanetWithFreeSlot();
    if (!target) break;
    if (!player.spendAstronauts(def.requiredAstronauts)) break;
    const upgrade = createUpgrade(def);
    upgradeService.purchaseUpgrade(player, upgrade, target);
    bought++;
  }
  if (bought > 0) {
    saveSession();
    updateStats();
    renderUpgradeList();
    renderCrewSection();
    renderPlanetList();
    renderQuestSection();
    checkAchievements();
  }
  renderPlanetList();
}

export function handleBuyNewPlanet(): void {
  const session = getSession();
  if (!session) return;
  const player = session.player;
  if (!planetService.canLaunchExpedition(player)) return;
  const wasFirstPlanet = player.planets.length === 1;
  const outcome = planetService.launchExpedition(player);
  if (outcome.success && outcome.planetName) {
    emit('planet_bought', { planetCount: player.planets.length });
    if (outcome.deaths > 0) {
      showMiniMilestoneToast(`Discovered ${outcome.planetName}! ${outcome.survivors} astronaut${outcome.survivors !== 1 ? 's' : ''} returned. ${outcome.deaths} lost.`);
    } else {
      showMiniMilestoneToast(`Discovered ${outcome.planetName}! All ${outcome.survivors} astronaut${outcome.survivors !== 1 ? 's' : ''} returned.`);
    }
    if (wasFirstPlanet && typeof localStorage !== 'undefined') {
      const key = 'stellar-miner-first-planet-toast';
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '1');
        showMiniMilestoneToast('First new planet!');
      }
    }
  } else {
    showMiniMilestoneToast(`Expedition failed. All ${outcome.totalSent} astronaut${outcome.totalSent !== 1 ? 's' : ''} lost. Planet not discovered.`);
  }
  saveSession();
  updateStats();
  renderUpgradeList();
  renderPlanetList();
  renderCrewSection();
}

export function handleAddSlot(planetId: string): void {
  const session = getSession();
  if (!session) return;
  const planet = session.player.planets.find((p) => p.id === planetId);
  if (!planet || !planetService.canAddSlot(session.player, planet)) return;
  planetService.addSlot(session.player, planet);
  saveSession();
  updateStats();
  renderUpgradeList();
  renderPlanetList();
  renderHousingSection();
}

export function handleBuildHousing(planetId: string): void {
  const session = getSession();
  if (!session) return;
  const planet = session.player.planets.find((p) => p.id === planetId);
  if (!planet || !planetService.canBuildHousing(session.player, planet)) return;
  planetService.buildHousing(session.player, planet);
  saveSession();
  updateStats();
  renderUpgradeList();
  renderPlanetList();
  renderCrewSection();
  renderHousingSection();
}

export function handleHireAstronaut(): void {
  const session = getSession();
  if (!session) return;
  const player = session.player;
  const totalHousing = player.planets.reduce((s, p) => s + p.housingCount, 0);
  const maxCrew = getMaxAstronauts(player.planets.length, totalHousing);
  const totalCrew = player.astronautCount + getAssignedAstronauts(session);
  if (totalCrew >= maxCrew) return;
  const cost = getAstronautCost(player.astronautCount);
  if (!player.hireAstronaut(cost)) return;
  emit('astronaut_hired', { count: player.astronautCount });
  if (player.astronautCount === 1 && typeof localStorage !== 'undefined') {
    const key = 'stellar-miner-first-astronaut-toast';
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, '1');
      showMiniMilestoneToast('First astronaut!');
    }
  }
  saveSession();
  updateStats();
  renderUpgradeList();
  renderPlanetList();
  renderCrewSection();
  renderHousingSection();
  checkAchievements();
}

function checkQuestProgress(): void {
  const p = getQuestProgress();
  if (p?.done) renderQuestSection();
}

export function handleMineClick(e?: MouseEvent): void {
  const session = getSession();
  if (!session) return;

  let clickTimestamps = getClickTimestamps();
  const now = Date.now();
  clickTimestamps = clickTimestamps.filter((t) => t > now - COMBO_WINDOW_MS);
  clickTimestamps.push(now);
  setClickTimestamps(clickTimestamps);

  const comboCount = clickTimestamps.length;
  const comboMult =
    comboCount >= COMBO_MIN_CLICKS
      ? Math.min(COMBO_MAX_MULT, 1 + (comboCount - COMBO_MIN_CLICKS + 1) * COMBO_MULT_PER_LEVEL)
      : 1;
  if (comboMult >= COMBO_MAX_MULT && typeof localStorage !== 'undefined') {
    localStorage.setItem(COMBO_MASTER_KEY, '1');
  }

  const today = new Date().toISOString().slice(0, 10);
  if (typeof localStorage !== 'undefined') {
    const last = localStorage.getItem(LAST_DAILY_BONUS_KEY);
    if (last !== today) {
      session.player.addCoins(DAILY_BONUS_COINS);
      localStorage.setItem(LAST_DAILY_BONUS_KEY, today);
      showDailyBonusToast();
    }
  }

  const superLucky = Math.random() < SUPER_LUCKY_CHANCE;
  const isLucky = !superLucky && Math.random() < LUCKY_CLICK_CHANCE;
  const isCritical = Math.random() < CRITICAL_CLICK_CHANCE;
  let baseCoins = 1;
  if (superLucky) baseCoins = SUPER_LUCKY_MIN + Math.floor(Math.random() * (SUPER_LUCKY_MAX - SUPER_LUCKY_MIN + 1));
  else if (isLucky) baseCoins = LUCKY_MIN + Math.floor(Math.random() * (LUCKY_MAX - LUCKY_MIN + 1));
  let coins = Math.max(1, Math.round(baseCoins * comboMult));
  if (isCritical) coins *= 2;
  coins = Math.max(1, Math.round(coins * getResearchClickMultiplier()));

  session.player.addCoins(coins);
  setSessionClickCount(getSessionClickCount() + 1);
  setSessionCoinsFromClicks(getSessionCoinsFromClicks() + coins);
  incrementTotalClicksEver();

  const clientX = e?.clientX ?? 0;
  const clientY = e?.clientY ?? 0;
  if (e) showFloatingCoin(coins, clientX, clientY, { lucky: isLucky, superLucky, critical: isCritical, comboMult: comboMult > 1 ? comboMult : undefined });
  if (superLucky) showSuperLuckyToast(coins);
  if (isCritical) showCriticalToast(coins);
  mineZoneCanvasApi?.onMineClick(e?.clientX, e?.clientY);
  if (superLucky || isCritical) {
    const app = document.getElementById('app');
    if (app) {
      app.classList.remove('app--shake');
      void app.offsetWidth;
      app.classList.add('app--shake');
      setTimeout(() => app.classList.remove('app--shake'), 400);
    }
  }
  updateComboIndicator();
  checkAndShowMilestones();
  checkAchievements();
  saveSession();
  updateStats();
  renderUpgradeList();
  renderQuestSection();
  const progress = getQuestProgress();
  if (progress?.done) checkQuestProgress();
}

export function openPrestigeConfirmModal(): void {
  const session = getSession();
  const overlay = document.getElementById('prestige-confirm-overlay');
  const descEl = document.getElementById('prestige-confirm-desc');
  if (!overlay) return;
  if (session && descEl) {
    const nextLevel = session.player.prestigeLevel + 1;
    descEl.textContent = tParam('prestigeConfirmDescLevel', { level: nextLevel, pct: nextLevel * 5 });
  }
  overlay.classList.add('prestige-confirm-overlay--open');
  overlay.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => document.getElementById('prestige-confirm-cancel')?.focus());
}

export function closePrestigeConfirmModal(): void {
  const overlay = document.getElementById('prestige-confirm-overlay');
  if (overlay) {
    overlay.classList.remove('prestige-confirm-overlay--open');
    overlay.setAttribute('aria-hidden', 'true');
  }
}

export function confirmPrestige(): void {
  const session = getSession();
  if (!session) return;
  if (!session.player.coins.gte(PRESTIGE_COIN_THRESHOLD)) return;
  closePrestigeConfirmModal();
  const newPlayer = Player.createAfterPrestige(session.player);
  setSession(new GameSession(session.id, newPlayer, []));
  setActiveEventInstances([]);
  const newQuestState = { quest: generateQuest() };
  setQuestState(newQuestState);
  saveQuestState(newQuestState);
  clearResearch();
  saveSession();
  setSessionClickCount(0);
  setSessionCoinsFromClicks(0);
  if (newPlayer.prestigeLevel === 1 && typeof localStorage !== 'undefined') {
    const key = 'stellar-miner-first-prestige-toast';
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, '1');
      showMiniMilestoneToast(t('firstPrestigeToast'));
    }
  }
  emit('prestige', { level: newPlayer.prestigeLevel });
  if ([2, 5, 10, 20].includes(newPlayer.prestigeLevel)) showPrestigeMilestoneToast(newPlayer.prestigeLevel);
  updateStats();
  renderUpgradeList();
  renderPlanetList();
  renderPrestigeSection();
  renderCrewSection();
  renderResearchSection();
  renderQuestSection();
  checkAchievements();
}

export function handleResearchAttempt(id: string): void {
  const session = getSession();
  if (!session) return;
  const result = attemptResearch(id, (amount) => {
    if (!session.player.coins.gte(amount)) return false;
    session.player.spendCoins(amount);
    return true;
  });
  saveSession();
  updateStats();
  renderUpgradeList();
  renderResearchSection();
  setResearchInProgress(false);
  if (result.success) {
    const node = RESEARCH_CATALOG.find((n) => n.id === id);
    const mods: string[] = [];
    if (node?.modifiers.productionPercent) mods.push(`+${node.modifiers.productionPercent}% production`);
    if (node?.modifiers.clickPercent) mods.push(`+${node.modifiers.clickPercent}% click`);
    showMiniMilestoneToast(tParam('researchSuccessFormat', { name: getCatalogResearchName(id), mods: mods.join(', ') }));
  } else if (result.message.includes('failed')) {
    showMiniMilestoneToast(result.message.includes('Coins spent') ? t('researchFailedCoinsSpent') : t('researchFailedTryAgain'));
  }
}

export function startResearchWithProgress(cardEl: HTMLElement, id: string): void {
  if (isResearchInProgress()) return;
  const durationMs = RESEARCH_PROGRESS_DURATION_MS;
  const overlay = document.createElement('div');
  overlay.className = 'research-progress-overlay';
  overlay.setAttribute('aria-live', 'polite');
  overlay.setAttribute('aria-busy', 'true');
  overlay.innerHTML = '<div class="research-progress-track"><div class="research-progress-fill"></div></div><span class="research-progress-label">' + t('researching') + '</span>';
  cardEl.appendChild(overlay);
  cardEl.classList.add('research-card--in-progress');
  const fillEl = overlay.querySelector('.research-progress-fill') as HTMLElement;
  if (fillEl) {
    requestAnimationFrame(() => {
      fillEl.style.width = '100%';
    });
  }
  setResearchInProgress(true);
  setTimeout(() => {
    handleResearchAttempt(id);
  }, durationMs);
}

export function handlePrestige(): void {
  const session = getSession();
  if (!session) return;
  if (!session.player.coins.gte(PRESTIGE_COIN_THRESHOLD)) return;
  openPrestigeConfirmModal();
}

export function handleClaimQuest(): void {
  const streak = getQuestStreak();
  const claimed = claimQuest({
    saveSession,
    updateStats,
    renderUpgradeList,
    renderQuestSection,
    showFloatingReward,
    showQuestStreakToast,
    checkAchievements,
  });
  if (claimed) emit('quest_claimed', { streak });
  if (claimed) {
    const q = document.getElementById('quest-section');
    if (q) {
      q.classList.add('quest-section--claimed');
      setTimeout(() => q.classList.remove('quest-section--claimed'), 600);
    }
  }
}

export function handleResetProgress(): void {
  saveLoad.clearProgress();
  clearProgression();
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(QUEST_STORAGE_KEY);
    localStorage.removeItem(QUEST_STREAK_KEY);
    localStorage.removeItem(QUEST_LAST_CLAIM_KEY);
    localStorage.removeItem(MILESTONES_STORAGE_KEY);
    localStorage.removeItem(TOTAL_CLICKS_KEY);
    localStorage.removeItem(LAST_DAILY_BONUS_KEY);
    localStorage.removeItem(ACHIEVEMENTS_KEY);
    localStorage.removeItem(COMBO_MASTER_KEY);
    ['stellar-miner-first-upgrade-toast', 'stellar-miner-first-planet-toast', 'stellar-miner-first-astronaut-toast', 'stellar-miner-first-prestige-toast'].forEach((k) => localStorage.removeItem(k));
  }
  location.reload();
}

export function triggerRandomEvent(): void {
  const event = EVENT_CATALOG[Math.floor(Math.random() * EVENT_CATALOG.length)];
  pushActiveEventInstance({ event, endsAt: Date.now() + event.effect.durationMs });
  showEventToast(event);
}

export function openSettings(): void {
  const overlay = document.getElementById('settings-overlay');
  if (overlay) {
    overlay.classList.add('settings-overlay--open');
    overlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => document.getElementById('settings-close')?.focus());
  }
}

export function closeSettings(): void {
  const overlay = document.getElementById('settings-overlay');
  if (overlay) {
    overlay.classList.remove('settings-overlay--open');
    overlay.setAttribute('aria-hidden', 'true');
  }
}

export function applySettingsToUI(): void {
  updateStats();
  renderUpgradeList();
  renderPlanetList();
}

export function openResetConfirmModal(): void {
  const overlay = document.getElementById('reset-confirm-overlay');
  if (overlay) {
    overlay.classList.add('reset-confirm-overlay--open');
    overlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => document.getElementById('reset-confirm-cancel')?.focus());
  }
}

export function closeResetConfirmModal(): void {
  const overlay = document.getElementById('reset-confirm-overlay');
  if (overlay) {
    overlay.classList.remove('reset-confirm-overlay--open');
    overlay.setAttribute('aria-hidden', 'true');
  }
}

export function openDebugMenu(): void {
  const panel = document.getElementById('debug-panel');
  if (panel) {
    panel.classList.remove('debug-panel--closed');
    panel.setAttribute('aria-hidden', 'false');
    updateDebugPanel();
  }
}

export function closeDebugMenu(): void {
  const panel = document.getElementById('debug-panel');
  if (panel) {
    panel.classList.add('debug-panel--closed');
    panel.setAttribute('aria-hidden', 'true');
  }
}

export function toggleDebugMenu(): void {
  const panel = document.getElementById('debug-panel');
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
  const effectiveRate = player.effectiveProductionRate * eventMult * researchMult;
  const now = Date.now();
  const nextEventAt = getNextEventAt();
  const nextEventIn = Math.max(0, Math.ceil((nextEventAt - now) / 1000));
  const activeCount = getActiveEventInstances().filter((a) => a.endsAt > now).length;

  statsEl.innerHTML = `
    <div class="debug-row"><span>${t('debugCoinsRaw')}</span><span>${player.coins.value.toLocaleString()}</span></div>
    <div class="debug-row"><span>${t('debugProductionBase')}</span><span>${player.productionRate.value}/s</span></div>
    <div class="debug-row"><span>${t('debugProductionEffective')}</span><span>${effectiveRate.toFixed(1)}/s</span></div>
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
  saveSession();
  updateStats();
  renderUpgradeList();
  renderPlanetList();
  renderPrestigeSection();
  updateDebugPanel();
}

export function renderAchievementsList(container: HTMLElement): void {
  const unlocked = getUnlockedAchievements();
  container.innerHTML = ACHIEVEMENTS.map(
    (a) => {
      const name = getCatalogAchievementName(a.id);
      return `<div class="achievement-item achievement-item--${unlocked.has(a.id) ? 'unlocked' : 'locked'}" title="${unlocked.has(a.id) ? name : '???'}">${unlocked.has(a.id) ? '✓' : '?'} ${unlocked.has(a.id) ? name : t('locked')}</div>`;
    }
  ).join('');
}
