import {
  getSession,
  planetService,
  getExpeditionEndsAt,
  getExpeditionComposition,
  clearExpedition,
  setExpeditionInProgress,
} from './gameState.js';
import { getMaxAstronauts, getAstronautCost, getExpeditionDurationMs, type CrewRole } from '../domain/constants.js';
import { getAssignedAstronauts } from './crewHelpers.js';
import { hasEffectiveFreeSlot } from './research.js';
import { emit } from './eventBus.js';
import { notifyRefresh } from './refreshSignal.js';
import { showMiniMilestoneToast } from '../presentation/toasts.js';
import { checkAchievements } from './achievements.js';
import { t, tParam } from './strings.js';

function refreshAfterPlanetAction(opts: { achievements?: boolean } = {}): void {
  notifyRefresh();
  if (opts.achievements) checkAchievements();
}

export function handleBuyNewPlanet(): void {
  const session = getSession();
  if (!session) return;
  const player = session.player;
  if (getExpeditionEndsAt() !== null) return; // expedition already in progress
  if (!planetService.canLaunchExpedition(player)) return;
  const result = planetService.startExpedition(player);
  if (!result.started) return;
  const durationMs = getExpeditionDurationMs(player.planets.length);
  const endsAt = Date.now() + durationMs;
  setExpeditionInProgress(endsAt, result.composition, durationMs);
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
  const player = session.player;
  const wasFirstPlanet = player.planets.length === 1;
  const outcome = planetService.completeExpedition(player, composition, Math.random);
  clearExpedition();
  if (outcome.success && outcome.planetName) {
    emit('planet_bought', { planetCount: player.planets.length });
    if (outcome.deaths > 0) {
      showMiniMilestoneToast(tParam('expeditionDiscoveredWithDeaths', {
        name: outcome.planetName,
        survivors: outcome.survivors,
        deaths: outcome.deaths,
      }));
    } else {
      showMiniMilestoneToast(tParam('expeditionDiscoveredAllReturned', {
        name: outcome.planetName,
        survivors: outcome.survivors,
      }));
    }
    if (wasFirstPlanet && typeof localStorage !== 'undefined') {
      const key = 'stellar-miner-first-planet-toast';
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '1');
        showMiniMilestoneToast(t('firstNewPlanetToast'));
      }
    }
  } else {
    showMiniMilestoneToast(tParam('expeditionFailed', { n: outcome.totalSent }));
  }
  refreshAfterPlanetAction({ achievements: true });
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
  const maxCrew = getMaxAstronauts(player.planets.length, totalHousing);
  const totalCrew = player.astronautCount;
  if (totalCrew >= maxCrew) return;
  const cost = getAstronautCost(totalCrew);
  if (!player.hireAstronaut(cost, role)) return;
  emit('astronaut_hired', { count: player.astronautCount });
  if (player.astronautCount === 1 && typeof localStorage !== 'undefined') {
    const key = 'stellar-miner-first-astronaut-toast';
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, '1');
      showMiniMilestoneToast(t('firstAstronautToast'));
    }
  }
  refreshAfterPlanetAction({ achievements: true });
}
