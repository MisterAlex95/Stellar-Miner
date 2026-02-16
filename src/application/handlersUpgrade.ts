import type { Player } from '../domain/entities/Player.js';
import type { Planet } from '../domain/entities/Planet.js';
import { getSession } from './gameState.js';
import {
  UPGRADE_CATALOG,
  createUpgrade,
  getUpgradeCost,
  getUpgradeInstallDurationMs,
} from './catalogs.js';
import { upgradeService } from './gameState.js';
import { emit } from './eventBus.js';
import { notifyRefresh } from './refreshSignal.js';
import { getEffectiveUpgradeUsesSlot, getEffectiveRequiredAstronauts } from './research.js';
import { getPlanetType, getPlanetTypeMultiplier } from './planetAffinity.js';
import { flashUpgradeCard } from '../presentation/upgradeListView.js';
import { showMiniMilestoneToast } from '../presentation/toasts.js';
import { checkAchievements } from './achievements.js';
import { t, tParam } from './strings.js';

function refreshAfterUpgrade(opts: { flashId?: string } = {}): void {
  notifyRefresh();
  checkAchievements();
  if (opts.flashId) flashUpgradeCard(opts.flashId);
}

/** Whether we need a planet with a raw free slot for this upgrade (effective = after research). */
function upgradeNeedsSlot(upgradeId: string): boolean {
  return getEffectiveUpgradeUsesSlot(upgradeId);
}

/** Create upgrade for purchase: uses effective usesSlot so research slot-free works with domain. */
function createUpgradeForPurchase(def: (typeof UPGRADE_CATALOG)[0], ownedCount: number) {
  return createUpgrade(def, ownedCount, { usesSlot: upgradeNeedsSlot(def.id) });
}

/** Count installed + installing copies of this upgrade (for cost and slot). */
function countUpgradeIncludingInstalling(player: Player, upgradeId: string): number {
  const installed = player.upgrades.filter((u) => u.id === upgradeId).length;
  const installing = player.planets.reduce(
    (s, p) => s + p.installingUpgrades.filter((i) => i.upgrade.id === upgradeId).length,
    0
  );
  return installed + installing;
}

export type UpgradeBuyResult = { bought: boolean; durations: number[] };

export function handleUpgradeBuy(upgradeId: string, planetId?: string): UpgradeBuyResult {
  const session = getSession();
  if (!session) return { bought: false, durations: [] };
  const def = UPGRADE_CATALOG.find((d) => d.id === upgradeId);
  if (!def) return { bought: false, durations: [] };
  const player = session.player;
  const ownedCount = countUpgradeIncludingInstalling(player, upgradeId);
  const upgrade = createUpgradeForPurchase(def, ownedCount);
  const targetPlanet = planetId ? player.planets.find((p) => p.id === planetId) : undefined;
  const needsSlot = upgradeNeedsSlot(upgradeId);

  if (!player.coins.gte(upgrade.cost)) return { bought: false, durations: [] };
  if (needsSlot && !player.getPlanetWithFreeSlot()) return { bought: false, durations: [] };
  if (planetId && targetPlanet && needsSlot && !targetPlanet.hasFreeSlot()) return { bought: false, durations: [] };
  const crewRequired = getEffectiveRequiredAstronauts(def.id);
  if (crewRequired > 0 && player.freeAstronautCount < crewRequired) return { bought: false, durations: [] };
  if (crewRequired > 0 && !player.assignCrewToEquipment(crewRequired)) return { bought: false, durations: [] };
  // Update crew UI immediately so the player sees the count drop on click
  if (crewRequired > 0) notifyRefresh();

  const planet = resolveTargetPlanet(player, targetPlanet, needsSlot);
  if (!planet) {
    if (crewRequired > 0) {
      player.unassignCrewFromEquipment(crewRequired);
      notifyRefresh();
    }
    return { bought: false, durations: [] };
  }

  const durationMs = getUpgradeInstallDurationMs(def.tier, upgrade.cost.toNumber());
  const mult = getPlanetTypeMultiplier(def.id, getPlanetType(planet.name));
  const slotCheck = needsSlot ? (p: { hasFreeSlot: () => boolean }) => p.hasFreeSlot() : undefined;
  const event = upgradeService.purchaseUpgrade(
    player,
    upgrade,
    planet,
    mult,
    slotCheck,
    durationMs,
    Date.now()
  );
  if (!event) {
    if (crewRequired > 0) {
      player.unassignCrewFromEquipment(crewRequired);
      notifyRefresh();
    }
    return { bought: false, durations: [] };
  }

  emit('upgrade_purchased', { upgradeId, planetId });
  if (player.upgrades.length === 1 && typeof localStorage !== 'undefined') {
    const key = 'stellar-miner-first-upgrade-toast';
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, '1');
      showMiniMilestoneToast(t('firstUpgradeToast'));
    }
  }
  refreshAfterUpgrade({ flashId: upgradeId });
  return { bought: true, durations: [durationMs] };
}

