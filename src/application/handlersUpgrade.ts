import { getSession } from './gameState.js';
import { UPGRADE_CATALOG, createUpgrade, getUpgradeCost } from './catalogs.js';
import { upgradeService } from './gameState.js';
import { emit } from './eventBus.js';
import {
  getEffectiveUpgradeUsesSlot,
  getEffectiveRequiredAstronauts,
  getPlanetWithEffectiveFreeSlot,
  getPlanetsWithEffectiveFreeSlot,
  hasEffectiveFreeSlot,
} from './research.js';
import { getPlanetType, getPlanetTypeMultiplier } from './planetAffinity.js';
import { updateStats } from '../presentation/statsView.js';
import { renderUpgradeList, flashUpgradeCard } from '../presentation/upgradeListView.js';
import { renderPlanetList } from '../presentation/planetListView.js';
import { renderCrewSection } from '../presentation/crewView.js';
import { renderQuestSection } from '../presentation/questView.js';
import { showMiniMilestoneToast } from '../presentation/toasts.js';
import { checkAchievements } from './achievements.js';
import { t } from './strings.js';
import { saveSession } from './handlersSave.js';

export function handleUpgradeBuy(upgradeId: string, planetId?: string): void {
  const session = getSession();
  if (!session) return;
  const def = UPGRADE_CATALOG.find((d) => d.id === upgradeId);
  if (!def) return;
  const player = session.player;
  const ownedCount = player.upgrades.filter((u) => u.id === upgradeId).length;
  const upgrade = createUpgrade(def, ownedCount);
  const targetPlanet = planetId ? player.planets.find((p) => p.id === planetId) : undefined;
  const needsSlot = getEffectiveUpgradeUsesSlot(def.id);
  if (!player.coins.gte(upgrade.cost)) return;
  if (needsSlot && !getPlanetWithEffectiveFreeSlot(player)) return;
  if (planetId && targetPlanet && needsSlot && !hasEffectiveFreeSlot(targetPlanet)) return;
  const crewRequired = getEffectiveRequiredAstronauts(def.id);
  if (player.astronautCount < crewRequired) return;
  if (!player.spendAstronauts(crewRequired)) return;
  let planet = targetPlanet && player.planets.includes(targetPlanet)
    ? (needsSlot ? (hasEffectiveFreeSlot(targetPlanet) ? targetPlanet : null) : targetPlanet)
    : (needsSlot ? getPlanetWithEffectiveFreeSlot(player) : player.planets[0] ?? null);
  if (!planet) return;
  const mult = getPlanetTypeMultiplier(def.id, getPlanetType(planet.id));
  upgradeService.purchaseUpgrade(player, upgrade, planet, mult, hasEffectiveFreeSlot);
  emit('upgrade_purchased', { upgradeId, planetId });
  if (player.upgrades.length === 1 && typeof localStorage !== 'undefined') {
    const key = 'stellar-miner-first-upgrade-toast';
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, '1');
      showMiniMilestoneToast(t('firstUpgradeToast'));
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
  const needsSlot = getEffectiveUpgradeUsesSlot(def.id);
  let bought = 0;
  const crewRequired = getEffectiveRequiredAstronauts(def.id);
  let ownedCount = player.upgrades.filter((u) => u.id === upgradeId).length;
  while (true) {
    const nextCost = getUpgradeCost(def, ownedCount);
    if (!player.coins.gte(nextCost) || player.astronautCount < crewRequired) break;
    let target: typeof player.planets[0] | null = planetId ? player.planets.find((p) => p.id === planetId) ?? null : null;
    if (needsSlot) {
      const withSlot = getPlanetsWithEffectiveFreeSlot(player);
      if (!target || !hasEffectiveFreeSlot(target)) target = withSlot[0] ?? null;
    } else {
      target = target ?? player.planets[0] ?? null;
    }
    if (!target) break;
    if (!player.spendAstronauts(crewRequired)) break;
    const upgrade = createUpgrade(def, ownedCount);
    const mult = getPlanetTypeMultiplier(def.id, getPlanetType(target.id));
    upgradeService.purchaseUpgrade(player, upgrade, target, mult, hasEffectiveFreeSlot);
    bought++;
    ownedCount++;
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
