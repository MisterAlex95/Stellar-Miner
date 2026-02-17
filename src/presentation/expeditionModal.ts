/**
 * Modal to launch an expedition: choose difficulty (easy/medium/hard) and crew composition.
 */
import { getSession, getSettings, getExpeditionEndsAt } from '../application/gameState.js';
import { planetService } from '../application/gameState.js';
import { getExpeditionTiers, getExpeditionTier, CREW_ROLES, generatePlanetName, isNextExpeditionNewSystem, type ExpeditionComposition, type ExpeditionTierId, type CrewRole } from '../domain/constants.js';
import { getExpeditionDeathChanceWithMedics } from '../domain/constants.js';
import { getUnlockedCrewRoles, getResearchExpeditionDurationPercent, getResearchExpeditionDeathChancePercent } from '../application/research.js';
import type { CrewJobRole } from '../domain/constants.js';
import { formatNumber } from '../application/format.js';
import { t, tParam, type StringKey } from '../application/strings.js';
import { openOverlay, closeOverlay } from './components/overlay.js';
import { escapeAttr } from './components/domUtils.js';
import { getPlanetType } from '../application/planetAffinity.js';
import { startPlanetThumbnail3DLoop } from './planetThumbnail3D.js';
import { handleLaunchExpeditionFromModal } from '../application/handlersPlanet.js';

const OVERLAY_ID = 'expedition-modal-overlay';
const OPEN_CLASS = 'expedition-modal-overlay--open';

const TIER_KEYS: Record<string, StringKey> = {
  easy: 'expeditionTierEasy',
  medium: 'expeditionTierMedium',
  hard: 'expeditionTierHard',
};
const TIER_DESC_KEYS: Record<string, StringKey> = {
  easy: 'expeditionTierEasyDesc',
  medium: 'expeditionTierMediumDesc',
  hard: 'expeditionTierHardDesc',
};

const ROLE_KEYS: Record<CrewRole, StringKey> = {
  astronaut: 'crewRoleAstronaut',
  miner: 'crewRoleMiner',
  scientist: 'crewRoleScientist',
  pilot: 'crewRolePilot',
  medic: 'crewRoleMedic',
  engineer: 'crewRoleEngineer',
};

function isRoleUnlocked(role: CrewRole, unlocked: CrewJobRole[]): boolean {
  return role === 'astronaut' || unlocked.includes(role as CrewJobRole);
}

export function closeExpeditionModal(): void {
  document.body.style.overflow = '';
  closeOverlay(OVERLAY_ID, OPEN_CLASS);
}

function getDeathChancePct(medicCount: number, tierId: string): number {
  const chance = getExpeditionDeathChanceWithMedics(medicCount, tierId, getResearchExpeditionDeathChancePercent());
  return Math.round(chance * 100);
}

