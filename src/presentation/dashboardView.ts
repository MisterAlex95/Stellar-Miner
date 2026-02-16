import Decimal from 'break_infinity.js';
import {
  getSession,
  getSettings,
  getEventMultiplier,
  getActiveEventInstances,
  getNextEventAt,
  getExpeditionEndsAt,
  getRunStats,
  getQuestState,
  planetService,
} from '../application/gameState.js';
import { formatNumber } from '../application/format.js';
import { getQuestProgress } from '../application/quests.js';
import { getNextMilestone, getUnlockedBlocks } from '../application/progression.js';
import {
  getResearchProductionMultiplier,
  isResearchInProgress,
  getUnlockedResearch,
  canAttemptResearch,
  RESEARCH_CATALOG,
} from '../application/research.js';
import type { ResearchNode } from '../application/research.js';
import { PRESTIGE_COIN_THRESHOLD } from '../domain/constants.js';
import { getCatalogEventName } from '../application/i18nCatalogs.js';
import { createEventBadgeHtml } from './components/eventBadge.js';
import { getCatalogUpgradeName } from '../application/i18nCatalogs.js';
import { t, tParam, type StringKey } from '../application/strings.js';
import { UPGRADE_CATALOG, getUnlockedUpgradeTiers, getUpgradeCost } from '../application/catalogs.js';
import { getUpgradeCardState } from './components/upgradeCard.js';
import { PLANETS_PER_SOLAR_SYSTEM } from '../application/solarSystems.js';
import { getMaxBuyCount } from './upgradeListView.js';

/** Ordered upgrade defs (by tier) the player can see. */
function getOrderedUpgradeDefs(player: { upgrades: { id: string }[] }) {
  const ownedIds = player.upgrades.map((u) => u.id);
  const unlockedTiers = getUnlockedUpgradeTiers(ownedIds);
  return UPGRADE_CATALOG.filter((d) => unlockedTiers.has(d.tier)).sort((a, b) => a.tier - b.tier);
}

/** First affordable upgrade (by tier order), or null. */
export function getNextAffordableUpgrade(): { def: { id: string }; cost: string; planetId?: string } | null {
  const session = getSession();
  if (!session) return null;
  const player = session.player;
  const settings = getSettings();
  const planetWithSlot = player.getPlanetWithFreeSlot();
  const hasFreeSlot = planetWithSlot !== null;
  const defs = getOrderedUpgradeDefs(player);
  for (const def of defs) {
    const maxCount = getMaxBuyCount(def.id);
    const state = getUpgradeCardState(def, player, settings, hasFreeSlot, maxCount);
    if (state.canBuy) {
      return {
        def: { id: def.id },
        cost: state.costCoins,
        planetId: planetWithSlot?.id,
      };
    }
  }
  return null;
}

/** First upgrade (by tier) we cannot afford yet — for "~X min to [name]" when no affordable upgrade. */
function getNextUpgradeGoal(): { def: { id: string }; cost: Decimal; name: string } | null {
  const session = getSession();
  if (!session) return null;
  const player = session.player;
  const settings = getSettings();
  const planetWithSlot = player.getPlanetWithFreeSlot();
  const hasFreeSlot = planetWithSlot !== null;
  const defs = getOrderedUpgradeDefs(player);
  for (const def of defs) {
    const maxCount = getMaxBuyCount(def.id);
    const state = getUpgradeCardState(def, player, settings, hasFreeSlot, maxCount);
    if (!state.canBuy) {
      const owned = player.upgrades.filter((u) => u.id === def.id).length;
      const cost = getUpgradeCost(def, owned);
      return { def: { id: def.id }, cost, name: getCatalogUpgradeName(def.id) };
    }
  }
  return null;
}

/** First attemptable research node the player can afford (by row/col order), or null. */
function getNextAttemptableResearchAffordable(): ResearchNode | null {
  const session = getSession();
  if (!session) return null;
  const player = session.player;
  const attemptable = RESEARCH_CATALOG.filter((n) => canAttemptResearch(n.id)).sort(
    (a, b) => (a.row !== b.row ? a.row - b.row : a.col - b.col)
  );
  for (const node of attemptable) {
    if (player.coins.gte(node.cost)) return node;
  }
  return null;
}

/** Minutes until we reach a coin target at current rate (effective production). */
function minutesUntil(coinsNeeded: Decimal, ratePerSec: Decimal): number {
  if (ratePerSec.lte(0)) return Infinity;
  const secs = coinsNeeded.div(ratePerSec);
  const num = secs.toNumber();
  return Number.isFinite(num) && num >= 0 ? Math.ceil(num / 60) : Infinity;
}

const SHORTCUTS: { tab: string; labelKey: StringKey }[] = [
  { tab: 'mine', labelKey: 'tabMine' },
  { tab: 'empire', labelKey: 'tabBase' },
  { tab: 'upgrades', labelKey: 'tabUpgrades' },
  { tab: 'research', labelKey: 'tabResearch' },
  { tab: 'stats', labelKey: 'tabStats' },
];

