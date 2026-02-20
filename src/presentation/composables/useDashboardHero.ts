import Decimal from 'break_infinity.js';
import { computed } from 'vue';
import {
  getSession,
  getEventMultiplier,
  getExpeditionEndsAt,
  planetService,
} from '../../application/gameState.js';
import { getQuestProgress } from '../../application/quests.js';
import { getNextMilestone, getUnlockedBlocks } from '../../application/progression.js';
import {
  getResearchProductionMultiplier,
  isResearchInProgress,
} from '../../application/research.js';
import { getSetBonusMultiplier } from '../../application/moduleSetBonuses.js';
import { PRESTIGE_COIN_THRESHOLD } from '../../domain/constants.js';
import { getCatalogUpgradeName } from '../../application/i18nCatalogs.js';
import { t, tParam, type StringKey } from '../../application/strings.js';
import {
  getBestNextAffordableUpgrade,
  getBestNextUpgradeGoalCoinOnly,
  getBestNextUpgradeGoalWithState,
  getNextAttemptableResearchAffordable,
  minutesUntil,
} from '../lib/dashboardHelpers.js';
import { useGameStateStore } from '../stores/gameState.js';

export type HeroState = {
  label: string;
  buttonId: string;
  buttonClass: string;
  buttonLabel: string;
  dataUpgradeId?: string;
  dataPlanetId?: string;
  dataGoto?: string;
  timeText: string;
};

