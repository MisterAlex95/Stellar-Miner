/**
 * Modal to choose a planet for install (Install/Max) or uninstall when the player has multiple planets.
 * List is rendered by UpgradeChoosePlanetModal.vue from appUI.upgradeChoosePlanet.
 */
import { getSession, getSettings } from '../../application/gameState.js';
import { getEffectiveUpgradeUsesSlot } from '../../application/research.js';
import { getEffectiveUsedSlots } from '../../application/research.js';
import { getPlanetEffectiveProduction } from '../../application/productionHelpers.js';
import { getPlanetType, getBestPlanetTypes } from '../../application/planetAffinity.js';
import { getPlanetDisplayName } from '../../application/solarSystems.js';
import { formatNumber } from '../../application/format.js';
import {
  handleUpgradeBuy,
  handleUpgradeBuyMax,
  handleUpgradeUninstall,
} from '../../application/handlers.js';
import { openOverlay, closeOverlay } from './lib/overlay.js';
import { getPinia } from './piniaInstance.js';
import { useAppUIStore } from './stores/appUI.js';

const OVERLAY_ID = 'upgrade-choose-planet-overlay';
const OPEN_CLASS = 'upgrade-choose-planet-overlay--open';

export type UpgradeChoosePlanetAction = 'buy' | 'max' | 'uninstall';

export function closeUpgradeChoosePlanetModal(): void {
  document.body.style.overflow = '';
  const pinia = getPinia();
  if (pinia) useAppUIStore(pinia).setUpgradeChoosePlanet(null);
  closeOverlay(OVERLAY_ID, OPEN_CLASS);
}

export function openUpgradeChoosePlanetModal(opts: {
  upgradeId: string;
  action: UpgradeChoosePlanetAction;
  planets: { id: string; name: string }[];
  maxCount?: number;
}): void {
  const { upgradeId, action, planets, maxCount } = opts;
  const overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) return;

  const session = getSession();
  const settings = getSettings();
  const bestTypesLower =
    action === 'buy' || action === 'max'
      ? getBestPlanetTypes(upgradeId).map((t) => t.toLowerCase())
      : [];
  const extendedPlanets = planets.map((p) => {
    const full = session?.player.planets.find((pl) => pl.id === p.id);
    const usedSlots = full ? getEffectiveUsedSlots(full) : 0;
    const maxUpgrades = full?.maxUpgrades ?? 0;
    const prod = full && session ? getPlanetEffectiveProduction(full, session) : 0;
    const productionStr = formatNumber(Number(prod), settings.compactNumbers);
    const planetType = full ? getPlanetType(full.name) : 'rocky';
    const installedCount = full ? full.upgrades.filter((u) => u.id === upgradeId).length : 0;
    const isRecommended =
      bestTypesLower.length > 0 && full !== undefined && bestTypesLower.includes(planetType);
    const idx = session?.player.planets.findIndex((pl) => pl.id === p.id) ?? 0;
    return {
      id: p.id,
      name: p.name,
      displayName: getPlanetDisplayName(p.name, idx >= 0 ? idx : 0),
      usedSlots,
      maxUpgrades,
      installedCount,
      productionStr,
      planetType,
      visualSeed: full?.visualSeed ?? 0,
      isRecommended,
    };
  });

  const pinia = getPinia();
  if (pinia) {
    useAppUIStore(pinia).setUpgradeChoosePlanet({
      upgradeId,
      action,
      planets: extendedPlanets,
      maxCount,
    });
  }
  document.body.style.overflow = 'hidden';
  openOverlay(OVERLAY_ID, OPEN_CLASS);
}

/** Called from Vue when user selects a planet. Progress overlays are handled by UpgradeCard.vue. */
export function onPlanetChosen(
  upgradeId: string,
  planetId: string,
  action: UpgradeChoosePlanetAction,
  maxCount?: number,
): void {
  closeUpgradeChoosePlanetModal();
  if (action === 'uninstall') {
    handleUpgradeUninstall(upgradeId, planetId);
  } else if (action === 'max') {
    handleUpgradeBuyMax(upgradeId, planetId, maxCount);
  } else {
    handleUpgradeBuy(upgradeId, planetId);
  }
}

/** No-op: list is rendered by UpgradeChoosePlanetModal.vue. */
export function bindUpgradeChoosePlanetModal(): void {}

/** Returns list of planets for install: with free slot if upgrade needs slot, else all. */
export function getPlanetsForInstallModal(upgradeId: string): { id: string; name: string }[] {
  const session = getSession();
  if (!session) return [];
  const player = session.player;
  const needsSlot = getEffectiveUpgradeUsesSlot(upgradeId);
  const planets = needsSlot ? player.getPlanetsWithFreeSlot() : player.planets;
  return planets.map((p) => {
    const idx = player.planets.findIndex((pl) => pl.id === p.id);
    return { id: p.id, name: getPlanetDisplayName(p.name, idx >= 0 ? idx : 0) };
  });
}