/** Build only the "Do this next" hero block HTML (for full render or in-place refresh). */
function buildDashboardHeroHtml(): string {
  const session = getSession();
  if (!session) return '';
  const player = session.player;
  const eventMult = getEventMultiplier();
  const researchMult = getResearchProductionMultiplier();
  const effectiveRate = player.effectiveProductionRate.mul(eventMult * researchMult);
  const questProgress = getQuestProgress();
  const questDone = questProgress?.done ?? false;
  const canPrestige = player.coins.gte(PRESTIGE_COIN_THRESHOLD);
  const expeditionEndsAt = getExpeditionEndsAt();
  const expeditionActive = expeditionEndsAt != null && expeditionEndsAt > Date.now();
  const nextUpgrade = getNextAffordableUpgrade();
  const nextGoal = getNextUpgradeGoal();
  const affordableResearch = getNextAttemptableResearchAffordable();
  const canLaunchExpedition = planetService.canLaunchExpedition(player);
  const expeditionCost = planetService.getNewPlanetCost(player);
  const unlocked = getUnlockedBlocks(session);
  const milestone = getNextMilestone(session);

  let recommendedHtml = '';
  let recommendedLabel = '';

  if (unlocked.has('quest') && questDone) {
    recommendedLabel = t('dashboardQuestReady');
    recommendedHtml = `<button type="button" class="dashboard-hero-btn dashboard-hero-btn--claim" id="dashboard-do-claim">${t('claim')} ✓</button>`;
  } else if (unlocked.has('prestige') && canPrestige) {
    recommendedLabel = t('dashboardPrestigeReady');
    recommendedHtml = `<button type="button" class="dashboard-hero-btn dashboard-hero-btn--prestige" id="dashboard-do-prestige">${t('prestige')}</button>`;
  } else if (unlocked.has('upgrades') && nextUpgrade) {
    recommendedLabel = tParam('dashboardBuyOne', { name: getCatalogUpgradeName(nextUpgrade.def.id) });
    recommendedHtml = `<button type="button" class="dashboard-hero-btn dashboard-hero-btn--upgrade" id="dashboard-do-upgrade" data-upgrade-id="${nextUpgrade.def.id}" data-planet-id="${nextUpgrade.planetId ?? ''}">${tParam('dashboardBuyOne', { name: getCatalogUpgradeName(nextUpgrade.def.id) })} · ${nextUpgrade.cost}</button>`;
  } else if (unlocked.has('research') && affordableResearch) {
    recommendedLabel = tParam('dashboardStartResearch', { name: affordableResearch.name });
    recommendedHtml = `<button type="button" class="dashboard-hero-btn dashboard-hero-btn--goto" id="dashboard-goto-research">${t('goToResearch')} →</button>`;
  } else if (!expeditionActive && unlocked.has('planets')) {
    if (canLaunchExpedition) {
      recommendedLabel = t('buyNewPlanet');
      recommendedHtml = `<button type="button" class="dashboard-hero-btn dashboard-hero-btn--goto" id="dashboard-goto-empire">${t('goToEmpire')} →</button>`;
    } else if (player.coins.value.lt(expeditionCost) && effectiveRate.gt(0)) {
      const remaining = expeditionCost.sub(player.coins.value);
      const min = minutesUntil(remaining, effectiveRate);
      recommendedLabel = tParam('dashboardTimeToExpedition', { min: min === Infinity ? '…' : String(min) });
      recommendedHtml = `<button type="button" class="dashboard-hero-btn dashboard-hero-btn--goto" id="dashboard-goto-empire">${t('goToEmpire')} →</button>`;
    } else {
      recommendedLabel = t('buyNewPlanet');
      recommendedHtml = `<button type="button" class="dashboard-hero-btn dashboard-hero-btn--goto" id="dashboard-goto-empire">${t('goToEmpire')} →</button>`;
    }
  } else if (unlocked.has('upgrades') && nextGoal && effectiveRate.gt(0)) {
    const remaining = nextGoal.cost.sub(player.coins.value);
    if (remaining.gt(0)) {
      const min = minutesUntil(remaining, effectiveRate);
      recommendedLabel = tParam('dashboardTimeTo', { min: min === Infinity ? '…' : String(min), target: nextGoal.name });
      recommendedHtml = `<button type="button" class="dashboard-hero-btn dashboard-hero-btn--goto" id="dashboard-goto-mine">${t('goToMine')} →</button>`;
    } else {
      recommendedLabel = t('dashboardKeepMining');
      recommendedHtml = `<button type="button" class="dashboard-hero-btn dashboard-hero-btn--goto" id="dashboard-goto-mine">${t('goToMine')} →</button>`;
    }
  } else {
    recommendedLabel = t('dashboardKeepMining');
    recommendedHtml = `<button type="button" class="dashboard-hero-btn dashboard-hero-btn--goto" id="dashboard-goto-mine">${t('goToMine')} →</button>`;
  }

  let timeEstimateHtml = '';
  if (effectiveRate.gt(0)) {
    if (milestone && unlocked.has(milestone.block.id) && !questDone && !canPrestige) {
      const remaining = new Decimal(milestone.coinsNeeded).sub(player.coins.value);
      if (remaining.gt(0)) {
        const min = minutesUntil(remaining, effectiveRate);
        const titleKey = ('progression' + milestone.block.id.charAt(0).toUpperCase() + milestone.block.id.slice(1) + 'Title') as StringKey;
        const target = t(titleKey);
        timeEstimateHtml = `<p class="dashboard-hero-time">${tParam('dashboardTimeTo', { min: min === Infinity ? '…' : String(min), target })}</p>`;
      }
    } else if (unlocked.has('prestige') && !canPrestige) {
      const remaining = new Decimal(PRESTIGE_COIN_THRESHOLD).sub(player.coins.value);
      if (remaining.gt(0)) {
        const min = minutesUntil(remaining, effectiveRate);
        timeEstimateHtml = `<p class="dashboard-hero-time">${tParam('dashboardTimeTo', { min: min === Infinity ? '…' : String(min), target: t('prestige') })}</p>`;
      }
    }
  }

  const timeText = timeEstimateHtml ? timeEstimateHtml.replace(/<[^>]*>/g, '').trim() : '';
  return `
    <div class="dashboard-hero">
      <div class="dashboard-hero-header">
        <span class="dashboard-hero-badge">${t('dashboardRecommended')}</span>
        <h3 id="dashboard-hero-title" class="dashboard-hero-title">${recommendedLabel}</h3>
      </div>
      <div id="dashboard-hero-action" class="dashboard-hero-action">${recommendedHtml}</div>
      <p id="dashboard-hero-time" class="dashboard-hero-time" style="display:${timeText ? '' : 'none'}">${timeText}</p>
    </div>`;
}

