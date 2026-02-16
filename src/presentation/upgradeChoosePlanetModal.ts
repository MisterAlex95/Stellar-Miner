/**
 * Modal to choose a planet for install (Buy/Max) or uninstall when the player has multiple planets.
 * Each option has a collapse/expand (default closed) for full details + preview, and a "Select" button.
 */
import type { Planet } from '../domain/entities/Planet.js';
import type { GameSession } from '../domain/aggregates/GameSession.js';
import { getSession, getSettings } from '../application/gameState.js';
import { getEffectiveUpgradeUsesSlot } from '../application/research.js';
import { getEffectiveUsedSlots } from '../application/research.js';
import { getPlanetEffectiveProduction } from '../application/productionHelpers.js';
import { getPlanetType } from '../application/planetAffinity.js';
import { getPlanetDisplayName } from '../application/solarSystems.js';
import { formatNumber } from '../application/format.js';
import { t } from '../application/strings.js';
import {
  handleUpgradeBuy,
  handleUpgradeBuyMax,
  handleUpgradeUninstall,
  showUpgradeInstallProgress,
} from '../application/handlers.js';
import { openOverlay, closeOverlay } from './components/overlay.js';
import { escapeAttr } from './components/domUtils.js';
import { startPlanetThumbnail3DLoop } from './planetThumbnail3D.js';

const OVERLAY_ID = 'upgrade-choose-planet-overlay';
const OPEN_CLASS = 'upgrade-choose-planet-overlay--open';

const EXPAND_MARKER = '\u25B6'; // ▶
const COLLAPSE_MARKER = '\u25BC'; // ▼

export type UpgradeChoosePlanetAction = 'buy' | 'max' | 'uninstall';

export function closeUpgradeChoosePlanetModal(): void {
  document.body.style.overflow = '';
  closeOverlay(OVERLAY_ID, OPEN_CLASS);
}

function buildPlanetDetailHtml(planet: Planet, session: GameSession): string {
  const settings = getSettings();
  const compact = settings.compactNumbers;
  const planetType = getPlanetType(planet.name);
  const typeLabel = planetType.charAt(0).toUpperCase() + planetType.slice(1);
  const effectiveUsed = getEffectiveUsedSlots(planet);
  const prod = getPlanetEffectiveProduction(planet, session);
  const prodStr = formatNumber(prod.toNumber(), compact);
  const visualSeed = planet.visualSeed ?? '';
  return `
    <div class="upgrade-choose-planet-preview" aria-hidden="true">
      <canvas class="planet-card-visual upgrade-choose-planet-visual" width="80" height="80" data-planet-id="${escapeAttr(planet.id)}" data-planet-name="${escapeAttr(planet.name)}" data-planet-visual-seed="${escapeAttr(String(visualSeed))}" aria-hidden="true"></canvas>
    </div>
    <div class="upgrade-choose-planet-details">
      <div class="upgrade-choose-planet-detail"><span class="upgrade-choose-planet-detail-label">${t('planetDetailProduction')}</span> ${escapeAttr(prodStr)}/s</div>
      <div class="upgrade-choose-planet-detail"><span class="upgrade-choose-planet-detail-label">${t('planetDetailSlots')}</span> ${effectiveUsed}/${planet.maxUpgrades}</div>
      <div class="upgrade-choose-planet-detail"><span class="upgrade-choose-planet-detail-label">${t('planetDetailType')}</span> <span class="upgrade-choose-planet-type upgrade-choose-planet-type--${escapeAttr(planetType)}">${escapeAttr(typeLabel)}</span></div>
    </div>`;
}

