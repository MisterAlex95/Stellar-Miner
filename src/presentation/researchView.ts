import { getSession, getSettings } from '../application/gameState.js';
import { formatNumber } from '../application/format.js';
import {
  RESEARCH_CATALOG,
  getResearchTiers,
  getUnlockedResearch,
  canAttemptResearch,
  getUnlockPathIds,
  getModifierSlotEntries,
  getModifierCrewEntries,
  getResearchSuccessChanceMultiplier,
  getEffectiveCost,
  getEffectiveSuccessChance,
  getResearchDurationMs,
  getExpectedCoinsToUnlock,
  getResearchFailureCount,
  getResearchData,
  getPrestigeResearchPoints,
  getRecommendedResearchNodeIds,
  type ResearchNode,
} from '../application/research.js';
import { t, tParam, type StringKey } from '../application/strings.js';
import { getCatalogResearchName, getCatalogResearchDesc, getCatalogUpgradeName } from '../application/i18nCatalogs.js';
import type { CrewJobRole } from '../domain/constants.js';
import { RESEARCH_PITY_FAILURES } from '../domain/constants.js';
import { escapeAttr, escapeHtml } from './components/domUtils.js';
import { buttonWithTooltipHtml } from './components/buttonTooltip.js';

const CREW_JOB_ROLE_KEYS: Record<CrewJobRole, StringKey> = {
  miner: 'crewRoleMiner',
  scientist: 'crewRoleScientist',
  pilot: 'crewRolePilot',
  medic: 'crewRoleMedic',
  engineer: 'crewRoleEngineer',
};

function modifierText(node: ResearchNode): string {
  const parts: string[] = [];
  if (node.modifiers.productionPercent) parts.push(`+${node.modifiers.productionPercent}% production`);
  if (node.modifiers.clickPercent) parts.push(`+${node.modifiers.clickPercent}% click`);
  if (node.modifiers.unlocksCrewRole)
    parts.push(tParam('researchUnlocksJob', { role: t(CREW_JOB_ROLE_KEYS[node.modifiers.unlocksCrewRole]) }));
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
  effectivePct: number,
  scientistBonusPct: number,
  done: boolean
): string {
  const parts: string[] = [];
  parts.push(`<p class="research-card-desc">${escapeHtml(desc)}</p>`);
  if (modText && modText !== '—')
    parts.push(`<p class="research-card-mods research-card-mods-preview">${escapeHtml(t('researchEffectsLabel') + ' ' + modText)}</p>`);
  if (prereqText && !done)
    parts.push(`<p class="research-card-prereq">${escapeHtml(tParam('researchRequires', { names: prereqText }))}</p>`);
  if (!done) {
    const chanceHtml =
      scientistBonusPct > 0
        ? `${tParam('percentSuccess', { pct: effectivePct })} ${tParam('researchScientistBonus', { pct: scientistBonusPct })}`
        : tParam('percentSuccess', { pct: effectivePct });
    parts.push(
      `<p class="research-card-meta"><span class="research-card-cost">${escapeHtml(costStr)} ⬡</span><span class="research-card-chance">${escapeHtml(chanceHtml)}</span></p>`
    );
  }
  return parts.join('');
}

/** Same as buildCardInfoHtml but omits cost/chance meta (used when meta is rendered in footer with Attempt button). */
function buildCardInfoHtmlWithoutMeta(
  desc: string,
  modText: string,
  prereqText: string,
  _costStr: string,
  _effectivePct: number,
  _scientistBonusPct: number,
  done: boolean
): string {
  const parts: string[] = [];
  parts.push(`<p class="research-card-desc">${escapeHtml(desc)}</p>`);
  if (modText && modText !== '—')
    parts.push(`<p class="research-card-mods research-card-mods-preview">${escapeHtml(t('researchEffectsLabel') + ' ' + modText)}</p>`);
  if (prereqText && !done)
    parts.push(`<p class="research-card-prereq">${escapeHtml(tParam('researchRequires', { names: prereqText }))}</p>`);
  return parts.join('');
}

