import { getSession } from '../application/gameState.js';
import {
  PROGRESSION_BLOCKS,
  getUnlockedBlocks,
  getSeenModals,
  markModalSeen,
  shouldShowWelcome,
  type BlockId,
} from '../application/progression.js';
import { t, type StringKey } from '../application/strings.js';
import { openOverlay, closeOverlay, isOverlayOpen } from './components/overlay.js';
import type { ProgressionSnapshot } from './vue/stores/gameState.js';

const INTRO_READY_DELAY_MS = 5000;

let previousUnlocked: Set<BlockId> = new Set();
let progressionInitialized = false;
let introCanClose = false;
let introReadyTimeoutId: ReturnType<typeof setTimeout> | null = null;
let introProgressStartTs = 0;
let introProgressIntervalId: ReturnType<typeof setInterval> | null = null;

const INTRO_PROGRESS_TICK_MS = 50;

function getBlockById(id: BlockId) {
  return PROGRESSION_BLOCKS.find((b) => b.id === id);
}

function tickIntroProgress(): void {
  const bar = document.getElementById('intro-progress-bar');
  if (!bar) return;
  const elapsed = Date.now() - introProgressStartTs;
  const pct = Math.min(100, (elapsed / INTRO_READY_DELAY_MS) * 100);
  bar.style.width = `${pct}%`;
  bar.setAttribute('aria-valuenow', String(Math.round(pct)));
}

export function showIntroModal(blockId: BlockId): void {
  const block = getBlockById(blockId);
  if (!block) return;
  const overlay = document.getElementById('intro-overlay');
  const titleEl = document.getElementById('intro-title');
  const bodyEl = document.getElementById('intro-body');
  const gotItBtn = overlay?.querySelector('#intro-got-it') as HTMLButtonElement | null;
  const progressWrap = document.getElementById('intro-progress-wrap');
  const progressBar = document.getElementById('intro-progress-bar');
  if (!overlay || !titleEl || !bodyEl) return;

  if (introReadyTimeoutId) {
    clearTimeout(introReadyTimeoutId);
    introReadyTimeoutId = null;
  }
  if (introProgressIntervalId) {
    clearInterval(introProgressIntervalId);
    introProgressIntervalId = null;
  }

  introCanClose = false;
  openOverlay('intro-overlay', 'intro-overlay--open');

  const titleKey = ('progression' + block.id.charAt(0).toUpperCase() + block.id.slice(1) + 'Title') as StringKey;
  const bodyKey = ('progression' + block.id.charAt(0).toUpperCase() + block.id.slice(1) + 'Body') as StringKey;
  titleEl.textContent = t(titleKey);
  bodyEl.textContent = t(bodyKey);
  if (progressWrap) {
    progressWrap.style.display = '';
    progressWrap.setAttribute('aria-hidden', 'false');
  }
  if (progressBar) {
    progressBar.style.width = '0%';
    progressBar.setAttribute('aria-valuenow', '0');
  }
  if (gotItBtn) {
    gotItBtn.disabled = true;
  }

  introProgressStartTs = Date.now();
  tickIntroProgress();
  introProgressIntervalId = setInterval(tickIntroProgress, INTRO_PROGRESS_TICK_MS);

  introReadyTimeoutId = setTimeout(() => {
    introReadyTimeoutId = null;
    introCanClose = true;
    if (gotItBtn) gotItBtn.disabled = false;
    if (progressWrap) {
      progressWrap.style.display = 'none';
      progressWrap.setAttribute('aria-hidden', 'true');
    }
    if (introProgressIntervalId) {
      clearInterval(introProgressIntervalId);
      introProgressIntervalId = null;
    }
    gotItBtn?.focus();
  }, INTRO_READY_DELAY_MS);
}

export function closeIntroModal(): void {
  if (introReadyTimeoutId) {
    clearTimeout(introReadyTimeoutId);
    introReadyTimeoutId = null;
  }
  if (introProgressIntervalId) {
    clearInterval(introProgressIntervalId);
    introProgressIntervalId = null;
  }
  const progressWrap = document.getElementById('intro-progress-wrap');
  closeOverlay('intro-overlay', 'intro-overlay--open');
  if (progressWrap) {
    progressWrap.style.display = 'none';
    progressWrap.setAttribute('aria-hidden', 'true');
  }
}

function onIntroGotIt(pendingBlockId: BlockId | null): void {
  if (!introCanClose) return;
  if (pendingBlockId) markModalSeen(pendingBlockId);
  pendingIntroBlockId = null;
  closeIntroModal();
}

let pendingIntroBlockId: BlockId | null = null;

export function bindIntroModal(): void {
  const btn = document.getElementById('intro-got-it');
  const overlay = document.getElementById('intro-overlay');
  if (btn) {
    btn.addEventListener('click', () => onIntroGotIt(pendingIntroBlockId));
  }
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target !== overlay) return;
      if (!introCanClose) return;
      onIntroGotIt(pendingIntroBlockId);
    });
  }
}

/** Build section unlocked map for Vue (no DOM). */
export function getProgressionSnapshot(): ProgressionSnapshot {
  const session = getSession();
  const unlocked = session ? getUnlockedBlocks(session) : new Set<string>();
  const sectionUnlocked: Record<string, boolean> = {};
  for (const block of PROGRESSION_BLOCKS) {
    if (block.sectionId) sectionUnlocked[block.sectionId] = unlocked.has(block.id);
  }
  return { sectionUnlocked };
}

/** Update previousUnlocked and show intro modal when a block is just unlocked. Section classes are driven by Vue via bridge. */
export function updateProgressionVisibility(): void {
  const session = getSession();
  const unlocked = getUnlockedBlocks(session);
  const seen = getSeenModals();

  for (const block of PROGRESSION_BLOCKS) {
    if (!block.sectionId) continue;
    const isUnlocked = unlocked.has(block.id);
    const justUnlocked = isUnlocked && !previousUnlocked.has(block.id);
    const shouldShowModal = justUnlocked && !seen.has(block.id) && progressionInitialized;
    if (shouldShowModal) {
      pendingIntroBlockId = block.id;
      showIntroModal(block.id);
    }
  }

  previousUnlocked = new Set(unlocked);
  progressionInitialized = true;
}

/** Call once after mount: show welcome modal if first run. */
export function maybeShowWelcomeModal(): void {
  const session = getSession();
  const seen = getSeenModals();
  if (!shouldShowWelcome(seen, session)) return;
  pendingIntroBlockId = 'welcome';
  showIntroModal('welcome');
}

export function isIntroOverlayOpen(): boolean {
  return isOverlayOpen('intro-overlay', 'intro-overlay--open');
}

/** Close intro and mark current pending block as seen (e.g. on Escape). No-op if still in the 5s lock. */
export function dismissIntroModal(): void {
  if (!introCanClose) return;
  if (pendingIntroBlockId) markModalSeen(pendingIntroBlockId);
  pendingIntroBlockId = null;
  closeIntroModal();
}