/** Show installation progress overlay. durations: ms per step (1/X, 2/X, …). */
export function showUpgradeInstallProgress(cardEl: HTMLElement, durations: number[]): void {
  const total = Math.max(1, durations.length);
  const overlay = document.createElement('div');
  overlay.className = 'upgrade-install-progress-overlay';
  overlay.setAttribute('aria-live', 'polite');
  overlay.setAttribute('aria-busy', 'true');
  overlay.innerHTML =
    '<div class="upgrade-install-progress-track"><div class="upgrade-install-progress-fill"></div></div><span class="upgrade-install-progress-label"></span>';
  cardEl.appendChild(overlay);
  cardEl.classList.add('upgrade-card--installing');
  const fillEl = overlay.querySelector('.upgrade-install-progress-fill') as HTMLElement;
  const labelEl = overlay.querySelector('.upgrade-install-progress-label') as HTMLElement;
  if (!fillEl || !labelEl) return;

  function runStep(current: number): void {
    if (current > total) {
      overlay.remove();
      cardEl.classList.remove('upgrade-card--installing');
      return;
    }
    const durationMs = durations[current - 1] ?? durations[0] ?? 4000;
    labelEl.textContent = tParam('upgradingCount', { current: String(current), total: String(total) });
    fillEl.style.transition = 'none';
    fillEl.style.width = '0%';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fillEl.style.transition = `width ${durationMs}ms linear`;
        fillEl.style.width = '100%';
      });
    });
    setTimeout(() => runStep(current + 1), durationMs);
  }
  runStep(1);
}

export type UpgradeBuyMaxResult = { bought: number; durations: number[] };

export function handleUpgradeBuyMax(upgradeId: string, planetId?: string, maxToBuy?: number): UpgradeBuyMaxResult {
  const session = getSession();
  if (!session) return { bought: 0, durations: [] };
  const def = UPGRADE_CATALOG.find((d) => d.id === upgradeId);
  if (!def) return { bought: 0, durations: [] };
  const player = session.player;
  const needsSlot = upgradeNeedsSlot(upgradeId);
  const crewRequired = getEffectiveRequiredAstronauts(def.id);
  let ownedCount = countUpgradeIncludingInstalling(player, upgradeId);
  let bought = 0;
  const durations: number[] = [];

  while (true) {
    if (maxToBuy !== undefined && bought >= maxToBuy) break;
    const nextCost = getUpgradeCost(def, ownedCount);
    if (!player.coins.gte(nextCost) || (crewRequired > 0 && player.freeAstronautCount < crewRequired)) break;

    const target = resolveTargetPlanet(
      player,
      planetId ? player.planets.find((p) => p.id === planetId) ?? null : null,
      needsSlot
    );
    if (!target) break;
    if (crewRequired > 0 && !player.assignCrewToEquipment(crewRequired)) break;

    const upgrade = createUpgradeForPurchase(def, ownedCount);
    const durationMs = getUpgradeInstallDurationMs(def.tier, upgrade.cost.toNumber());
    const mult = getPlanetTypeMultiplier(def.id, getPlanetType(target.name));
    const slotCheck = needsSlot ? (p: { hasFreeSlot: () => boolean }) => p.hasFreeSlot() : undefined;
    const event = upgradeService.purchaseUpgrade(
      player,
      upgrade,
      target,
      mult,
      slotCheck,
      durationMs,
      Date.now()
    );
    if (!event) {
      if (crewRequired > 0) player.unassignCrewFromEquipment(crewRequired);
      break;
    }
    bought++;
    durations.push(durationMs);
    ownedCount++;
  }

  if (bought > 0) refreshAfterUpgrade();
  return { bought, durations };
}

function resolveTargetPlanet(
  player: Player,
  targetPlanet: Planet | null | undefined,
  needsSlot: boolean
): Planet | null {
  if (targetPlanet && player.planets.includes(targetPlanet)) {
    return needsSlot && !targetPlanet.hasFreeSlot() ? null : targetPlanet;
  }
  return needsSlot ? player.getPlanetWithFreeSlot() : player.planets[0] ?? null;
}