function buildAttemptMetaHtml(
  costStr: string,
  effectivePct: number,
  scientistBonusPct: number,
  expectedCostStr: string | null,
  durationSec: number,
  dataCost: number,
  hasPity: boolean,
  prestigePoints: number
): string {
  const chanceHtml =
    scientistBonusPct > 0
      ? `${tParam('percentSuccess', { pct: effectivePct })} ${tParam('researchScientistBonus', { pct: scientistBonusPct })}`
      : tParam('percentSuccess', { pct: effectivePct });
  const parts = [`<p class="research-card-meta"><span class="research-card-cost">${escapeHtml(costStr)} ⬡</span><span class="research-card-chance">${escapeHtml(chanceHtml)}</span></p>`];
  if (expectedCostStr) parts.push(`<p class="research-card-expected">${escapeHtml(expectedCostStr)}</p>`);
  parts.push(`<p class="research-card-duration">${escapeHtml(tParam('researchDurationSec', { sec: durationSec }))}</p>`);
  if (dataCost > 0) parts.push(`<p class="research-card-data-req">${escapeHtml(tParam('researchDataRequirement', { n: String(dataCost) }))}</p>`);
  if (hasPity) parts.push(`<p class="research-card-pity">${escapeHtml(t('researchPityNext'))}</p>`);
  if (prestigePoints >= 1) {
    parts.push(`<label class="research-card-prestige-point"><input type="checkbox" class="research-use-prestige-point" /> ${escapeHtml(t('researchUsePrestigePoint'))}</label>`);
  }
  return parts.join('');
}

const RESEARCH_TIER_COLLAPSED_KEY = 'stellar-miner-research-tier-collapsed';

function loadCollapsedTiers(): Set<number> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(RESEARCH_TIER_COLLAPSED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    return new Set(Array.isArray(arr) ? arr.filter((x): x is number => typeof x === 'number') : []);
  } catch {
    return new Set();
  }
}

function saveCollapsedTiers(collapsed: Set<number>): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(RESEARCH_TIER_COLLAPSED_KEY, JSON.stringify([...collapsed]));
}

export function toggleResearchTierCollapsed(tier: number): void {
  const collapsed = loadCollapsedTiers();
  if (collapsed.has(tier)) collapsed.delete(tier);
  else collapsed.add(tier);
  saveCollapsedTiers(collapsed);
  renderResearchSection();
}

export function renderResearchSection(): void {
  const listEl = document.getElementById('research-list');
  if (!listEl) return;
  const session = getSession();
  const settings = getSettings();
  const unlocked = getUnlockedResearch();
  const tiers = getResearchTiers();
  const collapsedTiers = loadCollapsedTiers();

  const scientistCount = session?.player.crewByRole?.scientist ?? 0;
  const scientistMultiplier = getResearchSuccessChanceMultiplier(scientistCount);
  const scientistBonusPct = scientistCount > 0 ? Math.round((scientistMultiplier - 1) * 100) : 0;
  const recommendedIds = getRecommendedResearchNodeIds(scientistCount);
  const prestigePoints = getPrestigeResearchPoints();
  const researchData = getResearchData();

  const tierSections = tiers.map(({ tier, rows }) => {
    const isCollapsed = collapsedTiers.has(tier);
    const rowHtml = rows
      .map((rowNodes) => {
        const nodeCards = rowNodes
          .map((node) => {
            const done = unlocked.includes(node.id);
            const effectiveCost = getEffectiveCost(node.id);
            const canAttempt =
              session &&
              canAttemptResearch(node.id, { coinsAvailable: session.player.coins.value.toNumber(), researchDataAvailable: researchData }) &&
              session.player.coins.gte(effectiveCost);
            const effectivePct = Math.round(getEffectiveSuccessChance(node.id, scientistCount) * 100);
            const prereqText =
              node.prerequisites.length > 0
                ? node.prerequisites
                    .map((id) => getCatalogResearchName(id))
                    .join(', ')
                : '';
            const modText = modifierText(node);
            const unlockPathIds = getUnlockPathIds(node.id).concat(node.id);
            const pathNames = unlockPathIds.map((id) => getCatalogResearchName(id));
            const expectedCost = getExpectedCoinsToUnlock(node.id, scientistCount);
            const expectedCostStr = expectedCost < Number.MAX_SAFE_INTEGER ? tParam('researchExpectedCost', { cost: formatNumber(Math.round(expectedCost), settings.compactNumbers) }) : null;
            const durationSec = Math.round(getResearchDurationMs(node.id, scientistCount) / 1000);
            const dataCost = node.researchDataCost ?? 0;
            const failureCount = getResearchFailureCount(node.id);
            const hasPity = failureCount >= RESEARCH_PITY_FAILURES;
            const isRecommended = recommendedIds.includes(node.id);
            const isSecret = !!node.secret;
            return renderResearchCard(
              node,
              tier - 1,
              done,
              canAttempt,
              effectivePct,
              scientistBonusPct,
              prereqText,
              modText,
              pathNames,
              unlockPathIds,
              settings.compactNumbers,
              formatNumber(effectiveCost, settings.compactNumbers),
              expectedCostStr,
              durationSec,
              dataCost,
              hasPity,
              prestigePoints,
              isRecommended,
              isSecret
            );
          })
          .join('');
        return `
      <div class="research-tree-row" data-row="${tier}" role="list">
        <div class="research-tree-row-nodes" style="--row-nodes: ${rowNodes.length}">${nodeCards}</div>
      </div>`;
      })
      .join('');
    const ariaExpanded = !isCollapsed;
    const toggleLabel = isCollapsed ? t('expandSection') : t('collapseSection');
    return `
    <div class="research-tier" data-tier="${tier}">
      <button type="button" class="research-tier-toggle" data-tier="${tier}" aria-expanded="${ariaExpanded}" aria-label="${escapeAttr(tParam('tierLabel', { n: String(tier) }))} ${escapeAttr(toggleLabel)}">
        <span class="research-tier-toggle-icon" aria-hidden="true">${isCollapsed ? '▶' : '▼'}</span>
        <span class="research-tier-label">${tParam('tierLabel', { n: tier })}</span>
      </button>
      <div class="research-tier-body" ${isCollapsed ? 'hidden' : ''}>${rowHtml}</div>
    </div>`;
  });

  const researchDataEl = document.getElementById('research-data-display');
  if (researchDataEl) {
    researchDataEl.textContent = `${t('researchDataLabel')}: ${researchData}`;
  }

  listEl.innerHTML = `
    <div class="research-tree" role="tree" aria-label="${t('research')} tree">
      ${tierSections.join('')}
    </div>`;
}