/** Refresh only the "Do this next" hero tile (no full dashboard re-render). */
export function refreshDashboardHero(): void {
  const wrap = document.getElementById('dashboard-hero-wrap');
  if (!wrap) return;
  wrap.innerHTML = buildDashboardHeroHtml();
}

/** Update hero tile in place (title, button, time estimate) to avoid blink. */
function updateDashboardHeroInPlace(): void {
  const titleEl = document.getElementById('dashboard-hero-title');
  const actionEl = document.getElementById('dashboard-hero-action');
  const timeEl = document.getElementById('dashboard-hero-time');
  if (!titleEl || !actionEl || !timeEl) return;
  const session = getSession();
  if (!session) return;
  const player = session.player;
  const eventMult = getEventMultiplier();
  const researchMult = getResearchProductionMultiplier();
  const effectiveRate = player.effectiveProductionRate.mul(eventMult * researchMult);
  const questProgress = getQuestProgress();
  const questDone = questProgress?.done ?? false;
  const canPrestige = player.coins.gte(PRESTIGE_COIN_THRESHOLD);
  const expeditionEndsAt = getExpeditionEndsAt();
  const expeditionActive = expeditionEndsAt != null && expeditionEndsAt > Date.now();
  const nextUpgrade = getNextAffordableUpgrade();
  const nextGoal = getNextUpgradeGoal();
  const affordableResearch = getNextAttemptableResearchAffordable();
  const canLaunchExpedition = planetService.canLaunchExpedition(player);
  const expeditionCost = planetService.getNewPlanetCost(player);
  const unlocked = getUnlockedBlocks(session);
  const milestone = getNextMilestone(session);

  let recommendedHtml = '';
  let recommendedLabel = '';

  if (unlocked.has('quest') && questDone) {
    recommendedLabel = t('dashboardQuestReady');
    recommendedHtml = `<button type="button" class="dashboard-hero-btn dashboard-hero-btn--claim" id="dashboard-do-claim">${t('claim')} ✓</button>`;
  } else if (unlocked.has('prestige') && canPrestige) {
    recommendedLabel = t('dashboardPrestigeReady');
    recommendedHtml = `<button type="button" class="dashboard-hero-btn dashboard-hero-btn--prestige" id="dashboard-do-prestige">${t('prestige')}</button>`;
  } else if (unlocked.has('upgrades') && nextUpgrade) {
    recommendedLabel = tParam('dashboardBuyOne', { name: getCatalogUpgradeName(nextUpgrade.def.id) });
    recommendedHtml = `<button type="button" class="dashboard-hero-btn dashboard-hero-btn--upgrade" id="dashboard-do-upgrade" data-upgrade-id="${nextUpgrade.def.id}" data-planet-id="${nextUpgrade.planetId ?? ''}">${tParam('dashboardBuyOne', { name: getCatalogUpgradeName(nextUpgrade.def.id) })} · ${nextUpgrade.cost}</button>`;
  } else if (unlocked.has('research') && affordableResearch) {
    recommendedLabel = tParam('dashboardStartResearch', { name: affordableResearch.name });
    recommendedHtml = `<button type="button" class="dashboard-hero-btn dashboard-hero-btn--goto" id="dashboard-goto-research">${t('goToResearch')} →</button>`;
  } else if (!expeditionActive && unlocked.has('planets')) {
    if (canLaunchExpedition) {
      recommendedLabel = t('buyNewPlanet');
      recommendedHtml = `<button type="button" class="dashboard-hero-btn dashboard-hero-btn--goto" id="dashboard-goto-empire">${t('goToEmpire')} →</button>`;
    } else if (player.coins.value.lt(expeditionCost) && effectiveRate.gt(0)) {
      const remaining = expeditionCost.sub(player.coins.value);
      const min = minutesUntil(remaining, effectiveRate);
      recommendedLabel = tParam('dashboardTimeToExpedition', { min: min === Infinity ? '…' : String(min) });
      recommendedHtml = `<button type="button" class="dashboard-hero-btn dashboard-hero-btn--goto" id="dashboard-goto-empire">${t('goToEmpire')} →</button>`;
    } else {
      recommendedLabel = t('buyNewPlanet');
      recommendedHtml = `<button type="button" class="dashboard-hero-btn dashboard-hero-btn--goto" id="dashboard-goto-empire">${t('goToEmpire')} →</button>`;
    }
  } else if (unlocked.has('upgrades') && nextGoal && effectiveRate.gt(0)) {
    const remaining = nextGoal.cost.sub(player.coins.value);
    if (remaining.gt(0)) {
      const min = minutesUntil(remaining, effectiveRate);
      recommendedLabel = tParam('dashboardTimeTo', { min: min === Infinity ? '…' : String(min), target: nextGoal.name });
      recommendedHtml = `<button type="button" class="dashboard-hero-btn dashboard-hero-btn--goto" id="dashboard-goto-mine">${t('goToMine')} →</button>`;
    } else {
      recommendedLabel = t('dashboardKeepMining');
      recommendedHtml = `<button type="button" class="dashboard-hero-btn dashboard-hero-btn--goto" id="dashboard-goto-mine">${t('goToMine')} →</button>`;
    }
  } else {
    recommendedLabel = t('dashboardKeepMining');
    recommendedHtml = `<button type="button" class="dashboard-hero-btn dashboard-hero-btn--goto" id="dashboard-goto-mine">${t('goToMine')} →</button>`;
  }

  let timeText = '';
  if (effectiveRate.gt(0)) {
    if (milestone && unlocked.has(milestone.block.id) && !questDone && !canPrestige) {
      const remaining = new Decimal(milestone.coinsNeeded).sub(player.coins.value);
      if (remaining.gt(0)) {
        const min = minutesUntil(remaining, effectiveRate);
        const titleKey = ('progression' + milestone.block.id.charAt(0).toUpperCase() + milestone.block.id.slice(1) + 'Title') as StringKey;
        timeText = tParam('dashboardTimeTo', { min: min === Infinity ? '…' : String(min), target: t(titleKey) });
      }
    } else if (unlocked.has('prestige') && !canPrestige) {
      const remaining = new Decimal(PRESTIGE_COIN_THRESHOLD).sub(player.coins.value);
      if (remaining.gt(0)) {
        const min = minutesUntil(remaining, effectiveRate);
        timeText = tParam('dashboardTimeTo', { min: min === Infinity ? '…' : String(min), target: t('prestige') });
      }
    }
  }

  titleEl.textContent = recommendedLabel;
  actionEl.innerHTML = recommendedHtml;
  timeEl.textContent = timeText;
  timeEl.style.display = timeText ? '' : 'none';
}

