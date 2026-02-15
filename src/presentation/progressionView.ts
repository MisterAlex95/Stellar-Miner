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

const INTRO_READY_DELAY_MS = 5000;

let previousUnlocked: Set<BlockId> = new Set();
let progressionInitialized = false;
let introCanClose = false;
let introReadyTimeoutId: ReturnType<typeof setTimeout> | null = null;
let introProgressStartTs = 0;
let introProgressRafId: number | null = null;

function getBlockById(id: BlockId) {
  return PROGRESSION_BLOCKS.find((b) => b.id === id);
}

function tickIntroProgress(): void {
  const wrap = document.getElementById('intro-progress-wrap');
  const bar = document.getElementById('intro-progress-bar');
  if (!wrap || !bar) return;
  const elapsed = Date.now() - introProgressStartTs;
  const pct = Math.min(100, (elapsed / INTRO_READY_DELAY_MS) * 100);
  bar.style.width = `${pct}%`;
  bar.setAttribute('aria-valuenow', String(Math.round(pct)));
  if (pct < 100) introProgressRafId = requestAnimationFrame(tickIntroProgress);
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
  if (introProgressRafId) {
    cancelAnimationFrame(introProgressRafId);
    introProgressRafId = null;
  }

  introCanClose = false;
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
  overlay.classList.add('intro-overlay--open');
  overlay.setAttribute('aria-hidden', 'false');

  introProgressStartTs = Date.now();
  introProgressRafId = requestAnimationFrame(tickIntroProgress);

  introReadyTimeoutId = setTimeout(() => {
    introReadyTimeoutId = null;
    introCanClose = true;
    if (gotItBtn) gotItBtn.disabled = false;
    if (progressWrap) {
      progressWrap.style.display = 'none';
      progressWrap.setAttribute('aria-hidden', 'true');
    }
    if (introProgressRafId) {
      cancelAnimationFrame(introProgressRafId);
      introProgressRafId = null;
    }
    gotItBtn?.focus();
  }, INTRO_READY_DELAY_MS);
}

export function closeIntroModal(): void {
  if (introReadyTimeoutId) {
    clearTimeout(introReadyTimeoutId);
    introReadyTimeoutId = null;
  }
  if (introProgressRafId) {
    cancelAnimationFrame(introProgressRafId);
    introProgressRafId = null;
  }
  const overlay = document.getElementById('intro-overlay');
  const progressWrap = document.getElementById('intro-progress-wrap');
  if (overlay) {
    overlay.classList.remove('intro-overlay--open');
    overlay.setAttribute('aria-hidden', 'true');
  }
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
    if (block.id === 'planets') {
      const housingSection = document.getElementById('housing-section');
      if (housingSection) {
        housingSection.classList.toggle('gameplay-block--locked', !isUnlocked);
        housingSection.classList.toggle('gameplay-block--unlocked', isUnlocked);
        housingSection.setAttribute('aria-hidden', isUnlocked ? 'false' : 'true');
      }
    }

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
      (tabId === 'research' && unlocked.has('research')) ||
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

/** Close intro and mark current pending block as seen (e.g. on Escape). No-op if still in the 5s lock. */
export function dismissIntroModal(): void {
  if (!introCanClose) return;
  if (pendingIntroBlockId) markModalSeen(pendingIntroBlockId);
  pendingIntroBlockId = null;
  closeIntroModal();
}