function renderResearchCard(
  node: ResearchNode,
  rowIndex: number,
  done: boolean,
  canAttempt: boolean,
  effectivePct: number,
  scientistBonusPct: number,
  prereqText: string,
  modText: string,
  pathNames: string[],
  unlockPathIds: string[],
  compactNumbers: boolean,
  costStr: string,
  expectedCostStr: string | null,
  durationSec: number,
  dataCost: number,
  hasPity: boolean,
  prestigePoints: number,
  isRecommended: boolean,
  isSecret: boolean
): string {
  const levelLabel = rowIndex + 1;
  const pathTitle =
    pathNames.length > 0
      ? tParam('researchUnlockPath', { path: pathNames.join(' → ') + ' → ' + getCatalogResearchName(node.id) })
      : tParam('researchUnlockPathSingle', { name: getCatalogResearchName(node.id) });
  const pathIdsAttr = escapeAttr(unlockPathIds.join(','));
  const name = getCatalogResearchName(node.id);
  const desc = getCatalogResearchDesc(node.id);
  const cardInfoHtml = buildCardInfoHtml(desc, modText, prereqText, costStr, effectivePct, scientistBonusPct, done);
  const attemptTitle = canAttempt ? tParam('researchAttemptTooltip', { pct: effectivePct }) : t('researchAttemptDisabled');
  const extraClasses = [
    done ? 'research-card--done' : '',
    isRecommended ? 'research-card--recommended' : '',
    isSecret ? 'research-card--secret' : '',
  ].filter(Boolean).join(' ');
  if (done) {
    return `
      <div class="research-card ${extraClasses}" data-research-id="${node.id}" data-unlock-path="${pathIdsAttr}" data-level="${levelLabel}" role="treeitem" aria-selected="true">
        <div class="research-card-header">
          <span class="research-card-name">${name}</span>
        </div>
        <div class="research-card-info-block">${cardInfoHtml}</div>
      </div>`;
  }
  const infoBlockHtml = buildCardInfoHtmlWithoutMeta(
    desc,
    modText,
    prereqText,
    costStr,
    effectivePct,
    scientistBonusPct,
    done
  );
  const metaHtml = buildAttemptMetaHtml(costStr, effectivePct, scientistBonusPct, expectedCostStr, durationSec, dataCost, hasPity, prestigePoints);
  return `
    <div class="research-card ${extraClasses}" data-research-id="${node.id}" data-unlock-path="${pathIdsAttr}" data-level="${levelLabel}" role="treeitem">
      <div class="research-card-header">
        <span class="research-card-name">${name}</span>
      </div>
      <div class="research-card-info-block">${infoBlockHtml}</div>
      <div class="research-card-footer">
        ${metaHtml}
        ${buttonWithTooltipHtml(
          attemptTitle,
          `<button type="button" class="research-attempt-btn" data-research-id="${node.id}" ${canAttempt ? '' : 'disabled'}>${t('attempt')}</button>`
        )}
      </div>
    </div>`;
}
