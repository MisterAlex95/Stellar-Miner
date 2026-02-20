/**
 * Modal to launch an expedition: choose difficulty (easy/medium/hard) and crew composition.
 * State is in appUI store; Vue (ExpeditionModal.vue) renders tiers and crew.
 */
import { getSession, getSettings, getExpeditionEndsAt, planetService } from '../../application/gameState.js';
import {
  CREW_ROLES,
  isNextExpeditionNewSystem,
  type ExpeditionComposition,
  type CrewRole,
} from '../../domain/constants.js';
import { formatNumber } from '../../application/format.js';
import { t } from '../../application/strings.js';
import { getPresentationPort } from '../../application/uiBridge.js';
import { openOverlay, closeOverlay } from '../lib/overlay.js';
import { startPlanetThumbnail3DLoop } from '../canvas/planetThumbnail3D.js';

const OVERLAY_ID = 'expedition-modal-overlay';
const OPEN_CLASS = 'expedition-modal-overlay--open';

export function closeExpeditionModal(): void {
  document.body.style.overflow = '';
  closeOverlay(OVERLAY_ID, OPEN_CLASS);
}

export function openExpeditionModal(): void {
  const session = getSession();
  if (!session) return;
  if (getExpeditionEndsAt() != null) return;
  const player = session.player;
  const required = planetService.getExpeditionAstronautsRequired(player);
  const settings = getSettings();
  const costScout = planetService.getExpeditionCost(player, 'scout');
  const costFormatted = `${formatNumber(costScout.toNumber(), settings.compactNumbers)} ⬡`;
  const isNewSystem = isNextExpeditionNewSystem(player.planets.length);
  const newSystemText = t('expeditionNewSolarSystem');
  const newSystemTitle = t('expeditionNewSolarSystemHint');

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

  const composition: Record<string, number> = { ...defaultComp };
  const selectedTier: string = 'medium';
  const selectedType: string = 'scout';

  getPresentationPort().setExpeditionData({
    costFormatted,
    isNewSystem,
    newSystemText,
    newSystemTitle,
    required,
    composition,
    selectedTier,
    selectedType,
  });

  document.body.style.overflow = 'hidden';
  openOverlay(OVERLAY_ID, OPEN_CLASS, { focusId: 'expedition-modal-title' });
  requestAnimationFrame(() => startPlanetThumbnail3DLoop());
}

/** No-op: close, cancel and launch are handled by ExpeditionModal.vue. */
export function bindExpeditionModal(): void {}
