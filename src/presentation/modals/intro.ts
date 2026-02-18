/**
 * Intro/welcome modal: show logic and 5s delay. UI state lives in appUI store; IntroModal.vue renders it.
 */
import { getSession } from '../../application/gameState.js';
import {
  PROGRESSION_BLOCKS,
  getUnlockedBlocks,
  getSeenModals,
  markModalSeen,
  shouldShowWelcome,
  type BlockId,
} from '../../application/progression.js';
import { getPinia } from '../piniaInstance.js';
import { useAppUIStore } from '../stores/appUI.js';

const INTRO_READY_DELAY_MS = 5000;
const INTRO_PROGRESS_TICK_MS = 50;

let introReadyTimeoutId: ReturnType<typeof setTimeout> | null = null;
let introProgressIntervalId: ReturnType<typeof setInterval> | null = null;
let introProgressStartTs = 0;

let previousUnlocked: Set<BlockId> = new Set();
let progressionInitialized = false;

function getBlockById(id: BlockId) {
  return PROGRESSION_BLOCKS.find((b) => b.id === id);
}

function clearTimers(): void {
  if (introReadyTimeoutId) {
    clearTimeout(introReadyTimeoutId);
    introReadyTimeoutId = null;
  }
  if (introProgressIntervalId) {
    clearInterval(introProgressIntervalId);
    introProgressIntervalId = null;
  }
}

export function showIntroModal(blockId: BlockId): void {
  const block = getBlockById(blockId);
  if (!block) return;

  const pinia = getPinia();
  if (!pinia) return;

  clearTimers();

  const store = useAppUIStore(pinia);
  store.setIntroModal(blockId, false, 0);
  introProgressStartTs = Date.now();

  introProgressIntervalId = setInterval(() => {
    const elapsed = Date.now() - introProgressStartTs;
    const pct = Math.min(100, (elapsed / INTRO_READY_DELAY_MS) * 100);
    useAppUIStore(getPinia()!).setIntroProgress(pct);
  }, INTRO_PROGRESS_TICK_MS);

  introReadyTimeoutId = setTimeout(() => {
    introReadyTimeoutId = null;
    if (introProgressIntervalId) {
      clearInterval(introProgressIntervalId);
      introProgressIntervalId = null;
    }
    useAppUIStore(getPinia()!).setIntroCanClose(true);
    useAppUIStore(getPinia()!).setIntroProgress(100);
  }, INTRO_READY_DELAY_MS);
}

export function closeIntroModal(): void {
  clearTimers();
  const pinia = getPinia();
  if (pinia) useAppUIStore(pinia).clearIntroModal();
}

/** Close intro and mark current block as seen. No-op if still in the 5s lock. */
export function dismissIntroModal(): void {
  const pinia = getPinia();
  if (!pinia) return;
  const store = useAppUIStore(pinia);
  if (!store.introCanClose) return;
  const blockId = store.introBlockId;
  if (blockId) markModalSeen(blockId as BlockId);
  clearTimers();
  store.clearIntroModal();
}

/** No-op: click handling is in IntroModal.vue. */
export function bindIntroModal(): void {}

/** Update previousUnlocked and show intro modal when a block is just unlocked. */
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
  showIntroModal('welcome');
}

export function isIntroOverlayOpen(): boolean {
  const pinia = getPinia();
  if (!pinia) return false;
  return !!useAppUIStore(pinia).introBlockId;
}
