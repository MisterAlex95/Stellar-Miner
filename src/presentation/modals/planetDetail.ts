/**
 * Planet detail modal: large interactive 3D planet (three.js) with stats.
 * Opens when clicking a planet preview in the planet list.
 */
import type { Planet } from '../../domain/entities/Planet.js';
import { getSession, getSettings } from '../../application/gameState.js';
import { formatNumber } from '../../application/format.js';
import { getPlanetEffectiveProduction } from '../../application/productionHelpers.js';
import { getPlanetType } from '../../application/planetAffinity.js';
import { getEffectiveUsedSlots } from '../../application/research.js';
import { getPlanetDisplayName, getSolarSystemName, PLANETS_PER_SOLAR_SYSTEM } from '../../application/solarSystems.js';
import { t, tParam } from '../../application/strings.js';
import { openOverlay, closeOverlay } from '../vue/lib/overlay.js';
import { escapeAttr } from '../vue/lib/domUtils.js';
import { HOUSING_ASTRONAUT_CAPACITY } from '../../domain/constants.js';
import { createPlanetScene, type PlanetScene } from '../canvas/planetDetail3D.js';

export const PLANET_DETAIL_OVERLAY_ID = 'planet-detail-overlay';
export const PLANET_DETAIL_OPEN_CLASS = 'planet-detail-overlay--open';

let currentScene: PlanetScene | null = null;
let resizeObserver: ResizeObserver | null = null;

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function buildUpgradeCountsHtml(planet: Planet): string {
  const counts = new Map<string, number>();
  for (const u of planet.upgrades) {
    counts.set(u.name, (counts.get(u.name) ?? 0) + 1);
  }
  for (const inst of planet.installingUpgrades) {
    const label = inst.upgrade.name + ' \u23F3';
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  if (counts.size === 0) return `<p class="planet-detail-empty">${t('planetDetailNoUpgrades')}</p>`;
  const lines = Array.from(counts.entries())
    .map(([name, count]) => `<li class="planet-detail-upgrade-item"><span class="planet-detail-upgrade-name">${escapeAttr(name)}</span><span class="planet-detail-upgrade-count">\u00D7${count}</span></li>`)
    .join('');
  return `<ul class="planet-detail-upgrade-list">${lines}</ul>`;
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

  const body = document.getElementById('planet-detail-body');
  if (!body) return;

  /* dispose previous scene if any */
  disposeScene();

  body.innerHTML = `
    <div class="planet-detail-visual" id="planet-detail-3d-container">
      <p class="planet-detail-drag-hint">${t('planetDetailDragHint')}</p>
    </div>
    <div class="planet-detail-info">
      <h3 class="planet-detail-name">${escapeAttr(displayName)}</h3>
      <div class="planet-detail-stats">
        <div class="planet-detail-stat">
          <span class="planet-detail-stat-label">${t('planetDetailSystem')}</span>
          <span class="planet-detail-stat-value">${escapeAttr(systemName)}</span>
        </div>
        <div class="planet-detail-stat">
          <span class="planet-detail-stat-label">${t('planetDetailType')}</span>
          <span class="planet-detail-stat-value planet-detail-type planet-detail-type--${planetType}">${typeLabel}</span>
        </div>
        <div class="planet-detail-stat">
          <span class="planet-detail-stat-label">${t('planetDetailProduction')}</span>
          <span class="planet-detail-stat-value planet-detail-stat-value--prod">${prodStr}/s</span>
        </div>
        <div class="planet-detail-stat">
          <span class="planet-detail-stat-label">${t('planetDetailSlots')}</span>
          <span class="planet-detail-stat-value"><span class="planet-detail-stat-accent">${effectiveUsed}</span>/${planet.maxUpgrades}</span>
        </div>
        <div class="planet-detail-stat">
          <span class="planet-detail-stat-label">${t('planetDetailHousing')}</span>
          <span class="planet-detail-stat-value">${housingLine}</span>
        </div>
        <div class="planet-detail-stat">
          <span class="planet-detail-stat-label">${t('planetDetailCrew')}</span>
          <span class="planet-detail-stat-value">${crewLine}</span>
        </div>
        <div class="planet-detail-stat">
          <span class="planet-detail-stat-label">${t('planetDetailMoons')}</span>
          <span class="planet-detail-stat-value">${moonCount}</span>
        </div>
        <div class="planet-detail-stat">
          <span class="planet-detail-stat-label">${t('planetDetailExtra')}</span>
          <span class="planet-detail-stat-value">${extraLabel}</span>
        </div>
      </div>
      <div class="planet-detail-upgrades-section">
        <h4 class="planet-detail-upgrades-title">${t('planetDetailUpgrades')}</h4>
        ${buildUpgradeCountsHtml(planet)}
      </div>
    </div>
  `;

  /* mount three.js scene */
  const container = document.getElementById('planet-detail-3d-container');
  if (container) {
    const scene3d = createPlanetScene(planet.name, planetType, planet.visualSeed);
    currentScene = scene3d;

    scene3d.domElement.className = 'planet-detail-canvas-3d';
    container.prepend(scene3d.domElement);

    /* initial size from container */
    const rect = container.getBoundingClientRect();
    const size = Math.min(rect.width, 340);
    scene3d.resize(size, size);

    /* resize on container change */
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const s = Math.min(w, 340);
        scene3d.resize(s, s);
      }
    });
    resizeObserver.observe(container);
  }

  openOverlay(PLANET_DETAIL_OVERLAY_ID, PLANET_DETAIL_OPEN_CLASS, {
    focusId: 'planet-detail-close',
  });
}

function disposeScene(): void {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (currentScene) {
    currentScene.dispose();
    currentScene = null;
  }
}

export function closePlanetDetail(): void {
  disposeScene();
  closeOverlay(PLANET_DETAIL_OVERLAY_ID, PLANET_DETAIL_OPEN_CLASS);
}
