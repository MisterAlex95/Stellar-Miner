import { getSession } from './gameState.js';
import { planetService } from './gameState.js';
import { getMaxAstronauts, getAstronautCost } from '../domain/constants.js';
import { getAssignedAstronauts } from './crewHelpers.js';
import { hasEffectiveFreeSlot } from './research.js';
import { emit } from './eventBus.js';
import { updateStats } from '../presentation/statsView.js';
import { renderUpgradeList } from '../presentation/upgradeListView.js';
import { renderPlanetList } from '../presentation/planetListView.js';
import { renderCrewSection } from '../presentation/crewView.js';
import { showMiniMilestoneToast } from '../presentation/toasts.js';
import { checkAchievements } from './achievements.js';
import { t, tParam } from './strings.js';
import { saveSession } from './handlersSave.js';

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
}

export function handleBuildHousing(planetId: string): void {
  const session = getSession();
  if (!session) return;
  const planet = session.player.planets.find((p) => p.id === planetId);
  if (!planet || !planetService.canBuildHousing(session.player, planet, hasEffectiveFreeSlot)) return;
  planetService.buildHousing(session.player, planet, hasEffectiveFreeSlot);
  saveSession();
  updateStats();
  renderUpgradeList();
  renderPlanetList();
  renderCrewSection();
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
      showMiniMilestoneToast(t('firstAstronautToast'));
    }
  }
  saveSession();
  updateStats();
  renderUpgradeList();
  renderPlanetList();
  renderCrewSection();
  checkAchievements();
}
