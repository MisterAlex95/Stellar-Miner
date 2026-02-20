import {
  getSession,
  planetService,
  getExpeditionEndsAt,
  getExpeditionComposition,
  getExpeditionDifficulty,
  getExpeditionType,
  getExpeditionDurationMs,
  clearExpedition,
  setExpeditionInProgress,
} from './gameState.js';
import { getMaxAstronauts, getAstronautCost, getRetrainCost, getResearchDataForExpeditionSuccess, type CrewRole } from '../domain/constants.js';
import type { ExpeditionComposition, ExpeditionTierId, ExpeditionTypeId } from '../domain/constants.js';
import { getAssignedAstronauts } from './crewHelpers.js';
import { hasEffectiveFreeSlot, isCrewRetrainUnlocked, getResearchExpeditionDurationPercent, getResearchExpeditionDeathChancePercent, getResearchHousingCapacityBonus, addResearchData } from './research.js';
import { emit } from './eventBus.js';
import { notifyRefresh } from './refreshSignal.js';
import { getPresentationPort } from './uiBridge.js';
import { checkAchievements } from './achievements.js';
import { checkCodexUnlocks } from './codex.js';
import { getDiscoveryFlavorForPlanetName } from './discoveryFlavor.js';
import { getPlanetType } from './planetAffinity.js';
import { tryShowNarrator } from './narrator.js';
import { t, tParam } from './strings.js';

function refreshAfterPlanetAction(opts: { achievements?: boolean } = {}): void {
  notifyRefresh();
  if (opts.achievements) checkAchievements();
  checkCodexUnlocks();
}

/** Launch Scout expedition (discover new planet) with default composition and medium tier. */
export function handleBuyNewPlanet(): void {
  const session = getSession();
  if (!session) return;
  const player = session.player;
  if (getExpeditionEndsAt() !== null) return;
  if (!planetService.canLaunchExpedition(player, null, 'scout')) return;
  const result = planetService.startExpedition(player, null, 'medium', 'scout');
  if (!result.started) return;
  const durationMs = planetService.getExpeditionDurationMs(player, 'medium', result.composition.pilot ?? 0, getResearchExpeditionDurationPercent(), 'scout');
  const endsAt = Date.now() + durationMs;
  setExpeditionInProgress(endsAt, result.composition, durationMs, 'medium', 'scout');
  if (player.planets.length === 0) tryShowNarrator('first_expedition_launch');
  refreshAfterPlanetAction();
}

/** Launch expedition from modal: tier + type + crew composition. Cost depends on type. */
export function handleLaunchExpeditionFromModal(tierId: ExpeditionTierId, composition: ExpeditionComposition, typeId: ExpeditionTypeId = 'scout'): void {
  const session = getSession();
  if (!session) return;
  const player = session.player;
  if (getExpeditionEndsAt() !== null) return;
  if (!planetService.canLaunchExpedition(player, composition, typeId)) return;
  const result = planetService.startExpedition(player, composition, tierId, typeId);
  if (!result.started) return;
  const durationMs = planetService.getExpeditionDurationMs(player, tierId, result.composition.pilot ?? 0, getResearchExpeditionDurationPercent(), typeId);
  const endsAt = Date.now() + durationMs;
  setExpeditionInProgress(endsAt, result.composition, durationMs, tierId, typeId);
  if (player.planets.length === 0) tryShowNarrator('first_expedition_launch');
  refreshAfterPlanetAction();
}

