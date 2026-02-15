import { getSession, getSettings } from '../application/gameState.js';
import { formatNumber } from '../application/format.js';
import {
  RESEARCH_CATALOG,
  getResearchTreeRows,
  getUnlockedResearch,
  canAttemptResearch,
  getUnlockPathIds,
  getModifierSlotEntries,
  getModifierCrewEntries,
  type ResearchNode,
} from '../application/research.js';
import { t, tParam } from '../application/strings.js';
import { getCatalogResearchName, getCatalogResearchDesc, getCatalogUpgradeName } from '../application/i18nCatalogs.js';
import { escapeAttr, escapeHtml } from './components/domUtils.js';
import { buttonWithTooltipHtml } from './components/buttonTooltip.js';

function modifierText(node: ResearchNode): string {
  const parts: string[] = [];
  if (node.modifiers.productionPercent) parts.push(`+${node.modifiers.productionPercent}% production`);
  if (node.modifiers.clickPercent) parts.push(`+${node.modifiers.clickPercent}% click`);
  const slotEntries = getModifierSlotEntries(node);
  if (slotEntries.length)
    parts.push(
      slotEntries
        .map(({ id, n }) => tParam('researchUpgradeLessSlot', { name: getCatalogUpgradeName(id), n }))
        .join(', ')
    );
  const crewEntries = getModifierCrewEntries(node);
  if (crewEntries.length)
    parts.push(
      crewEntries
        .map(({ id, n }) => tParam('researchUpgradeLessCrew', { name: getCatalogUpgradeName(id), n }))
        .join(', ')
    );
  return parts.length > 0 ? parts.join(', ') : '—';
}

/** In-card info block: description + effects + prereq + cost/chance. */
function buildCardInfoHtml(
  desc: string,
  modText: string,
  prereqText: string,
  costStr: string,
  pct: number,
  done: boolean
): string {
  const parts: string[] = [];
  parts.push(`<p class="research-card-desc">${escapeHtml(desc)}</p>`);
  if (modText && modText !== '—')
    parts.push(`<p class="research-card-mods research-card-mods-preview">${escapeHtml(t('researchEffectsLabel') + ' ' + modText)}</p>`);
  if (prereqText)
    parts.push(`<p class="research-card-prereq">${escapeHtml(tParam('researchRequires', { names: prereqText }))}</p>`);
  if (!done)
    parts.push(
      `<p class="research-card-meta"><span class="research-card-cost">${escapeHtml(costStr)} ⬡</span><span class="research-card-chance">${escapeHtml(tParam('percentSuccess', { pct }))}</span></p>`
    );
  return parts.join('');
}

export function renderResearchSection(): void {
  const listEl = document.getElementById('research-list');
  if (!listEl) return;
  const session = getSession();
  const settings = getSettings();
  const unlocked = getUnlockedResearch();
  const rows = getResearchTreeRows();

  const rowHtml = rows.map((rowNodes, rowIndex) => {
    const nodeCards = rowNodes
      .map((node) => {
        const done = unlocked.includes(node.id);
        const canAttempt = session && canAttemptResearch(node.id) && session.player.coins.gte(node.cost);
        const pct = Math.round(node.successChance * 100);
        const prereqText =
          node.prerequisites.length > 0
            ? node.prerequisites
                .map((id) => getCatalogResearchName(id))
                .join(', ')
            : '';
        const modText = modifierText(node);
        const unlockPathIds = getUnlockPathIds(node.id).concat(node.id);
        const pathNames = unlockPathIds.map((id) => getCatalogResearchName(id));
        return renderResearchCard(node, rowIndex, done, canAttempt, pct, prereqText, modText, pathNames, unlockPathIds, settings.compactNumbers);
      })
      .join('');
    return `
      <div class="research-tree-row" data-row="${rowIndex}" role="list">
        <div class="research-tree-row-nodes" style="--row-nodes: ${rowNodes.length}">${nodeCards}</div>
      </div>`;
  });

  listEl.innerHTML = `
    <div class="research-tree" role="tree" aria-label="${t('research')} tree">
      ${rowHtml.join('')}
    </div>`;
}

function renderResearchCard(
  node: ResearchNode,
  rowIndex: number,
  done: boolean,
  canAttempt: boolean,
  pct: number,
  prereqText: string,
  modText: string,
  pathNames: string[],
  unlockPathIds: string[],
  compactNumbers: boolean
): string {
  const costStr = formatNumber(node.cost, compactNumbers);
  const levelLabel = rowIndex + 1;
  const pathTitle =
    pathNames.length > 0
      ? tParam('researchUnlockPath', { path: pathNames.join(' → ') + ' → ' + getCatalogResearchName(node.id) })
      : tParam('researchUnlockPathSingle', { name: getCatalogResearchName(node.id) });
  const pathAttr = escapeAttr(pathTitle);
  const pathIdsAttr = escapeAttr(unlockPathIds.join(','));
  const name = getCatalogResearchName(node.id);
  const desc = getCatalogResearchDesc(node.id);
  const cardInfoHtml = buildCardInfoHtml(desc, modText, prereqText, costStr, pct, done);
  const attemptTitle = canAttempt ? tParam('researchAttemptTooltip', { pct }) : t('researchAttemptDisabled');
  if (done) {
    return `
      <div class="research-card research-card--done" data-research-id="${node.id}" data-unlock-path="${pathIdsAttr}" data-level="${levelLabel}" role="treeitem" aria-selected="true" title="${pathAttr}">
        <div class="research-card-header">
          <span class="research-card-level" aria-hidden="true">${levelLabel}</span>
          <span class="research-card-name">${name}</span>
        </div>
        <div class="research-card-info-block">${cardInfoHtml}</div>
      </div>`;
  }
  return `
    <div class="research-card" data-research-id="${node.id}" data-unlock-path="${pathIdsAttr}" data-level="${levelLabel}" role="treeitem" title="${pathAttr}">
      <div class="research-card-header">
        <span class="research-card-level" aria-hidden="true">${levelLabel}</span>
        <span class="research-card-name">${name}</span>
      </div>
      <div class="research-card-info-block">${cardInfoHtml}</div>
      ${buttonWithTooltipHtml(
        attemptTitle,
        `<button type="button" class="research-attempt-btn" data-research-id="${node.id}" ${canAttempt ? '' : 'disabled'}>${t('attempt')}</button>`
      )}
    </div>`;
}