/** Build only the quest card HTML (empty string when no active quest or quest block not unlocked). */
function buildDashboardQuestCardHtml(): string {
  const session = getSession();
  if (!session) return '';
  const unlocked = getUnlockedBlocks(session);
  if (!unlocked.has('quest')) return '';
  const questProgress = getQuestProgress();
  const questDone = questProgress?.done ?? false;
  if (!questProgress || questDone) return '';
  const pct = questProgress.target > 0 ? Math.min(100, (Number(questProgress.current) / questProgress.target) * 100) : 0;
  const questState = getQuestState();
  const questDesc = questState.quest?.description ?? '';
  const descEscaped = questDesc.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return `
    <div class="dashboard-quest-card">
      <div class="dashboard-quest-card-header">
        <span class="dashboard-quest-card-label">${t('quest')}</span>
        <span id="dashboard-quest-value" class="dashboard-quest-card-value">${formatNumber(questProgress.current, false)} / ${formatNumber(questProgress.target, false)}</span>
      </div>
      <p id="dashboard-quest-desc" class="dashboard-quest-desc" style="display:${descEscaped ? '' : 'none'}">${descEscaped}</p>
      <div class="dashboard-quest-bar-wrap">
        <div id="dashboard-quest-bar" class="dashboard-quest-bar" style="width:${pct}%" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"></div>
      </div>
    </div>`;
}