/** Called from game loop: if expedition timer has elapsed, complete it and refresh UI. */
export function completeExpeditionIfDue(): void {
  const endsAt = getExpeditionEndsAt();
  if (endsAt == null) return;
  if (Date.now() < endsAt) return;
  const session = getSession();
  if (!session) return;
  const composition = getExpeditionComposition();
  if (!composition) return;
  const difficulty = getExpeditionDifficulty();
  const tierId = (difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard' ? difficulty : 'medium') as ExpeditionTierId;
  const typeRaw = getExpeditionType();
  const typeId: ExpeditionTypeId = (typeRaw === 'scout' || typeRaw === 'mining' || typeRaw === 'rescue' ? typeRaw : 'scout');
  const player = session.player;
  const wasFirstPlanet = player.planets.length === 1;
  const durationMs = getExpeditionDurationMs();
  const outcome = planetService.completeExpedition(
    player,
    composition,
    tierId,
    Math.random,
    getResearchExpeditionDeathChancePercent(),
    getDiscoveryFlavorForPlanetName,
    typeId,
    durationMs
  );
  clearExpedition();
  const ui = getPresentationPort();

  if (outcome.success && typeId === 'scout' && outcome.planetName) {
    addResearchData(getResearchDataForExpeditionSuccess(typeId));
    emit('planet_bought', { planetCount: player.planets.length });
    const lastPlanet = player.planets[player.planets.length - 1];
    const flavor = lastPlanet?.discoveryFlavor ?? '';
    let message: string;
    if (outcome.deaths > 0) {
      message = tParam('expeditionDiscoveredWithDeaths', { name: outcome.planetName, survivors: outcome.survivors, deaths: outcome.deaths });
    } else {
      message = tParam('expeditionDiscoveredAllReturned', { name: outcome.planetName, survivors: outcome.survivors });
    }
    if (flavor) message += `\n${flavor}`;
    ui.showMiniMilestoneToast(message);
    if (wasFirstPlanet && typeof localStorage !== 'undefined') {
      const key = 'stellar-miner-first-planet-toast';
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '1');
        ui.showMiniMilestoneToast(t('firstNewPlanetToast'));
      }
    }
    if (wasFirstPlanet && tryShowNarrator('first_planet')) {
    } else if (outcome.planetName && getPlanetType(outcome.planetName) === 'gas' && tryShowNarrator('first_gas_giant')) {
    } else if (outcome.deaths > 0) {
      tryShowNarrator('first_expedition_casualties');
    }
  } else if (outcome.success && typeId === 'mining' && outcome.coinsEarned !== undefined) {
    addResearchData(getResearchDataForExpeditionSuccess(typeId));
    const coinsStr = outcome.coinsEarned.toNumber().toLocaleString(undefined, { maximumFractionDigits: 0 });
    ui.showMiniMilestoneToast(tParam('expeditionMiningSuccess', { coins: coinsStr, survivors: outcome.survivors }));
  } else if (outcome.success && typeId === 'rescue' && outcome.rescuedCrew !== undefined) {
    addResearchData(getResearchDataForExpeditionSuccess(typeId));
    const maxCrew = getMaxAstronauts(player.planets.length, player.planets.reduce((s, p) => s + p.housingCount, 0), getResearchHousingCapacityBonus());
    const capped = Math.min(outcome.rescuedCrew, Math.max(0, maxCrew - player.astronautCount));
    if (capped > 0) player.addAstronauts(capped, 'astronaut');
    ui.showMiniMilestoneToast(tParam('expeditionRescueSuccess', { rescued: capped, survivors: outcome.survivors }));
  } else if (!outcome.success) {
    tryShowNarrator('first_lost_expedition');
    ui.showMiniMilestoneToast(tParam('expeditionFailed', { n: outcome.totalSent }));
  }

  refreshAfterPlanetAction({ achievements: true });
}

/** Cancel the current expedition: refund coins (cost depends on type) and crew. */
export function handleCancelExpedition(): void {
  const endsAt = getExpeditionEndsAt();
  if (endsAt == null) return;
  const composition = getExpeditionComposition();
  if (!composition) {
    clearExpedition();
    refreshAfterPlanetAction();
    return;
  }
  const session = getSession();
  if (!session) {
    clearExpedition();
    refreshAfterPlanetAction();
    return;
  }
  const player = session.player;
  const typeRaw = getExpeditionType();
  const typeId: ExpeditionTypeId = (typeRaw === 'scout' || typeRaw === 'mining' || typeRaw === 'rescue' ? typeRaw : 'scout');
  const cost = planetService.getExpeditionCost(player, typeId);
  player.addCoins(cost);
  player.refundCrewByComposition(composition);
  clearExpedition();
  refreshAfterPlanetAction();
}

export function handleAddSlot(planetId: string): void {
  const session = getSession();
  if (!session) return;
  const planet = session.player.planets.find((p) => p.id === planetId);
  if (!planet || !planetService.canAddSlot(session.player, planet)) return;
  planetService.addSlot(session.player, planet);
  tryShowNarrator('first_slot_added');
  refreshAfterPlanetAction();
}

export function handleBuildHousing(planetId: string): void {
  const session = getSession();
  if (!session) return;
  const planet = session.player.planets.find((p) => p.id === planetId);
  if (!planet || !planetService.canBuildHousing(session.player, planet, hasEffectiveFreeSlot)) return;
  planetService.buildHousing(session.player, planet, hasEffectiveFreeSlot);
  tryShowNarrator('first_housing');
  refreshAfterPlanetAction();
}

export function handleHireAstronaut(role: CrewRole = 'astronaut'): void {
  const session = getSession();
  if (!session) return;
  const player = session.player;
  const totalHousing = player.planets.reduce((s, p) => s + p.housingCount, 0);
  const maxCrew = getMaxAstronauts(player.planets.length, totalHousing, getResearchHousingCapacityBonus());
  const totalCrew = player.astronautCount;
  if (totalCrew >= maxCrew) return;
  const cost = getAstronautCost(totalCrew);
  if (!player.hireAstronaut(cost, role)) return;
  emit('astronaut_hired', { count: player.astronautCount });
  if (player.astronautCount === 1 && typeof localStorage !== 'undefined') {
    const key = 'stellar-miner-first-astronaut-toast';
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, '1');
      getPresentationPort().showMiniMilestoneToast(t('firstAstronautToast'));
    }
    tryShowNarrator('first_astronaut');
  }
  refreshAfterPlanetAction({ achievements: true });
}

/** Retrain one crew member from fromRole to toRole at coin cost. Crew count unchanged. Requires research unlock. */
export function handleRetrainCrew(fromRole: CrewRole, toRole: CrewRole): void {
  if (!isCrewRetrainUnlocked()) return;
  const session = getSession();
  if (!session) return;
  const player = session.player;
  const cost = getRetrainCost();
  if (!player.retrainCrew(fromRole, toRole, cost)) return;
  refreshAfterPlanetAction({ achievements: true });
}
