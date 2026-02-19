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
  getResearchSpriteIndexById,
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

/** Explicit icon per research id (overrides heuristic). */
const RESEARCH_ICON_BY_ID: Record<string, string> = {
  'mining-theory': 'miner',
  'heavy-equipment': 'production',
  'automation': 'click',
  'survey-systems': 'scientist',
  'basic-refining': 'medic',
  'orbital-engineering': 'pilot',
  'deep-extraction': 'production',
  'ai-assist': 'neural',
  'efficiency': 'engineer',
  'precision-drilling': 'production',
  'catalytic-cracking': 'refining',
  'quantum-mining': 'production',
  'void-tech': 'neural',
  'stellar-harvester': 'production',
  'neural-boost': 'neural',
  'refinery-core': 'refining',
  'sensor-arrays': 'expedition',
  'plasma-smelting': 'refining',
  'exo-forging': 'refining',
  'dimensional-mining': 'production',
  'plasma-catalysis': 'refining',
  'nexus-research': 'neural',
  'quantum-sensors': 'expedition',
  'singularity-drill': 'production',
  'void-forge': 'neural',
  'chrono-extraction': 'production',
  'exo-core': 'refining',
  'reality-anchor': 'production',
  'multiverse-tap': 'production',
  'neural-network': 'neural',
  'omega-refinery': 'refining',
  'stellar-engine': 'production',
  'infinity-loop': 'production',
  'cosmic-mind': 'neural',
  'singularity-core': 'production',
  'architect': 'research',
  'transcendence': 'neural',
  'omega-theory': 'secret',
};

/** Icon key for a research node (used with ResearchIcon SVG component and 3D textures). */
export function getResearchIcon(node: ResearchNode): string {
  const explicit = RESEARCH_ICON_BY_ID[node.id];
  if (explicit) return explicit;
  const m = node.modifiers;
  if (m.unlocksCrewRole) {
    const roles: string[] = ['miner', 'scientist', 'pilot', 'medic', 'engineer'];
    if (roles.includes(m.unlocksCrewRole)) return m.unlocksCrewRole;
  }
  if (m.expeditionDurationPercent !== undefined || m.expeditionDeathChancePercent !== undefined) return 'expedition';
  const prod = m.productionPercent ?? 0;
  const click = m.clickPercent ?? 0;
  if (click > prod && click >= 10) return 'click';
  if (prod >= 15 && click < 8) return 'production';
  if (node.id.includes('refin') || node.id.includes('catalys') || node.id.includes('smelt') || node.id.includes('forge')) return 'refining';
  if (node.id.includes('neural') || node.id.includes('ai-') || node.id.includes('void') || node.id.includes('quantum')) return 'neural';
  if (node.secret) return 'secret';
  return 'research';
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
  icon: string;
  /** Sprite cell index for icons.png (order = tree rows). Use for ResearchIcon spriteIndex. */
  iconSpriteIndex: number;
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
    icon: getResearchIcon(node),
    iconSpriteIndex: getResearchSpriteIndexById(node.id),
  };
}