/** Refresh only the quest card tile (no full dashboard re-render). */
export function refreshDashboardQuestCard(): void {
  const wrap = document.getElementById('dashboard-quest-card-wrap');
  if (!wrap) return;
  wrap.innerHTML = buildDashboardQuestCardHtml();
}

/** Update quest card in place (value, bar, desc) or clear when done or quest not unlocked. */
function updateDashboardQuestCardInPlace(): void {
  const wrap = document.getElementById('dashboard-quest-card-wrap');
  if (!wrap) return;
  const session = getSession();
  if (!session) return;
  const unlocked = getUnlockedBlocks(session);
  if (!unlocked.has('quest')) {
    if (wrap.innerHTML !== '') wrap.innerHTML = '';
    return;
  }
  const questProgress = getQuestProgress();
  const questDone = questProgress?.done ?? false;
  if (!questProgress || questDone) {
    if (wrap.innerHTML !== '') wrap.innerHTML = '';
    return;
  }
  const valueEl = document.getElementById('dashboard-quest-value');
  const barEl = document.getElementById('dashboard-quest-bar');
  const descEl = document.getElementById('dashboard-quest-desc');
  if (!valueEl || !barEl) {
    wrap.innerHTML = buildDashboardQuestCardHtml();
    return;
  }
  const pct = questProgress.target > 0 ? Math.min(100, (Number(questProgress.current) / questProgress.target) * 100) : 0;
  const questState = getQuestState();
  const questDesc = questState.quest?.description ?? '';
  const descEscaped = questDesc.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  valueEl.textContent = `${formatNumber(questProgress.current, false)} / ${formatNumber(questProgress.target, false)}`;
  barEl.style.width = `${pct}%`;
  barEl.setAttribute('aria-valuenow', String(Math.round(pct)));
  if (descEl) {
    descEl.textContent = questDesc;
    descEl.style.display = questDesc ? '' : 'none';
  }
}

/** Build stats row HTML (coins, rate, run summary). */
function buildDashboardStatsHtml(): string {
  const session = getSession();
  if (!session) return '';
  const player = session.player;
  const settings = getSettings();
  const eventMult = getEventMultiplier();
  const researchMult = getResearchProductionMultiplier();
  const effectiveRate = player.effectiveProductionRate.mul(eventMult * researchMult);
  const runStats = getRunStats();
  const coinsFormatted = formatNumber(player.coins.value, settings.compactNumbers);
  const rateFormatted = formatNumber(effectiveRate, settings.compactNumbers) + '/s';
  const runCoins = formatNumber(runStats.runCoinsEarned, settings.compactNumbers);
  return `
    <div class="dashboard-stats">
      <div class="dashboard-stat dashboard-stat--coins">
        <span class="dashboard-stat-icon" aria-hidden="true">⬡</span>
        <span class="dashboard-stat-label">${t('coins')}</span>
        <span id="dashboard-stat-coins" class="dashboard-stat-value dashboard-stat-value--primary">${coinsFormatted}</span>
      </div>
      <div class="dashboard-stat dashboard-stat--rate">
        <span class="dashboard-stat-icon dashboard-stat-icon--rate" aria-hidden="true">/s</span>
        <span class="dashboard-stat-label">${t('production')}</span>
        <span id="dashboard-stat-rate" class="dashboard-stat-value">${rateFormatted}</span>
      </div>
      <div class="dashboard-stat dashboard-stat--run">
        <span class="dashboard-stat-icon" aria-hidden="true">◷</span>
        <span class="dashboard-stat-label">${t('dashboardRunSummary')}</span>
        <span id="dashboard-stat-run" class="dashboard-stat-value dashboard-stat-value--run">${runCoins} ⬡ · ${runStats.runQuestsClaimed} ${t('dashboardQuestsShort')} · ${runStats.runEventsTriggered} ${t('dashboardEventsShort')}</span>
      </div>
    </div>`;
}

export function refreshDashboardStats(): void {
  const wrap = document.getElementById('dashboard-stats-wrap');
  if (!wrap) return;
  wrap.innerHTML = buildDashboardStatsHtml();
}

/** Update only the three stat values (no DOM replace). */
function updateDashboardStatsInPlace(): void {
  const session = getSession();
  if (!session) return;
  const player = session.player;
  const settings = getSettings();
  const eventMult = getEventMultiplier();
  const researchMult = getResearchProductionMultiplier();
  const effectiveRate = player.effectiveProductionRate.mul(eventMult * researchMult);
  const runStats = getRunStats();
  const coinsEl = document.getElementById('dashboard-stat-coins');
  const rateEl = document.getElementById('dashboard-stat-rate');
  const runEl = document.getElementById('dashboard-stat-run');
  if (coinsEl) coinsEl.textContent = formatNumber(player.coins.value, settings.compactNumbers);
  if (rateEl) rateEl.textContent = formatNumber(effectiveRate, settings.compactNumbers) + '/s';
  if (runEl)
    runEl.textContent = `${formatNumber(runStats.runCoinsEarned, settings.compactNumbers)} ⬡ · ${runStats.runQuestsClaimed} ${t('dashboardQuestsShort')} · ${runStats.runEventsTriggered} ${t('dashboardEventsShort')}`;
}

