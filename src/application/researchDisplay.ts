/**
 * Research node display data for Vue panel. Moved from presentation/researchView.
 */
import type { getSession } from './gameState.js';
import { formatNumber } from './format.js';
import {
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
  getRecommendedResearchNodeIds,
  type ResearchNode,
} from './research.js';
import { t, tParam, type StringKey } from './strings.js';
import { getCatalogResearchName, getCatalogResearchDesc, getCatalogUpgradeName } from './i18nCatalogs.js';
import type { CrewJobRole } from '../domain/constants.js';
import { RESEARCH_PITY_FAILURES } from '../domain/constants.js';

const CREW_JOB_ROLE_KEYS: Record<CrewJobRole, StringKey> = {
  miner: 'crewRoleMiner',
  scientist: 'crewRoleScientist',
  pilot: 'crewRolePilot',
  medic: 'crewRoleMedic',
  engineer: 'crewRoleEngineer',
};

export function modifierText(node: ResearchNode): string {
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

export type ResearchNodeDisplayData = {
  node: ResearchNode;
  done: boolean;
  canAttempt: boolean;
  effectivePct: number;
  scientistBonusPct: number;
  prereqText: string;
  modText: string;
  costStr: string;
  expectedCostStr: string | null;
  durationSec: number;
  dataCost: number;
  hasPity: boolean;
  isRecommended: boolean;
  isSecret: boolean;
  pathNames: string[];
  unlockPathIds: string[];
  pathTitle: string;
  name: string;
  desc: string;
  levelLabel: number;
};

export function getResearchNodeDisplayData(
  node: ResearchNode,
  session: ReturnType<typeof getSession>,
  compactNumbers: boolean,
  unlocked: string[],
  scientistCount: number,
  researchData: number,
  recommendedIds: string[]
): ResearchNodeDisplayData {
  const done = unlocked.includes(node.id);
  const effectiveCost = getEffectiveCost(node.id);
  const canAttempt =
    !!session &&
    canAttemptResearch(node.id, { coinsAvailable: session.player.coins.value.toNumber(), researchDataAvailable: researchData }) &&
    session.player.coins.gte(effectiveCost);
  const effectivePct = Math.round(getEffectiveSuccessChance(node.id, scientistCount) * 100);
  const scientistMultiplier = getResearchSuccessChanceMultiplier(scientistCount);
  const scientistBonusPct = scientistCount > 0 ? Math.round((scientistMultiplier - 1) * 100) : 0;
  const prereqText =
    node.prerequisites.length > 0
      ? node.prerequisites.map((id) => getCatalogResearchName(id)).join(', ')
      : '';
  const modText = modifierText(node);
  const unlockPathIds = getUnlockPathIds(node.id).concat(node.id);
  const pathNames = unlockPathIds.map((id) => getCatalogResearchName(id));
  const expectedCost = getExpectedCoinsToUnlock(node.id, scientistCount);
  const expectedCostStr =
    expectedCost < Number.MAX_SAFE_INTEGER
      ? tParam('researchExpectedCost', { cost: formatNumber(Math.round(expectedCost), compactNumbers) })
      : null;
  const durationSec = Math.round(getResearchDurationMs(node.id, scientistCount) / 1000);
  const dataCost = node.researchDataCost ?? 0;
  const failureCount = getResearchFailureCount(node.id);
  const hasPity = failureCount >= RESEARCH_PITY_FAILURES;
  const isRecommended = recommendedIds.includes(node.id);
  const isSecret = !!node.secret;
  const pathTitle =
    pathNames.length > 0
      ? tParam('researchUnlockPath', { path: pathNames.join(' → ') + ' → ' + getCatalogResearchName(node.id) })
      : tParam('researchUnlockPathSingle', { name: getCatalogResearchName(node.id) });
  return {
    node,
    done,
    canAttempt,
    effectivePct,
    scientistBonusPct,
    prereqText,
    modText,
    costStr: formatNumber(effectiveCost, compactNumbers),
    expectedCostStr,
    durationSec,
    dataCost,
    hasPity,
    isRecommended,
    isSecret,
    pathNames,
    unlockPathIds,
    pathTitle,
    name: getCatalogResearchName(node.id),
    desc: getCatalogResearchDesc(node.id),
    levelLabel: node.row + 1,
  };
}
