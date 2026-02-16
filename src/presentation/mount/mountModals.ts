/**
 * Modal open/close handlers. Extracted from mount.ts.
 */
import { t, type StringKey } from '../../application/strings.js';
import { openOverlay, closeOverlay, getOpenOverlayElement } from '../components/overlay.js';
import { markUpdateSeen } from '../../application/version.js';
import { renderAchievementsModalContent } from '../../application/handlers.js';

export const SECTION_RULES_OVERLAY_CLASS = 'section-rules-overlay--open';
export const ACHIEVEMENTS_OVERLAY_ID = 'achievements-overlay';
export const ACHIEVEMENTS_OVERLAY_OPEN_CLASS = 'achievements-overlay--open';

/** Parses rules text: lines starting with "- " or "• " become list items; others become paragraphs. */
function formatRulesContent(text: string): DocumentFragment {
  const frag = document.createDocumentFragment();
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  let ul: HTMLUListElement | null = null;
  for (const line of lines) {
    const isListItem = line.startsWith('- ') || line.startsWith('• ');
    const content = isListItem ? line.slice(2).trim() : line;
    if (isListItem) {
      if (!ul) {
        ul = document.createElement('ul');
        ul.className = 'section-rules-list';
        frag.appendChild(ul);
      }
      const li = document.createElement('li');
      li.textContent = content;
      ul.appendChild(li);
    } else {
      ul = null;
      const p = document.createElement('p');
      p.textContent = content;
      frag.appendChild(p);
    }
  }
  return frag;
}

export function openInfoModal(updateVersionAndChangelogUI: () => void, renderChangelogList: (container: HTMLElement) => void): void {
  const list = document.getElementById('info-changelog-list');
  openOverlay('info-overlay', 'info-overlay--open', {
    focusId: 'info-close',
    onOpen: () => {
      markUpdateSeen();
      updateVersionAndChangelogUI();
      if (list) renderChangelogList(list);
    },
  });
}

export function closeInfoModal(): void {
  closeOverlay('info-overlay', 'info-overlay--open');
}

export function openAchievementsModal(): void {
  const list = document.getElementById('achievements-modal-list');
  openOverlay(ACHIEVEMENTS_OVERLAY_ID, ACHIEVEMENTS_OVERLAY_OPEN_CLASS, {
    focusId: 'achievements-modal-close',
    onOpen: () => {
      if (list) renderAchievementsModalContent(list);
    },
  });
}

export function closeAchievementsModal(): void {
  closeOverlay(ACHIEVEMENTS_OVERLAY_ID, ACHIEVEMENTS_OVERLAY_OPEN_CLASS);
}

export function openSectionRulesModal(rulesKey: string, titleKey: string): void {
  const titleEl = document.getElementById('section-rules-title');
  const bodyEl = document.getElementById('section-rules-body');
  if (titleEl) titleEl.textContent = t(titleKey as StringKey);
  if (bodyEl) {
    bodyEl.innerHTML = '';
    bodyEl.appendChild(formatRulesContent(t(rulesKey as StringKey)));
  }
  openOverlay('section-rules-overlay', SECTION_RULES_OVERLAY_CLASS, { focusId: 'section-rules-close' });
}

export function closeSectionRulesModal(): void {
  closeOverlay('section-rules-overlay', SECTION_RULES_OVERLAY_CLASS);
}

export function isAnyModalOpen(): boolean {
  return getOpenOverlayElement() !== null;
}
