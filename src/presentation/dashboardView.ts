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
} from '../application/gameState.js';
import { formatNumber } from '../application/format.js';
import { getQuestProgress } from '../application/quests.js';
import { getNextMilestone, getUnlockedBlocks } from '../application/progression.js';
import {
  getResearchProductionMultiplier,
  isResearchInProgress,
  getUnlockedResearch,
  RESEARCH_CATALOG,
} from '../application/research.js';
import { PRESTIGE_COIN_THRESHOLD } from '../domain/constants.js';
import { getCatalogEventName } from '../application/i18nCatalogs.js';
import { getCatalogUpgradeName } from '../application/i18nCatalogs.js';
import { t, tParam, type StringKey } from '../application/strings.js';
import { UPGRADE_CATALOG, getUnlockedUpgradeTiers } from '../application/catalogs.js';
import { getUpgradeCardState } from './components/upgradeCard.js';
import { PLANETS_PER_SOLAR_SYSTEM } from '../application/solarSystems.js';
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

const SHORTCUTS: { tab: string; labelKey: StringKey }[] = [
  { tab: 'mine', labelKey: 'tabMine' },
  { tab: 'empire', labelKey: 'tabBase' },
  { tab: 'upgrades', labelKey: 'tabUpgrades' },
  { tab: 'research', labelKey: 'tabResearch' },
  { tab: 'stats', labelKey: 'tabStats' },
];

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
  const unlocked = getUnlockedBlocks(session);

  // --- At-a-glance stats row ---
  const coinsFormatted = formatNumber(player.coins.value, settings.compactNumbers);
  const rateFormatted = formatNumber(effectiveRate, settings.compactNumbers) + '/s';
  const runCoins = formatNumber(runStats.runCoinsEarned, settings.compactNumbers);
  const statsHtml = `
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

  // --- Recommended action (hero CTA) ---
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
  } else if (!expeditionActive && unlocked.has('planets')) {
    recommendedLabel = t('buyNewPlanet');
    recommendedHtml = `<button type="button" class="dashboard-hero-btn dashboard-hero-btn--goto" id="dashboard-goto-empire">${t('goToEmpire')} →</button>`;
  } else {
    recommendedLabel = t('dashboardKeepMining');
    recommendedHtml = `<button type="button" class="dashboard-hero-btn dashboard-hero-btn--goto" id="dashboard-goto-mine">${t('goToMine')} →</button>`;
  }

  // --- Time estimate ---
  let timeEstimateHtml = '';
  if (effectiveRate.gt(0)) {
    if (milestone && !questDone && !canPrestige) {
      const remaining = new Decimal(milestone.coinsNeeded).sub(player.coins.value);
      if (remaining.gt(0)) {
        const min = minutesUntil(remaining, effectiveRate);
        const titleKey = ('progression' + milestone.block.id.charAt(0).toUpperCase() + milestone.block.id.slice(1) + 'Title') as StringKey;
        const target = t(titleKey);
        timeEstimateHtml = `<p class="dashboard-hero-time">${tParam('dashboardTimeTo', { min: min === Infinity ? '…' : String(min), target })}</p>`;
      }
    } else if (!canPrestige) {
      const remaining = new Decimal(PRESTIGE_COIN_THRESHOLD).sub(player.coins.value);
      if (remaining.gt(0)) {
        const min = minutesUntil(remaining, effectiveRate);
        timeEstimateHtml = `<p class="dashboard-hero-time">${tParam('dashboardTimeTo', { min: min === Infinity ? '…' : String(min), target: t('prestige') })}</p>`;
      }
    }
  }

  const heroHtml = `
    <div class="dashboard-hero">
      <div class="dashboard-hero-header">
        <span class="dashboard-hero-badge">${t('dashboardRecommended')}</span>
        <h3 class="dashboard-hero-title">${recommendedLabel}</h3>
      </div>
      <div class="dashboard-hero-action">${recommendedHtml}</div>
      ${timeEstimateHtml}
    </div>`;

  // --- Prestige progress (when not at threshold yet) ---
  let prestigeProgressHtml = '';
  if (!canPrestige && unlocked.has('prestige')) {
    const thresholdNum = Number(PRESTIGE_COIN_THRESHOLD);
    const coinsNum = Math.min(Number(player.coins.value), thresholdNum);
    const pct = thresholdNum > 0 ? Math.min(100, (coinsNum / thresholdNum) * 100) : 0;
    const thresholdFormatted = formatNumber(new Decimal(PRESTIGE_COIN_THRESHOLD), settings.compactNumbers);
    prestigeProgressHtml = `
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

  // --- Empire at a glance (planets, crew, systems, upgrades, research) ---
  let empireHtml = '';
  const showEmpire = unlocked.has('planets') || unlocked.has('crew');
  if (showEmpire) {
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
    empireHtml = `
    <div class="dashboard-empire">
      <span class="dashboard-empire-label">${t('tabBase')}</span>
      <div class="dashboard-empire-pills">${empirePills.map((text) => `<span class="dashboard-empire-pill">${text}</span>`).join('')}</div>
    </div>`;
  }

  // --- Quest progress card (with description) ---
  let questCardHtml = '';
  if (questProgress && !questDone) {
    const pct = questProgress.target > 0 ? Math.min(100, (Number(questProgress.current) / questProgress.target) * 100) : 0;
    const questState = getQuestState();
    const questDesc = questState.quest?.description ?? '';
    const descEscaped = questDesc.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    questCardHtml = `
    <div class="dashboard-quest-card">
      <div class="dashboard-quest-card-header">
        <span class="dashboard-quest-card-label">${t('quest')}</span>
        <span class="dashboard-quest-card-value">${formatNumber(questProgress.current, false)} / ${formatNumber(questProgress.target, false)}</span>
      </div>
      ${descEscaped ? `<p class="dashboard-quest-desc">${descEscaped}</p>` : ''}
      <div class="dashboard-quest-bar-wrap">
        <div class="dashboard-quest-bar" style="width:${pct}%" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"></div>
      </div>
    </div>`;
  }

  // --- Live status: events + expedition + next event ---
  let liveHtml = '';
  if (activeEvents.length > 0) {
    liveHtml += '<div class="dashboard-events">' + activeEvents.map((a) => `<span class="dashboard-event-badge" title="${getCatalogEventName(a.event.id)}">×${a.event.effect.multiplier}</span>`).join('') + '</div>';
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
  const liveSectionHtml = liveHtml ? `<div class="dashboard-live">${liveHtml}</div>` : '';

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
    ${statsHtml}
    ${heroHtml}
    ${prestigeProgressHtml}
    ${empireHtml}
    ${questCardHtml}
    ${liveSectionHtml}
    ${shortcutsHtml}`;
}

/** Update dashboard live data (stats, prestige bar, countdowns) without full re-render. */
export function updateDashboardLiveCountdowns(): void {
  const session = getSession();
  if (!session) return;
  const player = session.player;
  const settings = getSettings();
  const now = Date.now();
  const eventMult = getEventMultiplier();
  const researchMult = getResearchProductionMultiplier();
  const effectiveRate = player.effectiveProductionRate.mul(eventMult * researchMult);
  const runStats = getRunStats();
  const unlocked = getUnlockedBlocks(session);

  const coinsEl = document.getElementById('dashboard-stat-coins');
  const rateEl = document.getElementById('dashboard-stat-rate');
  const runEl = document.getElementById('dashboard-stat-run');
  if (coinsEl) coinsEl.textContent = formatNumber(player.coins.value, settings.compactNumbers);
  if (rateEl) rateEl.textContent = formatNumber(effectiveRate, settings.compactNumbers) + '/s';
  if (runEl) runEl.textContent = `${formatNumber(runStats.runCoinsEarned, settings.compactNumbers)} ⬡ · ${runStats.runQuestsClaimed} ${t('dashboardQuestsShort')} · ${runStats.runEventsTriggered} ${t('dashboardEventsShort')}`;

  const prestigeValueEl = document.getElementById('dashboard-prestige-value');
  const prestigeBarEl = document.getElementById('dashboard-prestige-bar');
  if (unlocked.has('prestige') && !player.coins.gte(PRESTIGE_COIN_THRESHOLD)) {
    const thresholdNum = Number(PRESTIGE_COIN_THRESHOLD);
    const coinsNum = Math.min(Number(player.coins.value), thresholdNum);
    const pct = thresholdNum > 0 ? Math.min(100, (coinsNum / thresholdNum) * 100) : 0;
    const thresholdFormatted = formatNumber(new Decimal(PRESTIGE_COIN_THRESHOLD), settings.compactNumbers);
    if (prestigeValueEl) prestigeValueEl.textContent = `${formatNumber(player.coins.value, settings.compactNumbers)} / ${thresholdFormatted}`;
    if (prestigeBarEl) {
      prestigeBarEl.style.width = `${pct}%`;
      prestigeBarEl.setAttribute('aria-valuenow', String(Math.round(pct)));
    }
  }

  const nextEventEl = document.getElementById('dashboard-next-event-pill');
  const expeditionEl = document.getElementById('dashboard-expedition-pill');
  if (nextEventEl) {
    const nextEventAt = getNextEventAt();
    if (nextEventAt > now) {
      const secs = Math.ceil((nextEventAt - now) / 1000);
      nextEventEl.textContent = tParam('nextEventInFormat', { time: `${secs}s` });
    }
  }
  if (expeditionEl) {
    const expeditionEndsAt = getExpeditionEndsAt();
    if (expeditionEndsAt != null && expeditionEndsAt > now) {
      const remaining = Math.ceil((expeditionEndsAt - now) / 1000);
      expeditionEl.textContent = `${t('dashboardExpeditionInProgress')} — ${remaining}s`;
    }
  }
}