/** Build prestige progress card HTML (empty when at threshold or locked). */
function buildDashboardPrestigeHtml(): string {
  const session = getSession();
  if (!session) return '';
  const player = session.player;
  const settings = getSettings();
  const unlocked = getUnlockedBlocks(session);
  const canPrestige = player.coins.gte(PRESTIGE_COIN_THRESHOLD);
  if (canPrestige || !unlocked.has('prestige')) return '';
  const thresholdNum = Number(PRESTIGE_COIN_THRESHOLD);
  const coinsNum = Math.min(Number(player.coins.value), thresholdNum);
  const pct = thresholdNum > 0 ? Math.min(100, (coinsNum / thresholdNum) * 100) : 0;
  const thresholdFormatted = formatNumber(new Decimal(PRESTIGE_COIN_THRESHOLD), settings.compactNumbers);
  const coinsFormatted = formatNumber(player.coins.value, settings.compactNumbers);
  return `
    <div class="dashboard-progress-card dashboard-progress-card--prestige">
      <div class="dashboard-progress-card-header">
        <span class="dashboard-progress-card-label">${t('dashboardToPrestige')}</span>
        <span id="dashboard-prestige-value" class="dashboard-progress-card-value">${coinsFormatted} / ${thresholdFormatted}</span>
      </div>
      <div class="dashboard-progress-bar-wrap">
        <div id="dashboard-prestige-bar" class="dashboard-progress-bar" style="width:${pct}%" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"></div>
      </div>
    </div>`;
}

export function refreshDashboardPrestige(): void {
  const wrap = document.getElementById('dashboard-prestige-wrap');
  if (!wrap) return;
  wrap.innerHTML = buildDashboardPrestigeHtml();
}

/** Update only prestige value and bar (no DOM replace). Clears wrap when at threshold. */
function updateDashboardPrestigeInPlace(): void {
  const session = getSession();
  if (!session) return;
  const player = session.player;
  const settings = getSettings();
  const unlocked = getUnlockedBlocks(session);
  const wrap = document.getElementById('dashboard-prestige-wrap');
  if (!wrap) return;
  const canPrestige = player.coins.gte(PRESTIGE_COIN_THRESHOLD);
  if (canPrestige || !unlocked.has('prestige')) {
    if (wrap.innerHTML !== '') wrap.innerHTML = '';
    return;
  }
  const prestigeValueEl = document.getElementById('dashboard-prestige-value');
  const prestigeBarEl = document.getElementById('dashboard-prestige-bar');
  if (!prestigeValueEl || !prestigeBarEl) return;
  const thresholdNum = Number(PRESTIGE_COIN_THRESHOLD);
  const coinsNum = Math.min(Number(player.coins.value), thresholdNum);
  const pct = thresholdNum > 0 ? Math.min(100, (coinsNum / thresholdNum) * 100) : 0;
  const thresholdFormatted = formatNumber(new Decimal(PRESTIGE_COIN_THRESHOLD), settings.compactNumbers);
  prestigeValueEl.textContent = `${formatNumber(player.coins.value, settings.compactNumbers)} / ${thresholdFormatted}`;
  prestigeBarEl.style.width = `${pct}%`;
  prestigeBarEl.setAttribute('aria-valuenow', String(Math.round(pct)));
}

/** Build empire pills HTML (empty when not unlocked). */
function buildDashboardEmpireHtml(): string {
  const session = getSession();
  if (!session) return '';
  const player = session.player;
  const unlocked = getUnlockedBlocks(session);
  const showEmpire = unlocked.has('planets') || unlocked.has('crew');
  if (!showEmpire) return '';
  const planetCount = player.planets.length;
  const solarSystemsCount = Math.ceil(planetCount / PLANETS_PER_SOLAR_SYSTEM);
  const upgradeCount = player.upgrades.length;
  const researchUnlocked = getUnlockedResearch().length;
  const researchTotal = RESEARCH_CATALOG.length;
  const empirePills: string[] = [
    `${planetCount} ${t('planets')}`,
    ...(unlocked.has('crew') ? [`${player.astronautCount} ${t('crew')}`] : []),
    `${solarSystemsCount} ${t('dashboardSolarSystems')}`,
  ];
  if (unlocked.has('upgrades')) empirePills.push(`${upgradeCount} ${t('tabUpgrades')}`);
  if (unlocked.has('research')) empirePills.push(`${researchUnlocked}/${researchTotal} ${t('tabResearch')}`);
  return `
    <div class="dashboard-empire">
      <span class="dashboard-empire-label">${t('tabBase')}</span>
      <div class="dashboard-empire-pills">${empirePills.map((text) => `<span class="dashboard-empire-pill">${text}</span>`).join('')}</div>
    </div>`;
}

