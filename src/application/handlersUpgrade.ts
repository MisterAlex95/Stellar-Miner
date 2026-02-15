import type { Player } from '../domain/entities/Player.js';
import type { Planet } from '../domain/entities/Planet.js';
import { getSession } from './gameState.js';
import { UPGRADE_CATALOG, createUpgrade, getUpgradeCost } from './catalogs.js';
import { upgradeService } from './gameState.js';
import { emit } from './eventBus.js';
import { getEffectiveUpgradeUsesSlot, getEffectiveRequiredAstronauts } from './research.js';
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

/** Whether we need a planet with a raw free slot for this upgrade (effective = after research). */
function upgradeNeedsSlot(upgradeId: string): boolean {
  return getEffectiveUpgradeUsesSlot(upgradeId);
}

/** Create upgrade for purchase: uses effective usesSlot so research slot-free works with domain. */
function createUpgradeForPurchase(def: (typeof UPGRADE_CATALOG)[0], ownedCount: number) {
  return createUpgrade(def, ownedCount, { usesSlot: upgradeNeedsSlot(def.id) });
}

export function handleUpgradeBuy(upgradeId: string, planetId?: string): void {
  const session = getSession();
  if (!session) return;
  const def = UPGRADE_CATALOG.find((d) => d.id === upgradeId);
  if (!def) return;
  const player = session.player;
  const ownedCount = player.upgrades.filter((u) => u.id === upgradeId).length;
  const upgrade = createUpgradeForPurchase(def, ownedCount);
  const targetPlanet = planetId ? player.planets.find((p) => p.id === planetId) : undefined;
  const needsSlot = upgradeNeedsSlot(upgradeId);

  if (!player.coins.gte(upgrade.cost)) return;
  if (needsSlot && !player.getPlanetWithFreeSlot()) return;
  if (planetId && targetPlanet && needsSlot && !targetPlanet.hasFreeSlot()) return;
  const crewRequired = getEffectiveRequiredAstronauts(def.id);
  if (player.astronautCount < crewRequired) return;
  if (!player.spendAstronauts(crewRequired)) return;

  const planet = resolveTargetPlanet(player, targetPlanet, needsSlot);
  if (!planet) {
    player.addAstronauts(crewRequired);
    return;
  }

  const mult = getPlanetTypeMultiplier(def.id, getPlanetType(planet.name));
  const slotCheck = needsSlot ? (p: { hasFreeSlot: () => boolean }) => p.hasFreeSlot() : undefined;
  const event = upgradeService.purchaseUpgrade(player, upgrade, planet, mult, slotCheck);
  if (!event) {
    player.addAstronauts(crewRequired);
    return;
  }

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
  const needsSlot = upgradeNeedsSlot(upgradeId);
  const crewRequired = getEffectiveRequiredAstronauts(def.id);
  let ownedCount = player.upgrades.filter((u) => u.id === upgradeId).length;
  let bought = 0;

  while (true) {
    const nextCost = getUpgradeCost(def, ownedCount);
    if (!player.coins.gte(nextCost) || player.astronautCount < crewRequired) break;

    const target = resolveTargetPlanet(
      player,
      planetId ? player.planets.find((p) => p.id === planetId) ?? null : null,
      needsSlot
    );
    if (!target) break;
    if (!player.spendAstronauts(crewRequired)) break;

    const upgrade = createUpgradeForPurchase(def, ownedCount);
    const mult = getPlanetTypeMultiplier(def.id, getPlanetType(target.name));
    const slotCheck = needsSlot ? (p: { hasFreeSlot: () => boolean }) => p.hasFreeSlot() : undefined;
    const event = upgradeService.purchaseUpgrade(player, upgrade, target, mult, slotCheck);
    if (!event) {
      player.addAstronauts(crewRequired);
      break;
    }
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

function resolveTargetPlanet(
  player: Player,
  targetPlanet: Planet | null | undefined,
  needsSlot: boolean
): Planet | null {
  if (targetPlanet && player.planets.includes(targetPlanet)) {
    return needsSlot && !targetPlanet.hasFreeSlot() ? null : targetPlanet;
  }
  return needsSlot ? player.getPlanetWithFreeSlot() : player.planets[0] ?? null;
}
