import type { Planet } from '../domain/entities/Planet.js';
import type { Player } from '../domain/entities/Player.js';
import type { GameSession } from '../domain/aggregates/GameSession.js';
import {
  getSession,
  getSettings,
  planetService,
  getExpeditionEndsAt,
  getExpeditionDurationMs,
} from '../application/gameState.js';
import { formatNumber } from '../application/format.js';
import { getPlanetEffectiveProduction } from '../application/productionHelpers.js';
import { getPlanetType } from '../application/planetAffinity.js';
import { getEffectiveUsedSlots, hasEffectiveFreeSlot } from '../application/research.js';
import { getPlanetDisplayName, getSolarSystemName, PLANETS_PER_SOLAR_SYSTEM } from '../application/solarSystems.js';
import { t, tParam } from '../application/strings.js';
import { drawPlanetSphereToCanvas } from './MineZoneCanvas.js';
import { buttonWithTooltipHtml, updateTooltipForButton } from './components/buttonTooltip.js';
import { escapeAttr } from './components/domUtils.js';
import { HOUSING_ASTRONAUT_CAPACITY } from '../domain/constants.js';

/** Which solar system indices are collapsed (persisted for the session across re-renders). */
const collapsedSolarSystems = new Set<number>();

let planetThumbnailRafId: number | null = null;

function planetThumbnailTick(): void {
  const listEl = document.getElementById('planet-list');
  if (listEl) {
    const timeMs = Date.now();
    listEl.querySelectorAll<HTMLCanvasElement>('.planet-card-visual').forEach((canvas) => {
      const planetName = canvas.getAttribute('data-planet-name');
      const seedAttr = canvas.getAttribute('data-planet-visual-seed');
      const visualSeed = seedAttr !== null && seedAttr !== '' ? parseInt(seedAttr, 10) : undefined;
      if (planetName) drawPlanetSphereToCanvas(canvas, planetName, timeMs, visualSeed);
    });
  }
  planetThumbnailRafId = requestAnimationFrame(planetThumbnailTick);
}

function startPlanetThumbnailLoop(): void {
  if (planetThumbnailRafId !== null) return;
  planetThumbnailRafId = requestAnimationFrame(planetThumbnailTick);
}