export function refreshDashboardEmpire(): void {
  const wrap = document.getElementById('dashboard-empire-wrap');
  if (!wrap) return;
  wrap.innerHTML = buildDashboardEmpireHtml();
}

/** Build current empire pill texts in display order. */
function getDashboardEmpirePillTexts(): string[] {
  const session = getSession();
  if (!session) return [];
  const player = session.player;
  const unlocked = getUnlockedBlocks(session);
  if (!unlocked.has('planets') && !unlocked.has('crew')) return [];
  const planetCount = player.planets.length;
  const solarSystemsCount = Math.ceil(planetCount / PLANETS_PER_SOLAR_SYSTEM);
  const upgradeCount = player.upgrades.length;
  const researchUnlocked = getUnlockedResearch().length;
  const researchTotal = RESEARCH_CATALOG.length;
  const pills: string[] = [
    `${planetCount} ${t('planets')}`,
    ...(unlocked.has('crew') ? [`${player.astronautCount} ${t('crew')}`] : []),
    `${solarSystemsCount} ${t('dashboardSolarSystems')}`,
  ];
  if (unlocked.has('upgrades')) pills.push(`${upgradeCount} ${t('tabUpgrades')}`);
  if (unlocked.has('research')) pills.push(`${researchUnlocked}/${researchTotal} ${t('tabResearch')}`);
  return pills;
}

/** Update empire pills in place; full refresh only when pill count changes. */
let lastEmpirePillCount = -1;

function updateDashboardEmpireInPlace(): void {
  const wrap = document.getElementById('dashboard-empire-wrap');
  if (!wrap) return;
  const session = getSession();
  if (!session) return;
  const unlocked = getUnlockedBlocks(session);
  if (!unlocked.has('planets') && !unlocked.has('crew')) {
    if (wrap.innerHTML !== '') wrap.innerHTML = '';
    lastEmpirePillCount = 0;
    return;
  }
  const pills = getDashboardEmpirePillTexts();
  const existing = wrap.querySelectorAll('.dashboard-empire-pill');
  if (existing.length !== pills.length) {
    wrap.innerHTML = buildDashboardEmpireHtml();
    lastEmpirePillCount = pills.length;
    return;
  }
  lastEmpirePillCount = pills.length;
  existing.forEach((el, i) => {
    if (pills[i] != null) el.textContent = pills[i];
  });
}

/** Build live section HTML (events, expedition, next event, research). */
function buildDashboardLiveHtml(): string {
  const session = getSession();
  if (!session) return '';
  const now = Date.now();
  const unlocked = getUnlockedBlocks(session);
  const activeEvents = getActiveEventInstances().filter((a) => a.endsAt > now);
  const expeditionEndsAt = getExpeditionEndsAt();
  const expeditionActive = expeditionEndsAt != null && expeditionEndsAt > now;
  const nextEventAt = getNextEventAt();
  const eventsUnlocked = getUnlockedBlocks(session).has('events');
  let liveHtml = '';
  if (activeEvents.length > 0) {
    const now = Date.now();
    liveHtml +=
      '<div class="dashboard-events">' +
      activeEvents
        .map((a) => {
          const name = getCatalogEventName(a.event.id);
          const secondsLeft = Math.ceil((a.endsAt - now) / 1000);
          const title = tParam('eventBadgeTitle', { name, mult: String(a.event.effect.multiplier) });
          const modifier = a.event.effect.multiplier >= 1 ? 'positive' : 'negative';
          return createEventBadgeHtml(name, secondsLeft, title, { modifier, mult: a.event.effect.multiplier });
        })
        .join('') +
      '</div>';
  }
  if (expeditionActive && expeditionEndsAt != null) {
    const remaining = Math.ceil((expeditionEndsAt - now) / 1000);
    liveHtml += `<span id="dashboard-expedition-pill" class="dashboard-live-pill dashboard-live-pill--expedition">${t('dashboardExpeditionInProgress')} — ${remaining}s</span>`;
  }
  if (eventsUnlocked && activeEvents.length === 0 && nextEventAt > now) {
    const secs = Math.ceil((nextEventAt - now) / 1000);
    liveHtml += `<span id="dashboard-next-event-pill" class="dashboard-live-pill dashboard-live-pill--next">${tParam('nextEventInFormat', { time: `${secs}s` })}</span>`;
  }
  if (isResearchInProgress() && unlocked.has('research')) {
    liveHtml += `<button type="button" class="dashboard-live-pill dashboard-live-pill--research" data-goto="research">${t('researching')}</button>`;
  }
  return liveHtml ? `<div class="dashboard-live">${liveHtml}</div>` : '';
}

export function refreshDashboardLive(): void {
  const wrap = document.getElementById('dashboard-live-wrap');
  if (!wrap) return;
  wrap.innerHTML = buildDashboardLiveHtml();
}

let lastLiveActiveEventCount = -1;
let lastLiveExpeditionActive: boolean | null = null;
let lastLiveResearchActive: boolean | null = null;

