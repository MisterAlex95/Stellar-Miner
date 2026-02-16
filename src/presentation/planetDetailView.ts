/**
 * Planet detail modal: large interactive planet canvas with stats.
 * Opens when clicking a planet preview in the planet list or mine zone.
 */
import type { Planet } from '../domain/entities/Planet.js';
import { getSession, getSettings } from '../application/gameState.js';
import { formatNumber } from '../application/format.js';
import { getPlanetEffectiveProduction } from '../application/productionHelpers.js';
import { getPlanetType } from '../application/planetAffinity.js';
import { getEffectiveUsedSlots } from '../application/research.js';
import { getPlanetDisplayName, getSolarSystemName, PLANETS_PER_SOLAR_SYSTEM } from '../application/solarSystems.js';
import { t, tParam } from '../application/strings.js';
import { drawPlanetSphereToCanvas } from './MineZoneCanvas.js';
import { openOverlay, closeOverlay } from './components/overlay.js';
import { escapeAttr } from './components/domUtils.js';
import { HOUSING_ASTRONAUT_CAPACITY } from '../domain/constants.js';

export const PLANET_DETAIL_OVERLAY_ID = 'planet-detail-overlay';
export const PLANET_DETAIL_OPEN_CLASS = 'planet-detail-overlay--open';

const CANVAS_SIZE = 280;

let detailRafId: number | null = null;
let dragStartX = 0;
let dragOffset = 0;
let isDragging = false;
let currentPlanetName: string | null = null;
let currentVisualSeed: number | undefined = undefined;

function stopDetailLoop(): void {
  if (detailRafId !== null) {
    cancelAnimationFrame(detailRafId);
    detailRafId = null;
  }
}

function startDetailLoop(): void {
  stopDetailLoop();
  const canvas = document.getElementById('planet-detail-canvas') as HTMLCanvasElement | null;
  if (!canvas || !currentPlanetName) return;

  function tick(): void {
    if (!canvas || !currentPlanetName) return;
    const timeMs = Date.now() + dragOffset * 80;
    drawPlanetSphereToCanvas(canvas, currentPlanetName, timeMs, currentVisualSeed);
    detailRafId = requestAnimationFrame(tick);
  }
  detailRafId = requestAnimationFrame(tick);
}

function buildUpgradeCountsHtml(planet: Planet): string {
  const counts = new Map<string, number>();
  for (const u of planet.upgrades) {
    counts.set(u.name, (counts.get(u.name) ?? 0) + 1);
  }
  for (const inst of planet.installingUpgrades) {
    const label = inst.upgrade.name + ' ⏳';
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  if (counts.size === 0) return `<p class="planet-detail-empty">${t('planetDetailNoUpgrades')}</p>`;
  const lines = Array.from(counts.entries())
    .map(([name, count]) => `<li class="planet-detail-upgrade-item"><span class="planet-detail-upgrade-name">${escapeAttr(name)}</span><span class="planet-detail-upgrade-count">×${count}</span></li>`)
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

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Opens the planet detail modal for the given planet ID.
 * Finds the planet in the current session and renders the modal content.
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

  currentPlanetName = planet.name;
  currentVisualSeed = planet.visualSeed;
  dragOffset = 0;

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

  body.innerHTML = `
    <div class="planet-detail-visual">
      <canvas id="planet-detail-canvas" class="planet-detail-canvas" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}"></canvas>
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

  const canvas = document.getElementById('planet-detail-canvas') as HTMLCanvasElement | null;
  if (canvas) {
    drawPlanetSphereToCanvas(canvas, planet.name, Date.now(), planet.visualSeed);

    canvas.addEventListener('mousedown', onDragStart);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.style.cursor = 'grab';
  }

  openOverlay(PLANET_DETAIL_OVERLAY_ID, PLANET_DETAIL_OPEN_CLASS, {
    focusId: 'planet-detail-close',
  });

  startDetailLoop();
}

function onDragStart(e: MouseEvent): void {
  isDragging = true;
  dragStartX = e.clientX;
  const canvas = document.getElementById('planet-detail-canvas') as HTMLCanvasElement | null;
  if (canvas) canvas.style.cursor = 'grabbing';
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd);
}

function onDragMove(e: MouseEvent): void {
  if (!isDragging) return;
  const dx = e.clientX - dragStartX;
  dragOffset += dx;
  dragStartX = e.clientX;
}

function onDragEnd(): void {
  isDragging = false;
  const canvas = document.getElementById('planet-detail-canvas') as HTMLCanvasElement | null;
  if (canvas) canvas.style.cursor = 'grab';
  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup', onDragEnd);
}

function onTouchStart(e: TouchEvent): void {
  if (e.touches.length !== 1) return;
  e.preventDefault();
  isDragging = true;
  dragStartX = e.touches[0].clientX;
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd);
}

function onTouchMove(e: TouchEvent): void {
  if (!isDragging || e.touches.length !== 1) return;
  e.preventDefault();
  const dx = e.touches[0].clientX - dragStartX;
  dragOffset += dx;
  dragStartX = e.touches[0].clientX;
}

function onTouchEnd(): void {
  isDragging = false;
  document.removeEventListener('touchmove', onTouchMove);
  document.removeEventListener('touchend', onTouchEnd);
}

export function closePlanetDetail(): void {
  stopDetailLoop();
  currentPlanetName = null;
  currentVisualSeed = undefined;
  isDragging = false;
  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup', onDragEnd);
  document.removeEventListener('touchmove', onTouchMove);
  document.removeEventListener('touchend', onTouchEnd);
  closeOverlay(PLANET_DETAIL_OVERLAY_ID, PLANET_DETAIL_OPEN_CLASS);
}