function buildPlanetCardHtml(
  p: Planet,
  index: number,
  player: Player,
  session: GameSession,
  settings: { compactNumbers: boolean }
): string {
  const planetDisplayName = (pl: { name: string }, i: number) => getPlanetDisplayName(pl.name, i);
  const addSlotCost = planetService.getAddSlotCost(p);
  const canAddSlot = planetService.canAddSlot(player, p);
  const slotBtnTitle = canAddSlot ? tParam('addSlotTooltip', { cost: formatNumber(addSlotCost, settings.compactNumbers) }) : tParam('needCoinsForSlot', { cost: formatNumber(addSlotCost, settings.compactNumbers) });
  const planetProd = getPlanetEffectiveProduction(p, session);
  const prodStr = formatNumber(planetProd, settings.compactNumbers);
  const prodClass = planetProd.gt(0) ? 'planet-card-production' : 'planet-card-production planet-card-production--zero';
  const prodLine = `<div class="${prodClass}">${prodStr}/s</div>`;
  const effectiveUsed = getEffectiveUsedSlots(p);
  const cardTitle = player.planets.length > 1
    ? tParam('planetCardTitleProd', { used: effectiveUsed, max: p.maxUpgrades, pct: String((player.planets.length - 1) * 5) })
    : tParam('planetCardTitle', { used: effectiveUsed, max: p.maxUpgrades });
  const planetType = getPlanetType(p.name);
  const typeLabel = planetType.charAt(0).toUpperCase() + planetType.slice(1);
  const lines: string[] = [
    planetDisplayName(p, index),
    `${t('planetInfoType')}: ${typeLabel}`,
    `${t('planetInfoSlots')}: ${effectiveUsed}/${p.maxUpgrades}`,
    `${t('planetInfoProduction')}: ${prodStr}/s`,
  ];
  if (p.housingCount > 0) {
    const crewCap = p.housingCount * HOUSING_ASTRONAUT_CAPACITY;
    lines.push(`${t('planetInfoHousing')}: ${tParam('planetInfoHousingLine', { n: String(p.housingCount), crew: String(crewCap) })}`);
  }
  const planetInfoTooltip = lines.join('\n');
  const hasSlot = hasEffectiveFreeSlot(p);
  const housingCost = planetService.getHousingCost(p);
  const canBuildHousing = planetService.canBuildHousing(player, p, hasEffectiveFreeSlot);
  const housingTooltip = canBuildHousing
    ? tParam('housingBuildTooltip', { planet: planetDisplayName(p, index), cost: formatNumber(housingCost, settings.compactNumbers), capacity: HOUSING_ASTRONAUT_CAPACITY })
    : tParam('needCoinsForHousing', { cost: formatNumber(housingCost, settings.compactNumbers) });
  const housingBtn = hasSlot
    ? buttonWithTooltipHtml(housingTooltip, `<button type="button" class="build-housing-btn" data-planet-id="${p.id}" ${canBuildHousing ? '' : 'disabled'}>${tParam('buildHousingBtn', { cost: formatNumber(housingCost, settings.compactNumbers) })}</button>`)
    : '';
  return `<div class="planet-card" data-planet-id="${p.id}" title="${cardTitle}">
    <div class="planet-card-header">
      <canvas class="planet-card-visual" width="72" height="48" data-planet-id="${p.id}" data-planet-name="${escapeAttr(p.name)}" data-planet-visual-seed="${p.visualSeed ?? ''}" aria-hidden="true"></canvas>
      <div class="planet-card-name-wrap">
        <span class="planet-card-name">${planetDisplayName(p, index)}</span>
        ${buttonWithTooltipHtml(planetInfoTooltip, `<span class="planet-card-info" aria-label="${t('planetInfoTitle')}">ℹ</span>`, 'planet-card-info-wrap')}
      </div>
    </div>
    <div class="planet-card-slots"><span class="planet-slot-value">${effectiveUsed}/${p.maxUpgrades}</span> ${t('slots')}</div>
    ${prodLine}
    <div class="planet-card-actions">
      ${buttonWithTooltipHtml(slotBtnTitle, `<button type="button" class="add-slot-btn" data-planet-id="${p.id}" ${canAddSlot ? '' : 'disabled'}>${tParam('addSlotBtn', { cost: formatNumber(addSlotCost, settings.compactNumbers) })}</button>`)}
      ${housingBtn}
    </div>
  </div>`;
}

