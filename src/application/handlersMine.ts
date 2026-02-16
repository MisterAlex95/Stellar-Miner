import {
  getSession,
  setClickTimestamps,
  getClickTimestamps,
  setSessionClickCount,
  getSessionClickCount,
  setSessionCoinsFromClicks,
  getSessionCoinsFromClicks,
  mineZoneCanvasApi,
  addRunCoins,
  updateRunMaxComboMult,
} from './gameState.js';
import {
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
  COMBO_MASTER_KEY,
  SHOOTING_STAR_CLICKED_KEY,
} from './catalogs.js';
import { PRESTIGE_CLICK_BONUS_PERCENT_PER_LEVEL } from '../domain/constants.js';
import { getQuestProgress } from './quests.js';
import { incrementTotalClicksEver } from './achievements.js';
import { checkAchievements } from './achievements.js';
import { checkAndShowMilestones } from './milestones.js';
import { updateStats } from '../presentation/statsView.js';
import { renderUpgradeList } from '../presentation/upgradeListView.js';
import { renderQuestSection } from '../presentation/questView.js';
import { updateComboIndicator } from '../presentation/comboView.js';
import {
  showFloatingCoin,
  showSuperLuckyToast,
  showCriticalToast,
  showDailyBonusToast,
} from '../presentation/toasts.js';
import { getResearchClickMultiplier } from './research.js';
import { saveSession } from './handlersSave.js';

const SHAKE_DURATION_MS = 400;

function checkQuestProgress(): void {
  const p = getQuestProgress();
  if (p?.done) renderQuestSection();
}

function refreshAfterMine(): void {
  saveSession();
  updateStats();
  renderUpgradeList();
  renderQuestSection();
}

function triggerShake(): void {
  const app = document.getElementById('app');
  if (!app) return;
  app.classList.remove('app--shake');
  void app.offsetWidth;
  app.classList.add('app--shake');
  setTimeout(() => app.classList.remove('app--shake'), SHAKE_DURATION_MS);
}

function getMineZoneCenter(): { x: number; y: number } {
  const zone = document.getElementById('mine-zone');
  if (!zone) return { x: 0, y: 0 };
  const rect = zone.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
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
      if (last != null && last !== '') {
        session.player.addCoins(DAILY_BONUS_COINS);
        addRunCoins(DAILY_BONUS_COINS);
        showDailyBonusToast();
      }
      localStorage.setItem(LAST_DAILY_BONUS_KEY, today);
    }
  }

  const prestigeLevel = session.player.prestigeLevel;
  const clickBonusesUnlocked = prestigeLevel >= 1;

  const superLucky = clickBonusesUnlocked && Math.random() < SUPER_LUCKY_CHANCE;
  const isLucky = clickBonusesUnlocked && !superLucky && Math.random() < LUCKY_CLICK_CHANCE;
  const isCritical = clickBonusesUnlocked && Math.random() < CRITICAL_CLICK_CHANCE;
  let baseCoins = 1;
  if (superLucky) baseCoins = SUPER_LUCKY_MIN + Math.floor(Math.random() * (SUPER_LUCKY_MAX - SUPER_LUCKY_MIN + 1));
  else if (isLucky) baseCoins = LUCKY_MIN + Math.floor(Math.random() * (LUCKY_MAX - LUCKY_MIN + 1));
  const effectiveComboMult = clickBonusesUnlocked ? comboMult : 1;
  const researchClickMult = getResearchClickMultiplier();
  const prestigeClickMult = prestigeLevel >= 2 ? 1 + (prestigeLevel - 1) * (PRESTIGE_CLICK_BONUS_PERCENT_PER_LEVEL / 100) : 1;
  const rewardResearchMult = prestigeLevel >= 1 ? researchClickMult : 1;
  const rewardPrestigeMult = prestigeLevel >= 2 ? prestigeClickMult : 1;
  const baseWithComboAndCriticalForReward = baseCoins * effectiveComboMult * (isCritical ? 2 : 1);
  const coinsExactForDisplay = Math.max(1, baseCoins * comboMult * (isCritical ? 2 : 1) * researchClickMult * prestigeClickMult);
  const coins = Math.max(1, Math.round(baseWithComboAndCriticalForReward * rewardResearchMult * rewardPrestigeMult));

  session.player.addCoins(coins);
  addRunCoins(coins);
  if (comboMult > 1) updateRunMaxComboMult(comboMult);
  setSessionClickCount(getSessionClickCount() + 1);
  setSessionCoinsFromClicks(getSessionCoinsFromClicks() + coins);
  incrementTotalClicksEver();

  let clientX = e?.clientX;
  let clientY = e?.clientY;
  if (clientX == null || clientY == null) {
    const center = getMineZoneCenter();
    clientX = clientX ?? center.x;
    clientY = clientY ?? center.y;
  }

  showFloatingCoin(coinsExactForDisplay, clientX, clientY, { lucky: isLucky, superLucky, critical: isCritical });
  if (superLucky) showSuperLuckyToast(coins);
  if (isCritical) showCriticalToast(coins);
  const clickResult = mineZoneCanvasApi?.onMineClick(clientX, clientY) as
    { hitShootingStar?: boolean } | undefined;
  if (clickResult?.hitShootingStar && typeof localStorage !== 'undefined') {
    localStorage.setItem(SHOOTING_STAR_CLICKED_KEY, '1');
  }
  if (superLucky || isCritical) triggerShake();
  updateComboIndicator();
  checkAndShowMilestones();
  checkAchievements();
  refreshAfterMine();
  const progress = getQuestProgress();
  if (progress?.done) checkQuestProgress();
}
