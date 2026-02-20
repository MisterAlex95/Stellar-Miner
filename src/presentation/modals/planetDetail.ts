/**
 * Planet detail modal: large interactive 3D planet (three.js) with stats.
 * State is in appUI store; Vue (PlanetDetailModal.vue) renders body and mounts 3D scene.
 */
import type { Planet } from '../../domain/entities/Planet.js';
import { getSession, getSettings } from '../../application/gameState.js';
import { formatNumber } from '../../application/format.js';
import { getPlanetEffectiveProduction } from '../../application/productionHelpers.js';
import { getPlanetType } from '../../application/planetAffinity.js';
import { getCompletedSetBonusesForPlanet, getPotentialSetBonusesForPlanet } from '../../application/moduleSetBonuses.js';
import { getEffectiveUsedSlots } from '../../application/research.js';
import { getPlanetDisplayName, getSolarSystemName, PLANETS_PER_SOLAR_SYSTEM } from '../../application/solarSystems.js';
import { t, tParam } from '../../application/strings.js';
import { getPresentationPort } from '../../application/uiBridge.js';
import { openOverlay, closeOverlay } from '../lib/overlay.js';
import { HOUSING_ASTRONAUT_CAPACITY } from '../../domain/constants.js';

export const PLANET_DETAIL_OVERLAY_ID = 'planet-detail-overlay';
export const PLANET_DETAIL_OPEN_CLASS = 'planet-detail-overlay--open';

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getExtraLabel(planetName: string): string {
  const h = hashString(planetName + 'extra');
  const v = h % 10;
  if (v < 2) return t('planetDetailExtraRings');
  if (v < 4) return t('planetDetailExtraBelt');
  if (v < 5) return t('planetDetailExtraRingsBelt');
  return t('planetDetailExtraNone');
}

function getMoonCount(planetName: string): number {
  return hashString(planetName + 'moon') % 3;
}

function buildUpgradeItems(planet: Planet): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const u of planet.upgrades) {
    counts.set(u.name, (counts.get(u.name) ?? 0) + 1);
  }
  for (const inst of planet.installingUpgrades) {
    const label = inst.upgrade.name + ' \u23F3';
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
}

/**
 * Opens the planet detail modal for the given planet ID.
 */
export function openPlanetDetail(planetId: string): void {
  const session = getSession();
  if (!session) return;
  const playerPlanets = session.player.planets;
  const planetIndex = playerPlanets.findIndex((p) => p.id === planetId);
  if (planetIndex < 0) return;
  const planet = playerPlanets[planetIndex];
  const settings = getSettings();
  const compact = settings.compactNumbers;

  const displayName = getPlanetDisplayName(planet.name, planetIndex);
  const systemIndex = Math.floor(planetIndex / PLANETS_PER_SOLAR_SYSTEM);
  const systemName = getSolarSystemName(systemIndex);
  const planetType = getPlanetType(planet.name);
  const typeLabel = planetType.charAt(0).toUpperCase() + planetType.slice(1);
  const effectiveUsed = getEffectiveUsedSlots(planet);
  const planetProd = getPlanetEffectiveProduction(planet, session);
  const prodStr = formatNumber(planetProd, compact);
  const moonCount = getMoonCount(planet.name);
  const extraLabel = getExtraLabel(planet.name);

  const housingLine = planet.housingCount > 0
    ? tParam('planetDetailHousingModules', { n: String(planet.housingCount), crew: String(planet.housingCount * HOUSING_ASTRONAUT_CAPACITY) })
    : t('planetDetailNoHousing');

  const crewLine = planet.maxAssignedCrew > 0
    ? tParam('planetDetailCrewLine', { n: String(planet.assignedCrew), max: String(planet.maxAssignedCrew) })
    : t('planetDetailNoCrew');

  const activeSetBonuses = getCompletedSetBonusesForPlanet(planet).map((b) => ({
    moduleName: b.moduleName,
    count: b.count,
    bonusPercent: b.bonusPercent,
    planetTypes: b.planetTypes,
  }));
  const potentialSetBonuses = getPotentialSetBonusesForPlanet(planet).map((b) => ({
    moduleName: b.moduleName,
    current: b.current,
    required: b.required,
    bonusPercent: b.bonusPercent,
    planetTypes: b.planetTypes,
  }));

  getPresentationPort().setPlanetDetailData({
    planetId: planet.id,
    planetName: planet.name,
    planetType,
    visualSeed: planet.visualSeed ?? 0,
    displayName,
    systemName,
    typeLabel,
    prodStr,
    effectiveUsed,
    maxUpgrades: planet.maxUpgrades,
    housingLine,
    crewLine,
    moonCount,
    extraLabel,
    upgradeItems: buildUpgradeItems(planet),
    discoveryFlavor: planet.discoveryFlavor,
    activeSetBonuses,
    potentialSetBonuses,
  });

  openOverlay(PLANET_DETAIL_OVERLAY_ID, PLANET_DETAIL_OPEN_CLASS, {
    focusId: 'planet-detail-close',
  });
}

export function closePlanetDetail(): void {
  closeOverlay(PLANET_DETAIL_OVERLAY_ID, PLANET_DETAIL_OPEN_CLASS);
}