export function renderPlanetList(): void {
  const session = getSession();
  if (!session) return;
  const listEl = document.getElementById('planet-list');
  if (!listEl) return;
  const player = session.player;
  const settings = getSettings();
  const cost = planetService.getNewPlanetCost(player);
  const astronautsRequired = planetService.getExpeditionAstronautsRequired(player);
  const canLaunch = planetService.canLaunchExpedition(player);

  const groups: { systemIndex: number; systemName: string; planets: { planet: Planet; index: number }[] }[] = [];
  player.planets.forEach((p, index) => {
    const systemIndex = Math.floor(index / PLANETS_PER_SOLAR_SYSTEM);
    const systemName = getSolarSystemName(systemIndex);
    let group = groups.find((g) => g.systemIndex === systemIndex);
    if (!group) {
      group = { systemIndex, systemName, planets: [] };
      groups.push(group);
    }
    group.planets.push({ planet: p, index });
  });

  const sectionsHtml = groups
    .map((g) => {
      const isCollapsed = collapsedSolarSystems.has(g.systemIndex);
      const expanded = !isCollapsed;
      const toggleTitle = expanded ? t('collapseSection') : t('expandSection');
      const toggleIcon = expanded ? '▼' : '▶';
      const cardsHtml = g.planets
        .map(({ planet, index }) => buildPlanetCardHtml(planet, index, player, session, settings))
        .join('');
      return `<section class="planet-system ${isCollapsed ? 'planet-system--collapsed' : ''}" data-system-index="${g.systemIndex}" aria-label="${escapeAttr(g.systemName)}">
        <button type="button" class="planet-system-header" aria-expanded="${expanded}" aria-controls="planet-system-planets-${g.systemIndex}" id="planet-system-toggle-${g.systemIndex}" title="${toggleTitle}">
          <span class="planet-system-toggle-icon" aria-hidden="true">${toggleIcon}</span>
          <span class="planet-system-name">${escapeAttr(g.systemName)}</span>
        </button>
        <div class="planet-system-planets" id="planet-system-planets-${g.systemIndex}" role="region" aria-labelledby="planet-system-toggle-${g.systemIndex}">${cardsHtml}</div>
      </section>`;
    })
    .join('');

  listEl.innerHTML = sectionsHtml;

  listEl.querySelectorAll<HTMLElement>('.planet-system-header').forEach((btn) => {
    btn.addEventListener('click', () => {
      const section = btn.closest('.planet-system');
      const systemIndexStr = section?.getAttribute('data-system-index');
      if (section && systemIndexStr !== null) {
        const systemIndex = Number(systemIndexStr);
        const isCollapsed = section.classList.toggle('planet-system--collapsed');
        if (isCollapsed) collapsedSolarSystems.add(systemIndex);
        else collapsedSolarSystems.delete(systemIndex);
        btn.setAttribute('aria-expanded', String(!isCollapsed));
        btn.setAttribute('title', isCollapsed ? t('expandSection') : t('collapseSection'));
        const icon = btn.querySelector('.planet-system-toggle-icon');
        if (icon) icon.textContent = isCollapsed ? '▶' : '▼';
      }
    });
  });

  listEl.querySelectorAll<HTMLCanvasElement>('.planet-card-visual').forEach((canvas) => {
    const planetName = canvas.getAttribute('data-planet-name');
    const seedAttr = canvas.getAttribute('data-planet-visual-seed');
    const visualSeed = seedAttr !== null && seedAttr !== '' ? parseInt(seedAttr, 10) : undefined;
    if (planetName) drawPlanetSphereToCanvas(canvas, planetName, Date.now(), visualSeed);
  });
  startPlanetThumbnailLoop();
  const expeditionArea = document.getElementById('expedition-area');
  const endsAt = getExpeditionEndsAt();
  const inProgress = endsAt != null;
  if (expeditionArea) {
    if (inProgress) {
      const durationMs = getExpeditionDurationMs();
      const remaining = Math.max(0, endsAt - Date.now());
      const progress = durationMs > 0 ? 1 - remaining / durationMs : 0;
      expeditionArea.innerHTML = `
        <div class="expedition-progress-wrap" id="expedition-progress-wrap">
          <div class="expedition-progress-bar-wrap"><div class="expedition-progress-fill" id="expedition-progress-fill" style="width: ${Math.min(100, progress * 100).toFixed(1)}%"></div></div>
          <p class="expedition-progress-text" id="expedition-progress-text">${tParam('expeditionInProgress', { seconds: String(Math.ceil(remaining / 1000)) })}</p>
        </div>`;
    } else {
      const tooltipText = canLaunch
        ? tParam('sendExpeditionTooltip', { n: astronautsRequired, cost: formatNumber(cost, settings.compactNumbers) })
        : tParam('needForExpedition', { cost: formatNumber(cost, settings.compactNumbers), n: astronautsRequired });
      const btnHtml = `<button type="button" class="buy-planet-btn" id="buy-planet-btn" ${canLaunch ? '' : 'disabled'}>${tParam('sendExpeditionBtn', { cost: formatNumber(cost, settings.compactNumbers), n: astronautsRequired })}</button>`;
      expeditionArea.innerHTML = buttonWithTooltipHtml(tooltipText, btnHtml);
      const buyPlanetBtn = expeditionArea.querySelector('#buy-planet-btn');
      if (buyPlanetBtn) updateTooltipForButton(buyPlanetBtn as HTMLElement, tooltipText);
    }
  }
}

function updateExpeditionProgressDom(
  wrap: HTMLElement,
  endsAt: number,
  durationMs: number
): void {
  const now = Date.now();
  const remaining = Math.max(0, endsAt - now);
  const progress = durationMs > 0 ? 1 - remaining / durationMs : 1;
  const fill = wrap.querySelector('#expedition-progress-fill') as HTMLElement | null;
  const text = wrap.querySelector('#expedition-progress-text') as HTMLElement | null;
  if (fill) fill.style.width = `${Math.min(100, progress * 100).toFixed(1)}%`;
  if (text) text.textContent = tParam('expeditionInProgress', { seconds: String(Math.ceil(remaining / 1000)) });
}

/** Call from game loop to refresh expedition bar and remaining time. */
export function updateExpeditionProgress(): void {
  const endsAt = getExpeditionEndsAt();
  if (endsAt == null) return;
  const progressWrap = document.getElementById('expedition-progress-wrap');
  if (!progressWrap || progressWrap.hidden) return;
  updateExpeditionProgressDom(progressWrap, endsAt, getExpeditionDurationMs());
}