export function openUpgradeChoosePlanetModal(opts: {
  upgradeId: string;
  action: UpgradeChoosePlanetAction;
  planets: { id: string; name: string }[];
  maxCount?: number;
}): void {
  const { upgradeId, action, planets, maxCount } = opts;
  const titleEl = document.getElementById('upgrade-choose-planet-title');
  const listEl = document.getElementById('upgrade-choose-planet-list');
  const overlay = document.getElementById(OVERLAY_ID);
  if (!titleEl || !listEl || !overlay) return;

  const session = getSession();
  const titleKey = action === 'uninstall' ? 'upgradeChoosePlanetUninstallTitle' : 'upgradeChoosePlanetInstallTitle';
  titleEl.textContent = t(titleKey);
  overlay.setAttribute('data-upgrade-id', upgradeId);
  overlay.setAttribute('data-action', action);
  if (action === 'max' && maxCount != null) {
    overlay.setAttribute('data-max-count', String(maxCount));
  } else {
    overlay.removeAttribute('data-max-count');
  }

  listEl.innerHTML = '';
  for (const p of planets) {
    const fullPlanet = session?.player.planets.find((pl) => pl.id === p.id);
    const item = document.createElement('div');
    item.setAttribute('role', 'listitem');
    item.className = 'upgrade-choose-planet-item upgrade-choose-planet-item--collapsed';
    item.setAttribute('data-planet-id', p.id);

    const header = document.createElement('div');
    header.className = 'upgrade-choose-planet-item-header';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'upgrade-choose-planet-item-name';
    nameSpan.textContent = p.name;

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'upgrade-choose-planet-toggle';
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.setAttribute('aria-label', t('upgradeChoosePlanetExpand'));
    toggleBtn.textContent = EXPAND_MARKER;

    const selectBtn = document.createElement('button');
    selectBtn.type = 'button';
    selectBtn.className = 'upgrade-choose-planet-select';
    selectBtn.setAttribute('data-planet-id', p.id);
    selectBtn.textContent = t('upgradeChoosePlanetSelect');

    header.append(nameSpan, toggleBtn, selectBtn);
    item.appendChild(header);

    const body = document.createElement('div');
    body.className = 'upgrade-choose-planet-item-body';
    if (fullPlanet && session) {
      body.innerHTML = buildPlanetDetailHtml(fullPlanet, session);
    }
    item.appendChild(body);

    toggleBtn.addEventListener('click', () => toggleItemExpanded(item));

    listEl.appendChild(item);
  }

  startPlanetThumbnail3DLoop();
  document.body.style.overflow = 'hidden';
  openOverlay(OVERLAY_ID, OPEN_CLASS, {
    focusId: listEl.querySelector('.upgrade-choose-planet-select')?.id ?? undefined,
  });
}

function onPlanetChosen(upgradeId: string, planetId: string, action: UpgradeChoosePlanetAction, maxCount?: number): void {
  if (action === 'uninstall') {
    handleUpgradeUninstall(upgradeId, planetId);
  } else if (action === 'max') {
    const result = handleUpgradeBuyMax(upgradeId, planetId, maxCount);
    const card = document.querySelector<HTMLElement>(`.upgrade-card[data-upgrade-id="${upgradeId}"]`);
    if (result.bought > 0 && result.durations.length > 0 && card) {
      showUpgradeInstallProgress(card, result.durations);
    }
  } else {
    const result = handleUpgradeBuy(upgradeId, planetId);
    const card = document.querySelector<HTMLElement>(`.upgrade-card[data-upgrade-id="${upgradeId}"]`);
    if (result.bought && result.durations.length > 0 && card) {
      showUpgradeInstallProgress(card, result.durations);
    }
  }
  closeUpgradeChoosePlanetModal();
}

function toggleItemExpanded(item: HTMLElement): void {
  const toggleBtn = item.querySelector('.upgrade-choose-planet-toggle');
  if (!toggleBtn) return;
  const isCurrentlyExpanded = item.classList.contains('upgrade-choose-planet-item--expanded');
  item.classList.toggle('upgrade-choose-planet-item--expanded', !isCurrentlyExpanded);
  item.classList.toggle('upgrade-choose-planet-item--collapsed', isCurrentlyExpanded);
  toggleBtn.setAttribute('aria-expanded', String(!isCurrentlyExpanded));
  toggleBtn.setAttribute('aria-label', !isCurrentlyExpanded ? t('upgradeChoosePlanetExpand') : t('upgradeChoosePlanetCollapse'));
  (toggleBtn as HTMLElement).textContent = !isCurrentlyExpanded ? COLLAPSE_MARKER : EXPAND_MARKER;
}

export function bindUpgradeChoosePlanetModal(): void {
  const listEl = document.getElementById('upgrade-choose-planet-list');
  const cancelBtn = document.getElementById('upgrade-choose-planet-cancel');
  const closeBtn = document.getElementById('upgrade-choose-planet-close');
  const overlay = document.getElementById(OVERLAY_ID);

  listEl?.addEventListener('click', (e: Event) => {
    const target = e.target as HTMLElement;
    const selectBtn = target.closest('button.upgrade-choose-planet-select');
    if (selectBtn) {
      const planetId = selectBtn.getAttribute('data-planet-id');
      if (!planetId) return;
      const ov = document.getElementById(OVERLAY_ID);
      const upgradeId = ov?.getAttribute('data-upgrade-id');
      const action = ov?.getAttribute('data-action') as UpgradeChoosePlanetAction | null;
      if (!upgradeId || !action) return;
      const maxCountAttr = ov?.getAttribute('data-max-count');
      const maxCount = maxCountAttr != null ? parseInt(maxCountAttr, 10) : undefined;
      onPlanetChosen(upgradeId, planetId, action, Number.isFinite(maxCount) ? maxCount : undefined);
      return;
    }
  });

  cancelBtn?.addEventListener('click', closeUpgradeChoosePlanetModal);
  closeBtn?.addEventListener('click', closeUpgradeChoosePlanetModal);
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) closeUpgradeChoosePlanetModal();
  });
}

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