/** Deterministic visual seed for expedition destination thumbnails. */
function destinationSeed(tierId: string): number {
  let h = 5381;
  const s = `expedition-dest-${tierId}`;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

function renderTiers(selectedTier: ExpeditionTierId | null, composition: ExpeditionComposition): string {
  const tiers = getExpeditionTiers();
  const medicCount = composition.medic ?? 0;
  return tiers
    .map((tier) => {
      const id = tier.id as ExpeditionTierId;
      const selected = selectedTier === id;
      const deathPct = getDeathChancePct(medicCount, id);
      const session = getSession();
      const durationMs = session ? planetService.getExpeditionDurationMs(session.player, id, composition.pilot ?? 0, getResearchExpeditionDurationPercent()) : 0;
      const sec = Math.round(durationMs / 1000);
      const titleKey: StringKey = TIER_KEYS[tier.id] ?? 'expeditionTierMedium';
      const descKey: StringKey = TIER_DESC_KEYS[tier.id] ?? 'expeditionTierMediumDesc';
      const destinationName = generatePlanetName(`expedition-dest-${id}`);
      const visualSeed = destinationSeed(id);
      const planetType = getPlanetType(destinationName);
      const typeLabel = planetType.charAt(0).toUpperCase() + planetType.slice(1);
      return `
        <button type="button" class="expedition-tier-card ${selected ? 'expedition-tier-card--selected' : ''}" data-tier="${id}" aria-pressed="${selected}">
          <div class="expedition-tier-visual-wrap">
            <canvas class="planet-card-visual expedition-dest-visual" width="72" height="72" data-planet-id="expedition-${id}" data-planet-name="${escapeAttr(destinationName)}" data-planet-visual-seed="${visualSeed}" aria-hidden="true"></canvas>
          </div>
          <div class="expedition-tier-content">
            <span class="expedition-tier-destination">${escapeAttr(destinationName)}</span>
            <span class="expedition-tier-type expedition-tier-type--${escapeAttr(planetType)}" title="${escapeAttr(typeLabel)}">${escapeAttr(typeLabel)}</span>
            <span class="expedition-tier-badge expedition-tier-badge--${id}">${t(titleKey)}</span>
            <p class="expedition-tier-desc">${t(descKey)}</p>
            <div class="expedition-tier-stats">
              <span>${tParam('expeditionTierRisk', { pct: String(deathPct) })}</span>
              <span>${tParam('expeditionTierDuration', { sec: String(sec) })}</span>
            </div>
            ${tier.extraSlot ? `<span class="expedition-tier-reward">+1 slot</span>` : ''}
          </div>
        </button>`;
    })
    .join('');
}

function renderCrewPicker(
  composition: ExpeditionComposition,
  required: number,
  availableByRole: Record<CrewRole, number>
): string {
  const unlocked = getUnlockedCrewRoles();
  const totalSelected = CREW_ROLES.reduce((s, r) => s + (composition[r] ?? 0), 0);
  const rows = CREW_ROLES.map((role) => {
    if (!isRoleUnlocked(role, unlocked)) return '';
    const avail = availableByRole[role] ?? 0;
    const sel = composition[role] ?? 0;
    const canInc = totalSelected < required && sel < avail;
    const canDec = sel > 0;
    return `
      <div class="expedition-crew-row" data-role="${role}">
        <span class="expedition-crew-label">${t(ROLE_KEYS[role])}</span>
        <div class="expedition-crew-controls">
          <button type="button" class="expedition-crew-btn" data-action="dec" data-role="${role}" ${canDec ? '' : 'disabled'} aria-label="Decrease">−</button>
          <span class="expedition-crew-value" aria-live="polite">${sel}</span>
          <button type="button" class="expedition-crew-btn" data-action="inc" data-role="${role}" ${canInc ? '' : 'disabled'} aria-label="Increase">+</button>
        </div>
        <span class="expedition-crew-avail">/ ${avail}</span>
      </div>`;
  }).filter(Boolean).join('');
  const label = tParam('expeditionCrewSelect', { required: String(required) });
  return `<div class="expedition-crew-picker" role="group" aria-label="${label}">${rows}</div>`;
}

export function openExpeditionModal(): void {
  const session = getSession();
  if (!session) return;
  if (getExpeditionEndsAt() != null) return; // already in progress
  const player = session.player;
  const required = planetService.getExpeditionAstronautsRequired(player);
  const cost = planetService.getNewPlanetCost(player);
  const canAfford = player.coins.gte(cost);
  const hasCrew = player.astronautCount >= required;
  if (!canAfford || !hasCrew) return;

  const settings = getSettings();
  const defaultComp: ExpeditionComposition = {
    astronaut: 0,
    miner: 0,
    scientist: 0,
    pilot: 0,
    medic: 0,
    engineer: 0,
  };
  const order: CrewRole[] = ['astronaut', 'miner', 'scientist', 'pilot', 'medic', 'engineer'];
  let left = required;
  for (const r of order) {
    const take = Math.min(left, player.crewByRole[r] ?? 0);
    defaultComp[r] = take;
    left -= take;
    if (left <= 0) break;
  }

  const overlay = document.getElementById(OVERLAY_ID);
  const titleEl = document.getElementById('expedition-modal-title');
  const tiersEl = document.getElementById('expedition-modal-tiers');
  const crewEl = document.getElementById('expedition-modal-crew');
  const launchBtn = document.getElementById('expedition-modal-launch');
  const costEl = document.getElementById('expedition-modal-cost');
  const newSystemEl = document.getElementById('expedition-modal-new-system');
  if (!overlay || !titleEl || !tiersEl || !crewEl || !launchBtn || !costEl) return;

  titleEl.textContent = t('expeditionModalTitle');
  costEl.textContent = `${formatNumber(cost.toNumber(), settings.compactNumbers)} ⬡`;
  const isNewSystem = isNextExpeditionNewSystem(player.planets.length);
  if (newSystemEl) {
    newSystemEl.textContent = t('expeditionNewSolarSystem');
    newSystemEl.title = t('expeditionNewSolarSystemHint');
    newSystemEl.classList.toggle('expedition-new-system--visible', isNewSystem);
    newSystemEl.setAttribute('aria-hidden', isNewSystem ? 'false' : 'true');
  }
  let selectedTier: ExpeditionTierId | null = 'medium';
  let composition: ExpeditionComposition = { ...defaultComp };

  function updateUI(): void {
    if (!tiersEl || !crewEl || !launchBtn) return;
    const total = CREW_ROLES.reduce((s, r) => s + (composition[r] ?? 0), 0);
    const valid = selectedTier !== null && total === required;
    const tiersHtml = renderTiers(selectedTier, composition);
    const availableByRole = { ...player.crewByRole } as Record<CrewRole, number>;
    const crewHtml = renderCrewPicker(composition, required, availableByRole);
    tiersEl.innerHTML = tiersHtml;
    crewEl.innerHTML = crewHtml;
    if (valid) launchBtn.removeAttribute('disabled');
    else launchBtn.setAttribute('disabled', 'disabled');
    launchBtn.textContent = t('expeditionLaunch');
    bindExpeditionModalListeners();
  }

  function bindExpeditionModalListeners(): void {
    if (!tiersEl || !crewEl) return;
    tiersEl.querySelectorAll('.expedition-tier-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedTier = (btn as HTMLElement).getAttribute('data-tier') as ExpeditionTierId;
        updateUI();
      });
    });
    crewEl.querySelectorAll('.expedition-crew-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const role = (btn as HTMLElement).getAttribute('data-role') as CrewRole;
        const action = (btn as HTMLElement).getAttribute('data-action');
        const total = CREW_ROLES.reduce((s, r) => s + (composition[r] ?? 0), 0);
        const avail = player.crewByRole[role] ?? 0;
        const cur = composition[role] ?? 0;
        if (action === 'inc' && total < required && cur < avail) {
          composition[role] = cur + 1;
        } else if (action === 'dec' && cur > 0) {
          composition[role] = cur - 1;
        }
        updateUI();
      });
    });
  }

  document.body.style.overflow = 'hidden';
  openOverlay(OVERLAY_ID, OPEN_CLASS, { focusId: 'expedition-modal-title' });
  requestAnimationFrame(() => {
    updateUI();
    startPlanetThumbnail3DLoop();
  });
}