/** Reactive "Do this next" hero for dashboard. Each field reacts to store/session. */
export function useDashboardHero() {
  const store = useGameStateStore();

  return computed((): HeroState => {
    store.coins;
    store.production;
    store.runStats; // reactive dependencies so hero recomputes when bridge updates
    const s = getSession();
    if (!s) return { label: '', buttonId: '', buttonClass: 'dashboard-hero-btn--goto', buttonLabel: '', timeText: '' };
    const player = s.player;
    const eventMult = getEventMultiplier();
    const researchMult = getResearchProductionMultiplier();
    const setBonusMult = getSetBonusMultiplier(player);
    const effectiveRate = player.effectiveProductionRate.mul(eventMult * researchMult * setBonusMult);
    const questProgress = getQuestProgress();
    const questDone = questProgress?.done ?? false;
    const canPrestige = player.coins.gte(PRESTIGE_COIN_THRESHOLD);
    const expeditionEndsAt = getExpeditionEndsAt();
    const expeditionActive = expeditionEndsAt != null && expeditionEndsAt > Date.now();
    const nextUpgrade = getBestNextAffordableUpgrade();
    const nextGoalCoinOnly = getBestNextUpgradeGoalCoinOnly();
    const nextGoalWithState = getBestNextUpgradeGoalWithState();
    const affordableResearch = getNextAttemptableResearchAffordable();
    const researchInProgress = isResearchInProgress();
    const canLaunchExpedition = planetService.canLaunchExpedition(player);
    const expeditionCost = planetService.getNewPlanetCost(player);
    const expeditionCrewRequired = planetService.getExpeditionAstronautsRequired(player);
    const hasCoinsForExpedition = player.coins.gte(expeditionCost);
    const hasCrewForExpedition = player.astronautCount >= expeditionCrewRequired;
    const unlocked = getUnlockedBlocks(s);
    const milestone = getNextMilestone(s);

    let label = '';
    let buttonId = '';
    let buttonClass = 'dashboard-hero-btn--goto';
    let buttonLabel = '';
    let dataUpgradeId: string | undefined;
    let dataPlanetId: string | undefined;
    let dataGoto: string | undefined;
    let timeText = '';

    if (unlocked.has('quest') && questDone) {
      label = t('dashboardQuestReady');
      buttonId = 'dashboard-do-claim';
      buttonClass = 'dashboard-hero-btn--claim';
      buttonLabel = t('claim') + ' ✓';
    } else if (unlocked.has('prestige') && canPrestige) {
      label = t('dashboardPrestigeReady');
      buttonId = 'dashboard-do-prestige';
      buttonClass = 'dashboard-hero-btn--prestige';
      buttonLabel = t('prestige');
    } else if (unlocked.has('upgrades') && nextUpgrade) {
      label = tParam('dashboardBuyOne', { name: getCatalogUpgradeName(nextUpgrade.def.id) });
      buttonId = 'dashboard-do-upgrade';
      buttonClass = 'dashboard-hero-btn--upgrade';
      dataUpgradeId = nextUpgrade.def.id;
      dataPlanetId = nextUpgrade.planetId ?? '';
      buttonLabel = tParam('dashboardBuyOne', { name: getCatalogUpgradeName(nextUpgrade.def.id) }) + ' · ' + nextUpgrade.cost;
    } else if (unlocked.has('research') && affordableResearch && !researchInProgress) {
      label = tParam('dashboardStartResearch', { name: affordableResearch.name });
      buttonId = 'dashboard-goto-research';
      buttonLabel = t('goToResearch') + ' →';
      dataGoto = 'research';
    } else if (!expeditionActive && unlocked.has('planets')) {
      if (canLaunchExpedition) {
        label = t('buyNewPlanet');
        buttonId = 'dashboard-goto-empire';
        buttonLabel = t('goToEmpire') + ' →';
        dataGoto = 'empire';
      } else if (hasCoinsForExpedition && !hasCrewForExpedition && unlocked.has('crew')) {
        label = tParam('dashboardNeedCrewExpedition', { n: String(expeditionCrewRequired) });
        buttonId = 'dashboard-goto-empire';
        buttonLabel = t('goToEmpire') + ' →';
        dataGoto = 'empire';
      } else if (!hasCoinsForExpedition && effectiveRate.gt(0)) {
        const remaining = expeditionCost.sub(player.coins.value);
        const min = minutesUntil(remaining, effectiveRate);
        label = tParam('dashboardTimeToExpedition', { min: min === Infinity ? '…' : String(min) });
        buttonId = 'dashboard-goto-empire';
        buttonLabel = t('goToEmpire') + ' →';
        dataGoto = 'empire';
      } else {
        label = t('buyNewPlanet');
        buttonId = 'dashboard-goto-empire';
        buttonLabel = t('goToEmpire') + ' →';
        dataGoto = 'empire';
      }
    } else if (unlocked.has('upgrades') && nextGoalWithState) {
      if (nextGoalCoinOnly && effectiveRate.gt(0)) {
        const remaining = nextGoalCoinOnly.cost.sub(player.coins.value);
        if (remaining.gt(0)) {
          const min = minutesUntil(remaining, effectiveRate);
          label = tParam('dashboardTimeTo', { min: min === Infinity ? '…' : String(min), target: nextGoalCoinOnly.name });
        } else {
          label = t('dashboardKeepMining');
        }
        buttonId = 'dashboard-goto-mine';
        buttonLabel = t('goToMine') + ' →';
        dataGoto = 'mine';
      } else if (!nextGoalWithState.canPlace && nextGoalWithState.needsSlot && unlocked.has('planets')) {
        label = t('dashboardAddSlot');
        buttonId = 'dashboard-goto-empire';
        buttonLabel = t('goToEmpire') + ' →';
        dataGoto = 'empire';
      } else if (!nextGoalWithState.hasCrew && nextGoalWithState.crewReq > 0 && unlocked.has('crew')) {
        label = t('dashboardHireCrew');
        buttonId = 'dashboard-goto-empire';
        buttonLabel = t('goToEmpire') + ' →';
        dataGoto = 'empire';
      } else {
        label = t('dashboardKeepMining');
        buttonId = 'dashboard-goto-mine';
        buttonLabel = t('goToMine') + ' →';
        dataGoto = 'mine';
      }
    } else {
      label = t('dashboardKeepMining');
      buttonId = 'dashboard-goto-mine';
      buttonLabel = t('goToMine') + ' →';
      dataGoto = 'mine';
    }

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

    return { label, buttonId, buttonClass, buttonLabel, dataUpgradeId, dataPlanetId, dataGoto, timeText };
  });
}
