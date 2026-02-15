import Decimal from 'break_infinity.js';
import {
  getSession,
  getSettings,
  getEventMultiplier,
  getActiveEventInstances,
  getNextEventAt,
  getExpeditionEndsAt,
  getQuestState,
  getRunStats,
} from '../application/gameState.js';
import { formatNumber } from '../application/format.js';
import { getQuestProgress } from '../application/quests.js';
import { getNextMilestone, getUnlockedBlocks } from '../application/progression.js';
import { getResearchProductionMultiplier } from '../application/research.js';
import { PRESTIGE_COIN_THRESHOLD } from '../domain/constants.js';
import { getCatalogEventName } from '../application/i18nCatalogs.js';
import { getCatalogUpgradeName } from '../application/i18nCatalogs.js';
import { t, tParam, type StringKey } from '../application/strings.js';
import { UPGRADE_CATALOG, getUnlockedUpgradeTiers } from '../application/catalogs.js';
import { getEffectiveRequiredAstronauts } from '../application/research.js';
import { getUpgradeCardState } from './components/upgradeCard.js';
import { getMaxBuyCount } from './upgradeListView.js';

/** First affordable upgrade (by tier order), or null. */
function getNextAffordableUpgrade(): { def: { id: string }; cost: string; planetId?: string } | null {
  const session = getSession();
  if (!session) return null;
  const player = session.player;
  const settings = getSettings();
  const hasFreeSlot = player.getPlanetWithFreeSlot() !== null;
  const planetWithSlot = player.getPlanetWithFreeSlot();
  const ownedIds = player.upgrades.map((u) => u.id);
  const unlockedTiers = getUnlockedUpgradeTiers(ownedIds);
  const defs = UPGRADE_CATALOG.filter((d) => unlockedTiers.has(d.tier)).sort((a, b) => a.tier - b.tier);
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

/** Minutes until we reach a coin target at current rate (effective production). */
function minutesUntil(coinsNeeded: Decimal, ratePerSec: Decimal): number {
  if (ratePerSec.lte(0)) return Infinity;
  const secs = coinsNeeded.div(ratePerSec);
  const num = secs.toNumber();
  return Number.isFinite(num) && num >= 0 ? Math.ceil(num / 60) : Infinity;
}

export function renderDashboardSection(): void {
  const session = getSession();
  const container = document.getElementById('dashboard-content');
  if (!container) return;

  if (!session) {
    container.innerHTML = '<p class="dashboard-empty">No game session.</p>';
    return;
  }

  const player = session.player;
  const settings = getSettings();
  const eventMult = getEventMultiplier();
  const researchMult = getResearchProductionMultiplier();
  const effectiveRate = player.effectiveProductionRate.mul(eventMult * researchMult);
  const questProgress = getQuestProgress();
  const questDone = questProgress?.done ?? false;
  const canPrestige = player.coins.gte(PRESTIGE_COIN_THRESHOLD);
  const expeditionEndsAt = getExpeditionEndsAt();
  const now = Date.now();
  const expeditionActive = expeditionEndsAt != null && expeditionEndsAt > now;
  const activeEvents = getActiveEventInstances().filter((a) => a.endsAt > now);
  const nextEventAt = getNextEventAt();
  const eventsUnlocked = getUnlockedBlocks(session).has('events');
  const milestone = getNextMilestone(session);
  const runStats = getRunStats();
  const nextUpgrade = getNextAffordableUpgrade();

  // --- Recommended action (one hero CTA) ---
  let recommendedHtml = '';
  let recommendedLabel = '';

  if (questDone) {
    recommendedLabel = t('dashboardQuestReady');
    recommendedHtml = `<button type="button" class="dashboard-hero-btn dashboard-hero-btn--claim" id="dashboard-do-claim">${t('claim')} ✓</button>`;
  } else if (canPrestige) {
    recommendedLabel = t('dashboardPrestigeReady');
    recommendedHtml = `<button type="button" class="dashboard-hero-btn dashboard-hero-btn--prestige" id="dashboard-do-prestige">${t('prestige')}</button>`;
  } else if (nextUpgrade) {
    recommendedLabel = tParam('dashboardBuyOne', { name: getCatalogUpgradeName(nextUpgrade.def.id) });
    recommendedHtml = `<button type="button" class="dashboard-hero-btn dashboard-hero-btn--upgrade" id="dashboard-do-upgrade" data-upgrade-id="${nextUpgrade.def.id}" data-planet-id="${nextUpgrade.planetId ?? ''}">${tParam('dashboardBuyOne', { name: getCatalogUpgradeName(nextUpgrade.def.id) })} · ${nextUpgrade.cost}</button>`;
  } else if (!expeditionActive && getUnlockedBlocks(session).has('planets')) {
    recommendedLabel = t('buyNewPlanet');
    recommendedHtml = `<button type="button" class="dashboard-hero-btn dashboard-hero-btn--goto" id="dashboard-goto-empire">${t('goToEmpire')} →</button>`;
  } else {
    recommendedLabel = t('dashboardKeepMining');
    recommendedHtml = `<button type="button" class="dashboard-hero-btn dashboard-hero-btn--goto" id="dashboard-goto-mine">${t('goToMine')} →</button>`;
  }

  // --- Time estimates ---
  let timeEstimateHtml = '';
  if (effectiveRate.gt(0)) {
    if (milestone && !questDone && !canPrestige) {
      const remaining = new Decimal(milestone.coinsNeeded).sub(player.coins.value);
      if (remaining.gt(0)) {
        const min = minutesUntil(remaining, effectiveRate);
        const titleKey = ('progression' + milestone.block.id.charAt(0).toUpperCase() + milestone.block.id.slice(1) + 'Title') as StringKey;
        const target = t(titleKey);
        timeEstimateHtml = `<p class="dashboard-time">${tParam('dashboardTimeTo', { min: min === Infinity ? '…' : String(min), target })}</p>`;
      }
    } else if (!canPrestige) {
      const remaining = new Decimal(PRESTIGE_COIN_THRESHOLD).sub(player.coins.value);
      if (remaining.gt(0)) {
        const min = minutesUntil(remaining, effectiveRate);
        timeEstimateHtml = `<p class="dashboard-time">${tParam('dashboardTimeTo', { min: min === Infinity ? '…' : String(min), target: t('prestige') })}</p>`;
      }
    }
  }

  // --- Run summary ---
  const runCoins = formatNumber(runStats.runCoinsEarned, settings.compactNumbers);
  const runSummaryHtml = `
    <div class="dashboard-run">
      <span class="dashboard-run-label">${t('dashboardRunSummary')}</span>
      <span class="dashboard-run-values">${runCoins} ⬡ · ${runStats.runQuestsClaimed} ${t('dashboardQuestsShort')} · ${runStats.runEventsTriggered} ${t('dashboardEventsShort')}</span>
    </div>`;

  // --- Live: events + expedition ---
  let liveHtml = '';
  if (activeEvents.length > 0) {
    liveHtml += '<div class="dashboard-events">' + activeEvents.map((a) => `<span class="dashboard-event-badge" title="${getCatalogEventName(a.event.id)}">×${a.event.effect.multiplier}</span>`).join('') + '</div>';
  }
  if (expeditionActive && expeditionEndsAt != null) {
    const remaining = Math.ceil((expeditionEndsAt - now) / 1000);
    liveHtml += `<p class="dashboard-expedition">${t('dashboardExpeditionInProgress')} — ${remaining}s</p>`;
  }
  if (eventsUnlocked && activeEvents.length === 0 && nextEventAt > now) {
    const secs = Math.ceil((nextEventAt - now) / 1000);
    liveHtml += `<p class="dashboard-next-event">${tParam('nextEventInFormat', { time: `${secs}s` })}</p>`;
  }

  // --- Quest bar (compact) ---
  let questBarHtml = '';
  if (questProgress && !questDone) {
    const pct = questProgress.target > 0 ? Math.min(100, (Number(questProgress.current) / questProgress.target) * 100) : 0;
    questBarHtml = `<div class="dashboard-quest-mini"><div class="dashboard-quest-bar-wrap"><div class="dashboard-quest-bar" style="width:${pct}%"></div></div><span class="dashboard-quest-mini-label">${questProgress.done ? '✓' : `${formatNumber(questProgress.current, false)} / ${formatNumber(questProgress.target, false)}`}</span></div>`;
  }

  // --- Shortcuts (minimal row) ---
  const shortcutsHtml = `
    <div class="dashboard-shortcuts">
      <span class="dashboard-shortcuts-label">${t('dashboardShortcuts')}</span>
      <button type="button" class="dashboard-shortcut" data-goto="mine">Mine</button>
      <button type="button" class="dashboard-shortcut" data-goto="empire">Empire</button>
      <button type="button" class="dashboard-shortcut" data-goto="upgrades">Upgrades</button>
      <button type="button" class="dashboard-shortcut" data-goto="research">Research</button>
      <button type="button" class="dashboard-shortcut" data-goto="stats">Stats</button>
    </div>`;

  container.innerHTML = `
    <div class="dashboard-hero">
      <h3 class="dashboard-hero-title">${t('dashboardRecommended')}</h3>
      <p class="dashboard-hero-desc">${recommendedLabel}</p>
      <div class="dashboard-hero-action">${recommendedHtml}</div>
      ${timeEstimateHtml}
    </div>
    ${runSummaryHtml}
    ${liveHtml ? `<div class="dashboard-live">${liveHtml}</div>` : ''}
    ${questBarHtml}
    ${shortcutsHtml}`;

  // Clicks are handled by delegated listener in mount.ts
}
