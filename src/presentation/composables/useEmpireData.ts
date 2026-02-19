/**
 * Reactive empire panel data: crew, planets (grouped), prestige, expedition.
 * Recomputes when game state store updates (bridge).
 */
import { computed } from 'vue';
import { useGameStateStore } from '../stores/gameState.js';
import {
  getSession,
  getSettings,
  getExpeditionEndsAt,
  getExpeditionDurationMs,
  planetService,
} from '../../application/gameState.js';
import { formatNumber } from '../../application/format.js';
import { getAssignedAstronauts } from '../../application/crewHelpers.js';
import {
  getUnlockedCrewRoles,
  isCrewRetrainUnlocked,
  getResearchHousingCapacityBonus,
  getEffectiveUsedSlots,
  hasEffectiveFreeSlot,
} from '../../application/research.js';
import { getPrestigeProductionPercent } from '../../application/handlersPrestige.js';
import {
  getAstronautCost,
  getRetrainCost,
  getMaxAstronauts,
  CREW_ROLES,
  PRESTIGE_COIN_THRESHOLD,
  HOUSING_ASTRONAUT_CAPACITY,
  isNextExpeditionNewSystem,
  MINER_PRODUCTION_BONUS,
  OTHER_CREW_PRODUCTION_BONUS,
  ENGINEER_PRODUCTION_BONUS,
  PILOT_EXPEDITION_DURATION_REDUCTION_PCT,
  VETERAN_PRODUCTION_BONUS,
  SCIENTIST_RESEARCH_SUCCESS_PER_SCIENTIST,
  SCIENTIST_RESEARCH_SUCCESS_CAP,
  type CrewRole,
  type CrewJobRole,
} from '../../domain/constants.js';
import { getPlanetDisplayName, getSolarSystemName, PLANETS_PER_SOLAR_SYSTEM } from '../../application/solarSystems.js';
import { getPlanetEffectiveProduction } from '../../application/productionHelpers.js';
import { getPlanetType } from '../../application/planetAffinity.js';
import { t, tParam, type StringKey } from '../../application/strings.js';
import { getUnlockedBlocks } from '../../application/progression.js';
import type { Planet } from '../../domain/entities/Planet.js';

const ROLE_KEYS: Record<CrewRole, StringKey> = {
  astronaut: 'crewRoleAstronaut',
  miner: 'crewRoleMiner',
  scientist: 'crewRoleScientist',
  pilot: 'crewRolePilot',
  medic: 'crewRoleMedic',
  engineer: 'crewRoleEngineer',
};

const ROLE_EFFECT_KEYS: Partial<Record<CrewRole, StringKey>> = {
  miner: 'crewRoleEffectMiner',
  scientist: 'crewRoleEffectScientist',
  pilot: 'crewRoleEffectPilot',
  medic: 'crewRoleEffectMedic',
  engineer: 'crewRoleEffectEngineer',
};

const PRESTIGE_TITLES: { minLevel: number; name: string }[] = [
  { minLevel: 20, name: 'Legend' },
  { minLevel: 10, name: 'Veteran' },
  { minLevel: 5, name: 'Champion' },
  { minLevel: 2, name: 'Rising' },
  { minLevel: 1, name: 'Rookie' },
  { minLevel: 0, name: 'Newcomer' },
];

function getPrestigeTitle(level: number): string {
  for (const t of PRESTIGE_TITLES) {
    if (level >= t.minLevel) return t.name;
  }
  return PRESTIGE_TITLES[PRESTIGE_TITLES.length - 1].name;
}

function isJobRoleUnlocked(role: CrewRole, unlocked: CrewJobRole[]): boolean {
  return role === 'astronaut' || unlocked.includes(role as CrewJobRole);
}

export interface CrewSegmentVm {
  role: string;
  widthPct: number;
  title: string;
  show: boolean;
}

export interface CrewRoleCardVm {
  role: CrewRole;
  label: string;
  count: number;
  effectText: string;
  costStr: string;
  canHire: boolean;
  unlocked: boolean;
}

export interface CrewVm {
  capacityPct: number;
  segments: CrewSegmentVm[];
  summary: string;
  summaryLabel: string;
  showEmpty: boolean;
  roleCards: CrewRoleCardVm[];
  assignedCount: number;
  veteranCount: number;
  totalCrew: number;
  maxCrew: number;
  retrainCostStr: string;
  retrainCanAfford: boolean;
  retrainUnlocked: boolean;
}