function getCompositionFromDom(): ExpeditionComposition | null {
  const comp: ExpeditionComposition = {
    astronaut: 0,
    miner: 0,
    scientist: 0,
    pilot: 0,
    medic: 0,
    engineer: 0,
  };
  for (const role of CREW_ROLES) {
    const row = document.querySelector(`.expedition-crew-row[data-role="${role}"] .expedition-crew-value`);
    if (row) comp[role] = parseInt((row as HTMLElement).textContent ?? '0', 10) || 0;
  }
  return comp;
}

function getSelectedTierFromDom(): ExpeditionTierId | null {
  const card = document.querySelector('.expedition-tier-card.expedition-tier-card--selected');
  const id = card?.getAttribute('data-tier');
  return (id === 'easy' || id === 'medium' || id === 'hard' ? id : null) as ExpeditionTierId | null;
}

export function bindExpeditionModal(): void {
  const closeBtn = document.getElementById('expedition-modal-close');
  const cancelBtn = document.getElementById('expedition-modal-cancel');
  const launchBtn = document.getElementById('expedition-modal-launch');
  const overlay = document.getElementById(OVERLAY_ID);
  closeBtn?.addEventListener('click', closeExpeditionModal);
  cancelBtn?.addEventListener('click', closeExpeditionModal);
  launchBtn?.addEventListener('click', () => {
    const session = getSession();
    if (!session) return;
    const required = planetService.getExpeditionAstronautsRequired(session.player);
    const tier = getSelectedTierFromDom();
    const composition = getCompositionFromDom();
    if (!tier || !composition) return;
    const total = CREW_ROLES.reduce((s, r) => s + (composition[r] ?? 0), 0);
    if (total !== required) return;
    handleLaunchExpeditionFromModal(tier, composition);
    closeExpeditionModal();
  });
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) closeExpeditionModal();
  });
}
