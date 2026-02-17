import {
  getSession,
  planetService,
  getExpeditionEndsAt,
  getExpeditionComposition,
  getExpeditionDifficulty,
  clearExpedition,
  setExpeditionInProgress,
} from './gameState.js';
import { getMaxAstronauts, getAstronautCost, RESEARCH_DATA_PER_EXPEDITION_SUCCESS, type CrewRole } from '../domain/constants.js';
import type { ExpeditionComposition } from '../domain/constants.js';
import type { ExpeditionTierId } from '../domain/constants.js';
import { getAssignedAstronauts } from './crewHelpers.js';
import { hasEffectiveFreeSlot, getResearchExpeditionDurationPercent, getResearchExpeditionDeathChancePercent, getResearchHousingCapacityBonus, addResearchData } from './research.js';
import { emit } from './eventBus.js';
import { notifyRefresh } from './refreshSignal.js';
import { getPresentationPort } from './uiBridge.js';
import { checkAchievements } from './achievements.js';
import { t, tParam } from './strings.js';

function refreshAfterPlanetAction(opts: { achievements?: boolean } = {}): void {
  notifyRefresh();
  if (opts.achievements) checkAchievements();
}

/** Launch expedition with default composition and medium tier (e.g. for tests or programmatic launch). */
export function handleBuyNewPlanet(): void {
  const session = getSession();
  if (!session) return;
  const player = session.player;
  if (getExpeditionEndsAt() !== null) return;
  if (!planetService.canLaunchExpedition(player)) return;
  const result = planetService.startExpedition(player, null, 'medium');
  if (!result.started) return;
  const durationMs = planetService.getExpeditionDurationMs(player, 'medium', result.composition.pilot ?? 0, getResearchExpeditionDurationPercent());
  const endsAt = Date.now() + durationMs;
  setExpeditionInProgress(endsAt, result.composition, durationMs, 'medium');
  refreshAfterPlanetAction();
}

/** Launch expedition from modal: tier + crew composition. */
export function handleLaunchExpeditionFromModal(tierId: ExpeditionTierId, composition: ExpeditionComposition): void {
  const session = getSession();
  if (!session) return;
  const player = session.player;
  if (getExpeditionEndsAt() !== null) return;
  if (!planetService.canLaunchExpedition(player, composition)) return;
  const result = planetService.startExpedition(player, composition, tierId);
  if (!result.started) return;
  const durationMs = planetService.getExpeditionDurationMs(player, tierId, result.composition.pilot ?? 0, getResearchExpeditionDurationPercent());
  const endsAt = Date.now() + durationMs;
  setExpeditionInProgress(endsAt, result.composition, durationMs, tierId);
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
  const player = session.player;
  const wasFirstPlanet = player.planets.length === 1;
  const outcome = planetService.completeExpedition(player, composition, tierId, Math.random, getResearchExpeditionDeathChancePercent());
  clearExpedition();
  const ui = getPresentationPort();
  if (outcome.success && outcome.planetName) {
    addResearchData(RESEARCH_DATA_PER_EXPEDITION_SUCCESS);
    emit('planet_bought', { planetCount: player.planets.length });
    if (outcome.deaths > 0) {
      ui.showMiniMilestoneToast(tParam('expeditionDiscoveredWithDeaths', {
        name: outcome.planetName,
        survivors: outcome.survivors,
        deaths: outcome.deaths,
      }));
    } else {
      ui.showMiniMilestoneToast(tParam('expeditionDiscoveredAllReturned', {
        name: outcome.planetName,
        survivors: outcome.survivors,
      }));
    }
    if (wasFirstPlanet && typeof localStorage !== 'undefined') {
      const key = 'stellar-miner-first-planet-toast';
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '1');
        ui.showMiniMilestoneToast(t('firstNewPlanetToast'));
      }
    }
  } else {
    ui.showMiniMilestoneToast(tParam('expeditionFailed', { n: outcome.totalSent }));
  }
  refreshAfterPlanetAction({ achievements: true });
}

/** Cancel the current expedition: refund coins and crew, no planet discovered. */
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
  const cost = planetService.getNewPlanetCost(player);
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
  refreshAfterPlanetAction();
}

export function handleBuildHousing(planetId: string): void {
  const session = getSession();
  if (!session) return;
  const planet = session.player.planets.find((p) => p.id === planetId);
  if (!planet || !planetService.canBuildHousing(session.player, planet, hasEffectiveFreeSlot)) return;
  planetService.buildHousing(session.player, planet, hasEffectiveFreeSlot);
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
  }
  refreshAfterPlanetAction({ achievements: true });
}