export interface PlanetCardVm {
  id: string;
  name: string;
  displayName: string;
  systemName: string;
  productionStr: string;
  productionClass: string;
  effectiveUsed: number;
  maxUpgrades: number;
  addSlotCostStr: string;
  canAddSlot: boolean;
  addSlotTooltip: string;
  housingCostStr: string;
  canBuildHousing: boolean;
  hasSlot: boolean;
  housingTooltip: string;
  visualSeed: number;
  planetType: string;
  infoTooltip: string;
  /** First-contact flavor from discovery (if any). */
  discoveryFlavor?: string;
}

export interface PlanetSystemVm {
  systemIndex: number;
  systemName: string;
  planets: PlanetCardVm[];
}

export interface PrestigeVm {
  statusText: string;
  canPrestige: boolean;
  summaryText: string;
}

export interface ExpeditionVm {
  inProgress: boolean;
  endsAt: number | null;
  durationMs: number;
  remainingMs: number;
  progressPct: number;
  progressText: string;
  costStr: string;
  astronautsRequired: number;
  canLaunch: boolean;
  isNewSystem: boolean;
}

export function useEmpireData() {
  const store = useGameStateStore();

  const crew = computed<CrewVm | null>(() => {
    void store.coins;
    void store.planets;
    const session = getSession();
    if (!session) return null;
    const player = session.player;
    const settings = getSettings();
    const assigned = getAssignedAstronauts(session);
    const free = player.freeCrewCount;
    const totalHousing = player.planets.reduce((s, p) => s + p.housingCount, 0);
    const maxCrew = getMaxAstronauts(player.planets.length, totalHousing, getResearchHousingCapacityBonus());
    const totalCrew = player.astronautCount;
    const atCap = totalCrew >= maxCrew;
    const cost = getAstronautCost(free);
    const canHire = player.coins.gte(cost) && !atCap;
    const costStr = formatNumber(cost, settings.compactNumbers);
    const unlockedCrewRoles = getUnlockedCrewRoles();
    const capacityPct = maxCrew > 0 ? Math.min(100, (totalCrew / maxCrew) * 100) : 0;
    const pctOfMax = (n: number) => (maxCrew > 0 ? (n / maxCrew) * 100 : 0);

    const segments: CrewSegmentVm[] = CREW_ROLES.map((role) => ({
      role,
      widthPct: pctOfMax(player.crewByRole[role]),
      title: tParam('crewSegmentRole', { n: String(player.crewByRole[role]), role: t(ROLE_KEYS[role]) }),
      show: isJobRoleUnlocked(role, unlockedCrewRoles),
    }));
    segments.push({
      role: 'equipment',
      widthPct: pctOfMax(assigned),
      title: tParam('crewSegmentEquipment', { n: String(assigned) }),
      show: true,
    });
    const freeSlots = Math.max(0, maxCrew - totalCrew);
    segments.push({
      role: 'free',
      widthPct: pctOfMax(freeSlots),
      title: tParam('crewSegmentFree', { n: String(freeSlots) }),
      show: true,
    });

    const crewBonusPct = Math.round(
      (player.crewByRole.miner * MINER_PRODUCTION_BONUS +
        (player.crewByRole.scientist + player.crewByRole.pilot + player.crewByRole.medic) * OTHER_CREW_PRODUCTION_BONUS +
        player.crewByRole.engineer * ENGINEER_PRODUCTION_BONUS) *
        100 +
        player.veteranCount * VETERAN_PRODUCTION_BONUS * 100
    );

    let summary = '';
    if (totalCrew === 0) summary = tParam('noCrewYetMax', { max: maxCrew });
    else if (assigned > 0) {
      if (crewBonusPct > 0)
        summary = tParam('crewSummaryWithAssigned', {
          free: String(free),
          assigned: String(assigned),
          total: String(totalCrew),
          max: String(maxCrew),
          pct: String(crewBonusPct),
        });
      else
        summary = tParam('crewSummaryNoBonusWithAssigned', {
          free: String(free),
          assigned: String(assigned),
          total: String(totalCrew),
          max: String(maxCrew),
        });
    } else if (crewBonusPct > 0)
      summary = tParam('crewSummary', { current: String(totalCrew), max: String(maxCrew), pct: String(crewBonusPct) });
    else summary = tParam('crewSummaryNoBonus', { current: String(totalCrew), max: String(maxCrew) });

    const summaryLabel = totalCrew > 0 ? tParam('crewSectionCount', { n: String(totalCrew) }) : '';

    const roleCards: CrewRoleCardVm[] = CREW_ROLES.map((role) => {
      const n = player.crewByRole[role];
      const unlocked = isJobRoleUnlocked(role, unlockedCrewRoles);
      let effectText = '';
      if (role === 'miner' && ROLE_EFFECT_KEYS.miner)
        effectText = n > 0 ? tParam(ROLE_EFFECT_KEYS.miner, { pct: String(Math.round(n * MINER_PRODUCTION_BONUS * 100)) }) : '';
      else if (role === 'scientist' && ROLE_EFFECT_KEYS.scientist) {
        const pct = Math.min(n * SCIENTIST_RESEARCH_SUCCESS_PER_SCIENTIST * 100, SCIENTIST_RESEARCH_SUCCESS_CAP * 100);
        effectText = n > 0 ? tParam(ROLE_EFFECT_KEYS.scientist, { pct: String(Math.round(pct)) }) : '';
      } else if (role === 'pilot' && ROLE_EFFECT_KEYS.pilot)
        effectText = n > 0 ? tParam(ROLE_EFFECT_KEYS.pilot, { pct: String(PILOT_EXPEDITION_DURATION_REDUCTION_PCT) }) : '';
      else if (role === 'medic' && ROLE_EFFECT_KEYS.medic)
        effectText = n > 0 ? tParam(ROLE_EFFECT_KEYS.medic, { pct: String(Math.round(n * 2)) }) : '';
      else if (role === 'engineer' && ROLE_EFFECT_KEYS.engineer)
        effectText = n > 0 ? tParam(ROLE_EFFECT_KEYS.engineer, { pct: String(Math.round(n * ENGINEER_PRODUCTION_BONUS * 100)) }) : '';

      return {
        role,
        label: t(ROLE_KEYS[role]),
        count: n,
        effectText,
        costStr,
        canHire,
        unlocked,
      };
    });

    const retrainCost = getRetrainCost();
    const retrainCostStr = formatNumber(retrainCost, settings.compactNumbers);
    const retrainCanAfford = player.coins.gte(retrainCost);
    const retrainUnlocked = isCrewRetrainUnlocked();

    return {
      capacityPct,
      segments,
      summary,
      summaryLabel,
      showEmpty: totalCrew === 0,
      roleCards,
      assignedCount: assigned,
      veteranCount: player.veteranCount,
      totalCrew,
      maxCrew,
      retrainCostStr,
      retrainCanAfford,
      retrainUnlocked,
    };
  });

  const planetSystems = computed<PlanetSystemVm[]>(() => {
    void store.planets;
    const session = getSession();
    if (!session) return [];
    const player = session.player;
    const settings = getSettings();
    const groups: Map<number, PlanetCardVm[]> = new Map();
    player.planets.forEach((p: Planet, index: number) => {
      const systemIndex = Math.floor(index / PLANETS_PER_SOLAR_SYSTEM);
      const systemName = getSolarSystemName(systemIndex);
      const displayName = getPlanetDisplayName(p.name, index);
      const planetProd = getPlanetEffectiveProduction(p, session);
      const prodStr = formatNumber(planetProd, settings.compactNumbers);
      const prodClass = planetProd.gt(0) ? 'planet-card-production' : 'planet-card-production planet-card-production--zero';
      const effectiveUsed = getEffectiveUsedSlots(p);
      const addSlotCost = planetService.getAddSlotCost(p);
      const canAddSlot = planetService.canAddSlot(player, p);
      const addSlotTooltip = canAddSlot
        ? tParam('addSlotTooltip', { cost: formatNumber(addSlotCost, settings.compactNumbers) })
        : tParam('needCoinsForSlot', { cost: formatNumber(addSlotCost, settings.compactNumbers) });
      const hasSlot = hasEffectiveFreeSlot(p);
      const housingCost = planetService.getHousingCost(p);
      const canBuildHousing = planetService.canBuildHousing(player, p, hasEffectiveFreeSlot);
      const housingTooltip = canBuildHousing
        ? tParam('housingBuildTooltip', {
            planet: displayName,
            cost: formatNumber(housingCost, settings.compactNumbers),
            capacity: HOUSING_ASTRONAUT_CAPACITY,
          })
        : tParam('needCoinsForHousing', { cost: formatNumber(housingCost, settings.compactNumbers) });
      const planetType = getPlanetType(p.name);
      const typeLabel = planetType.charAt(0).toUpperCase() + planetType.slice(1);
      const infoLines = [
        displayName,
        `${t('planetInfoType')}: ${typeLabel}`,
        `${t('planetInfoSlots')}: ${effectiveUsed}/${p.maxUpgrades}`,
        `${t('planetInfoProduction')}: ${prodStr}/s`,
      ];
      if (p.discoveryFlavor) infoLines.push(p.discoveryFlavor);
      const infoTooltip = infoLines.join('\n');

      const card: PlanetCardVm = {
        id: p.id,
        name: p.name,
        displayName,
        systemName,
        productionStr: prodStr,
        productionClass: prodClass,
        effectiveUsed,
        maxUpgrades: p.maxUpgrades,
        addSlotCostStr: formatNumber(addSlotCost, settings.compactNumbers),
        canAddSlot,
        addSlotTooltip,
        housingCostStr: formatNumber(housingCost, settings.compactNumbers),
        canBuildHousing,
        hasSlot,
        housingTooltip,
        visualSeed: p.visualSeed ?? 0,
        planetType,
        infoTooltip,
        discoveryFlavor: p.discoveryFlavor,
      };
      if (!groups.has(systemIndex)) groups.set(systemIndex, []);
      groups.get(systemIndex)!.push(card);
    });
    return Array.from(groups.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([systemIndex, planets]) => ({
        systemIndex,
        systemName: getSolarSystemName(systemIndex),
        planets,
      }));
  });

  const prestige = computed<PrestigeVm | null>(() => {
    void store.coins;
    const session = getSession();
    if (!session) return null;
    const player = session.player;
    const settings = getSettings();
    const canPrestige = player.coins.gte(PRESTIGE_COIN_THRESHOLD);
    const title = getPrestigeTitle(player.prestigeLevel);
    const prestigePct = Math.round(getPrestigeProductionPercent(player));
    const statusText =
      player.prestigeLevel > 0
        ? `Prestige level ${player.prestigeLevel} — ${title} (+${prestigePct}% prod). Need ${formatNumber(PRESTIGE_COIN_THRESHOLD, settings.compactNumbers)} ⬡ to prestige again.`
        : `Reach ${formatNumber(PRESTIGE_COIN_THRESHOLD, settings.compactNumbers)} ⬡ to unlock Prestige.`;
    const summaryText = canPrestige ? 'Ready' : player.prestigeLevel > 0 ? `Lv. ${player.prestigeLevel}` : '';
    return { statusText, canPrestige, summaryText };
  });

  const expedition = computed<ExpeditionVm>(() => {
    void store.coins;
    void store.planets;
    const session = getSession();
    const endsAt = getExpeditionEndsAt();
    const inProgress = endsAt != null;
    const durationMs = getExpeditionDurationMs();
    const now = Date.now();
    const remainingMs = inProgress && endsAt != null ? Math.max(0, endsAt - now) : 0;
    const progressPct = durationMs > 0 && inProgress ? Math.min(100, (1 - remainingMs / durationMs) * 100) : 0;

    if (!session) {
      return {
        inProgress: false,
        endsAt: null,
        durationMs: 0,
        remainingMs: 0,
        progressPct: 0,
        progressText: '',
        costStr: '0',
        astronautsRequired: 0,
        canLaunch: false,
        isNewSystem: false,
      };
    }
    const player = session.player;
    const settings = getSettings();
    const cost = planetService.getNewPlanetCost(player);
    const astronautsRequired = planetService.getExpeditionAstronautsRequired(player);
    const canLaunch = planetService.canLaunchExpedition(player);
    const isNewSystem = isNextExpeditionNewSystem(player.planets.length);

    return {
      inProgress,
      endsAt,
      durationMs,
      remainingMs,
      progressPct,
      progressText: inProgress ? tParam('expeditionInProgress', { seconds: String(Math.ceil(remainingMs / 1000)) }) : '',
      costStr: formatNumber(cost.toNumber(), settings.compactNumbers),
      astronautsRequired,
      canLaunch,
      isNewSystem,
    };
  });

  const unlockedBlocks = computed(() => {
    void store.coins;
    const session = getSession();
    return getUnlockedBlocks(session);
  });

  return { crew, planetSystems, prestige, expedition, unlockedBlocks };
}