/** Update only pill texts and event badge times (no DOM replace). */
function updateDashboardLiveInPlace(): void {
  const session = getSession();
  if (!session) return;
  const now = Date.now();
  const activeEvents = getActiveEventInstances().filter((a) => a.endsAt > now);
  const expeditionEndsAt = getExpeditionEndsAt();
  const expeditionActive = expeditionEndsAt != null && expeditionEndsAt > now;
  const nextEventAt = getNextEventAt();
  const eventsUnlocked = getUnlockedBlocks(session).has('events');
  const researchActive = isResearchInProgress() && getUnlockedBlocks(session).has('research');

  const nextEventEl = document.getElementById('dashboard-next-event-pill');
  const expeditionEl = document.getElementById('dashboard-expedition-pill');
  if (nextEventEl && eventsUnlocked && activeEvents.length === 0 && nextEventAt > now) {
    const secs = Math.ceil((nextEventAt - now) / 1000);
    nextEventEl.textContent = tParam('nextEventInFormat', { time: `${secs}s` });
  }
  if (expeditionEl && expeditionActive && expeditionEndsAt != null) {
    const remaining = Math.ceil((expeditionEndsAt - now) / 1000);
    expeditionEl.textContent = `${t('dashboardExpeditionInProgress')} — ${remaining}s`;
  }

  const timeSpans = document.querySelectorAll('#dashboard-live-wrap .event-badge__time');
  activeEvents.forEach((a, i) => {
    const secondsLeft = Math.ceil((a.endsAt - now) / 1000);
    const span = timeSpans[i] as HTMLElement | undefined;
    if (span) span.textContent = `— ${secondsLeft}s`;
  });
}

/** Returns true if live section structure changed and needs full refresh. */
function dashboardLiveStructureChanged(): boolean {
  const session = getSession();
  if (!session) return false;
  const now = Date.now();
  const activeEvents = getActiveEventInstances().filter((a) => a.endsAt > now);
  const expeditionEndsAt = getExpeditionEndsAt();
  const expeditionActive = expeditionEndsAt != null && expeditionEndsAt > now;
  const researchActive = isResearchInProgress() && getUnlockedBlocks(session).has('research');
  const changed =
    activeEvents.length !== lastLiveActiveEventCount ||
    lastLiveExpeditionActive !== expeditionActive ||
    lastLiveResearchActive !== researchActive;
  lastLiveActiveEventCount = activeEvents.length;
  lastLiveExpeditionActive = expeditionActive;
  lastLiveResearchActive = researchActive;
  return changed;
}

export function renderDashboardSection(): void {
  const session = getSession();
  const container = document.getElementById('dashboard-content');
  if (!container) return;

  if (!session) {
    container.innerHTML = '<p class="dashboard-empty">No game session.</p>';
    return;
  }

  const unlocked = getUnlockedBlocks(session);

  // --- Shortcuts: only show tabs that are unlocked ---
  const shortcutButtons = SHORTCUTS.filter((s) => {
    if (s.tab === 'empire') return unlocked.has('crew') || unlocked.has('planets') || unlocked.has('prestige');
    if (s.tab === 'upgrades') return unlocked.has('upgrades');
    if (s.tab === 'research') return unlocked.has('research');
    if (s.tab === 'stats') return unlocked.has('upgrades');
    return true;
  }).map((s) => `<button type="button" class="dashboard-shortcut" data-goto="${s.tab}">${t(s.labelKey)}</button>`).join('');

  const shortcutsHtml = `
    <div class="dashboard-shortcuts">
      <span class="dashboard-shortcuts-label">${t('dashboardShortcuts')}</span>
      <div class="dashboard-shortcuts-grid">${shortcutButtons}</div>
    </div>`;

  container.innerHTML = `
    <div id="dashboard-stats-wrap">${buildDashboardStatsHtml()}</div>
    <div id="dashboard-hero-wrap">${buildDashboardHeroHtml()}</div>
    <div id="dashboard-prestige-wrap">${buildDashboardPrestigeHtml()}</div>
    <div id="dashboard-empire-wrap">${buildDashboardEmpireHtml()}</div>
    <div id="dashboard-quest-card-wrap">${buildDashboardQuestCardHtml()}</div>
    <div id="dashboard-live-wrap">${buildDashboardLiveHtml()}</div>
    ${shortcutsHtml}`;
}

/** Update all dashboard bricks in place (no full DOM replace) so nothing blinks. */
export function updateDashboard(): void {
  updateDashboardStatsInPlace();
  updateDashboardPrestigeInPlace();

  if (dashboardLiveStructureChanged()) {
    refreshDashboardLive();
  } else {
    updateDashboardLiveInPlace();
  }

  updateDashboardHeroInPlace();
  updateDashboardEmpireInPlace();
  updateDashboardQuestCardInPlace();
}

/** @deprecated Use updateDashboard() for full dynamic refresh. Kept for backward compatibility. */
export function updateDashboardLiveCountdowns(): void {
  updateDashboard();
}
