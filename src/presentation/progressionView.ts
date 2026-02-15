import { getSession } from '../application/gameState.js';
import {
  PROGRESSION_BLOCKS,
  getUnlockedBlocks,
  getSeenModals,
  markModalSeen,
  shouldShowWelcome,
  type BlockId,
} from '../application/progression.js';

let previousUnlocked: Set<BlockId> = new Set();
let progressionInitialized = false;

function getBlockById(id: BlockId) {
  return PROGRESSION_BLOCKS.find((b) => b.id === id);
}

export function showIntroModal(blockId: BlockId): void {
  const block = getBlockById(blockId);
  if (!block) return;
  const overlay = document.getElementById('intro-overlay');
  const titleEl = document.getElementById('intro-title');
  const bodyEl = document.getElementById('intro-body');
  if (!overlay || !titleEl || !bodyEl) return;
  titleEl.textContent = block.title;
  bodyEl.textContent = block.body;
  overlay.classList.add('intro-overlay--open');
  overlay.setAttribute('aria-hidden', 'false');
  (overlay.querySelector('#intro-got-it') as HTMLElement)?.focus();
}

export function closeIntroModal(): void {
  const overlay = document.getElementById('intro-overlay');
  if (overlay) {
    overlay.classList.remove('intro-overlay--open');
    overlay.setAttribute('aria-hidden', 'true');
  }
}

function onIntroGotIt(pendingBlockId: BlockId | null): void {
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
      if (e.target === overlay) onIntroGotIt(pendingIntroBlockId);
    });
  }
}

export function updateProgressionVisibility(): void {
  const session = getSession();
  const unlocked = getUnlockedBlocks(session);
  const seen = getSeenModals();

  for (const block of PROGRESSION_BLOCKS) {
    if (!block.sectionId) continue;
    const section = document.getElementById(block.sectionId);
    if (!section) continue;
    const isUnlocked = unlocked.has(block.id);
    section.classList.toggle('gameplay-block--locked', !isUnlocked);
    section.classList.toggle('gameplay-block--unlocked', isUnlocked);
    section.setAttribute('aria-hidden', isUnlocked ? 'false' : 'true');

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

/** Show/hide tab buttons based on unlocked blocks. If current tab becomes hidden, call setActiveTab('mine'). */
export function updateTabVisibility(setActiveTab: (tabId: string) => void): void {
  const session = getSession();
  const unlocked = getUnlockedBlocks(session);
  const tabsNav = document.querySelector('.app-tabs');
  if (!tabsNav) return;
  const tabButtons = tabsNav.querySelectorAll<HTMLElement>('.app-tab[data-tab]');
  const visibleTabs = new Set<string>();
  tabButtons.forEach((tab) => {
    const tabId = tab.getAttribute('data-tab');
    if (!tabId) return;
    const show =
      tabId === 'mine' ||
      (tabId === 'upgrades' && unlocked.has('upgrades')) ||
      (tabId === 'base' &&
        (unlocked.has('crew') || unlocked.has('planets') || unlocked.has('prestige'))) ||
      (tabId === 'stats' && unlocked.has('upgrades'));
    tab.style.display = show ? 'block' : 'none';
    if (show) visibleTabs.add(tabId);
  });
  const activeTab = tabsNav.querySelector('.app-tab--active')?.getAttribute('data-tab');
  if (activeTab && !visibleTabs.has(activeTab)) setActiveTab('mine');
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
  const overlay = document.getElementById('intro-overlay');
  return overlay?.classList.contains('intro-overlay--open') ?? false;
}

/** Close intro and mark current pending block as seen (e.g. on Escape). */
export function dismissIntroModal(): void {
  if (pendingIntroBlockId) markModalSeen(pendingIntroBlockId);
  pendingIntroBlockId = null;
  closeIntroModal();
}
