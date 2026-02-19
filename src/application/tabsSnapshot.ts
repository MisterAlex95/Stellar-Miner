/**
 * Tab visibility and badges snapshot from game state. Used by game loop to feed the bridge.
 * hasNewModuleToInstall is provided by the caller (e.g. from presentation dashboardHelpers).
 */
import { getSession, getExpeditionEndsAt, planetService } from './gameState.js';
import { getUnlockedBlocks } from './progression.js';
import { getQuestProgress } from './quests.js';
import { RESEARCH_CATALOG, canAttemptResearch, hasEffectiveFreeSlot, getResearchHousingCapacityBonus } from './research.js';
import { PRESTIGE_COIN_THRESHOLD, getAstronautCost, getMaxAstronauts } from '../domain/constants.js';

export type TabsSnapshot = {
  visible: Record<string, boolean>;
  badges: Record<string, boolean>;
};

export function getTabsSnapshot(hasNewModuleToInstall: boolean): TabsSnapshot {
  const session = getSession();
  const unlocked = session ? getUnlockedBlocks(session) : new Set<string>();
  const visible: Record<string, boolean> = {
    mine: true,
    dashboard: true,
    upgrades: unlocked.has('upgrades'),
    empire: unlocked.has('crew') || unlocked.has('planets') || unlocked.has('prestige'),
    research: unlocked.has('research'),
    stats: unlocked.has('upgrades'),
  };
  const questProgress = getQuestProgress();
  const questClaimable = questProgress?.done ?? false;
  const canPrestige = session?.player.coins.gte(PRESTIGE_COIN_THRESHOLD) ?? false;
  const prestigeUnlocked = unlocked.has('prestige');
  const researchUnlocked = unlocked.has('research');
  const hasAttemptableResearch =
    researchUnlocked &&
    session &&
    RESEARCH_CATALOG.some((n) => canAttemptResearch(n.id) && session.player.coins.gte(n.cost));
  const upgradesUnlocked = unlocked.has('upgrades');
  const hasNewModuleToInstallResolved = upgradesUnlocked && hasNewModuleToInstall;
  const empireUnlocked = unlocked.has('crew') || unlocked.has('planets') || unlocked.has('prestige');
  let hasEmpireAction = prestigeUnlocked && canPrestige;
  if (session && !hasEmpireAction) {
    const player = session.player;
    if (unlocked.has('crew')) {
      const totalHousing = player.planets.reduce((s, p) => s + p.housingCount, 0);
      const maxCrew = getMaxAstronauts(player.planets.length, totalHousing, getResearchHousingCapacityBonus());
      const atCap = player.astronautCount >= maxCrew;
      if (!atCap && player.coins.gte(getAstronautCost(player.freeCrewCount))) hasEmpireAction = true;
    }
    if (!hasEmpireAction && unlocked.has('planets') && getExpeditionEndsAt() === null && planetService.canLaunchExpedition(player))
      hasEmpireAction = true;
    if (!hasEmpireAction && player.planets.some((p) => planetService.canAddSlot(player, p))) hasEmpireAction = true;
    if (!hasEmpireAction && player.planets.some((p) => planetService.canBuildHousing(player, p, hasEffectiveFreeSlot)))
      hasEmpireAction = true;
  }
  const questUnlocked = unlocked.has('quest');
  const badges: Record<string, boolean> = {
    mine: questUnlocked && questClaimable,
    empire: empireUnlocked && hasEmpireAction,
    research: hasAttemptableResearch,
    dashboard: false,
    upgrades: hasNewModuleToInstallResolved,
    stats: false,
  };
  return { visible, badges };
}
