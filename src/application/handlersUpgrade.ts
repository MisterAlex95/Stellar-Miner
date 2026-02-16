import type { Player } from '../domain/entities/Player.js';
import type { Planet } from '../domain/entities/Planet.js';
import { getSession } from './gameState.js';
import {
  UPGRADE_CATALOG,
  createUpgrade,
  getUpgradeCost,
  getUpgradeInstallDurationMs,
  recordUnlockedUpgradeTier,
} from './catalogs.js';
import { upgradeService } from './gameState.js';
import { emit } from './eventBus.js';
import { notifyRefresh } from './refreshSignal.js';
import { getEffectiveUpgradeUsesSlot, getEffectiveRequiredAstronauts } from './research.js';
import { getPlanetType, getPlanetTypeMultiplier } from './planetAffinity.js';
import { getPresentationPort } from './uiBridge.js';
import { checkAchievements } from './achievements.js';
import { t, tParam } from './strings.js';

function refreshAfterUpgrade(opts: { flashId?: string } = {}): void {
  notifyRefresh();
  checkAchievements();
  if (opts.flashId) getPresentationPort().flashUpgradeCard(opts.flashId);
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

  recordUnlockedUpgradeTier(def.tier);
  emit('upgrade_purchased', { upgradeId, planetId });
  if (player.upgrades.length === 1 && typeof localStorage !== 'undefined') {
    const key = 'stellar-miner-first-upgrade-toast';
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, '1');
      getPresentationPort().showMiniMilestoneToast(t('firstUpgradeToast'));
    }
  }
  refreshAfterUpgrade({ flashId: upgradeId });
  return { bought: true, durations: [durationMs] };
}

export type UpgradeInstallProgressOptions = {
  upgradeId: string;
  planetId: string;
  onCancel: () => void;
};

/** Show installation progress overlay. durations: ms per step (1/X, 2/X, …). Optional onCancel shows a Cancel button. */
export function showUpgradeInstallProgress(
  cardEl: HTMLElement,
  durations: number[],
  options?: UpgradeInstallProgressOptions
): void {
  const total = Math.max(1, durations.length);
  const overlay = document.createElement('div');
  overlay.className = 'upgrade-install-progress-overlay';
  overlay.setAttribute('aria-live', 'polite');
  overlay.setAttribute('aria-busy', 'true');
  const cancelHtml = options?.onCancel
    ? `<button type="button" class="upgrade-progress-cancel" data-i18n="cancel">Cancel</button>`
    : '';
  overlay.innerHTML =
    '<div class="upgrade-install-progress-track"><div class="upgrade-install-progress-fill"></div></div><span class="upgrade-install-progress-label"></span>' +
    cancelHtml;
  cardEl.appendChild(overlay);
  cardEl.classList.add('upgrade-card--installing');
  const fillEl = overlay.querySelector('.upgrade-install-progress-fill') as HTMLElement;
  const labelEl = overlay.querySelector('.upgrade-install-progress-label') as HTMLElement;
  const cancelBtn = overlay.querySelector('.upgrade-progress-cancel') as HTMLButtonElement | null;
  if (!fillEl || !labelEl) return;

  let cancelled = false;
  const timeouts: ReturnType<typeof setTimeout>[] = [];
  if (cancelBtn && options?.onCancel) {
    cancelBtn.textContent = t('cancel');
    cancelBtn.addEventListener('click', () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
      options.onCancel();
      overlay.remove();
      cardEl.classList.remove('upgrade-card--installing');
    });
  }

  function runStep(current: number): void {
    if (cancelled) return;
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
        if (cancelled) return;
        fillEl.style.transition = `width ${durationMs}ms linear`;
        fillEl.style.width = '100%';
      });
    });
    const tid = setTimeout(() => runStep(current + 1), durationMs);
    timeouts.push(tid);
  }
  runStep(1);
}

export type UpgradeUninstallProgressOptions = {
  upgradeId: string;
  planetId: string;
  onCancel: () => void;
};

/** Show uninstall progress overlay (same look as install). Optional onCancel shows a Cancel button. */
export function showUpgradeUninstallProgress(
  cardEl: HTMLElement,
  durationMs: number,
  options?: UpgradeUninstallProgressOptions
): void {
  const overlay = document.createElement('div');
  overlay.className = 'upgrade-install-progress-overlay';
  overlay.setAttribute('aria-live', 'polite');
  overlay.setAttribute('aria-busy', 'true');
  const cancelHtml = options?.onCancel
    ? `<button type="button" class="upgrade-progress-cancel" data-i18n="cancel">Cancel</button>`
    : '';
  overlay.innerHTML =
    '<div class="upgrade-install-progress-track"><div class="upgrade-install-progress-fill"></div></div><span class="upgrade-install-progress-label"></span>' +
    cancelHtml;
  cardEl.appendChild(overlay);
  cardEl.classList.add('upgrade-card--installing');
  const fillEl = overlay.querySelector('.upgrade-install-progress-fill') as HTMLElement;
  const labelEl = overlay.querySelector('.upgrade-install-progress-label') as HTMLElement;
  const cancelBtn = overlay.querySelector('.upgrade-progress-cancel') as HTMLButtonElement | null;
  if (!fillEl || !labelEl) return;
  labelEl.textContent = tParam('uninstallingCount', { current: '1', total: '1' });
  fillEl.style.transition = 'none';
  fillEl.style.width = '0%';
  const tid = setTimeout(() => {
    overlay.remove();
    cardEl.classList.remove('upgrade-card--installing');
  }, durationMs);
  if (cancelBtn && options?.onCancel) {
    cancelBtn.textContent = t('cancel');
    cancelBtn.addEventListener('click', () => {
      clearTimeout(tid);
      options.onCancel();
      overlay.remove();
      cardEl.classList.remove('upgrade-card--installing');
    });
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fillEl.style.transition = `width ${durationMs}ms linear`;
      fillEl.style.width = '100%';
    });
  });
}

/** Cancel installing upgrades (refund coins, unassign crew). Returns true if any were cancelled. */
export function cancelUpgradeInstall(upgradeId: string, planetId: string, count: number): boolean {
  const session = getSession();
  if (!session) return false;
  const planet = session.player.planets.find((p) => p.id === planetId);
  if (!planet) return false;
  const removed = planet.cancelInstallingUpgrades(upgradeId, count);
  if (removed.length === 0) return false;
  for (const entry of removed) {
    session.player.addCoins(entry.upgrade.cost);
    const crewRequired = getEffectiveRequiredAstronauts(entry.upgrade.id);
    if (crewRequired > 0) session.player.unassignCrewFromEquipment(crewRequired);
  }
  notifyRefresh();
  return true;
}

/** Cancel pending uninstall (upgrade stays on planet). Returns true if cancelled. */
export function cancelUpgradeUninstall(upgradeId: string, planetId: string): boolean {
  const session = getSession();
  if (!session) return false;
  const planet = session.player.planets.find((p) => p.id === planetId);
  if (!planet) return false;
  const cancelled = planet.cancelUninstallingUpgrade(upgradeId);
  if (cancelled) notifyRefresh();
  return cancelled;
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

  if (bought > 0) {
    recordUnlockedUpgradeTier(def.tier);
    refreshAfterUpgrade();
  }
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

export type UpgradeUninstallResult = { uninstalled: boolean; durationMs?: number };

/** Start uninstalling one copy of an upgrade from the given planet. Duration = install time / 2; refund when complete (game loop). */
export function handleUpgradeUninstall(upgradeId: string, planetId: string): UpgradeUninstallResult {
  const session = getSession();
  if (!session) return { uninstalled: false };
  const def = UPGRADE_CATALOG.find((d) => d.id === upgradeId);
  if (!def) return { uninstalled: false };
  const player = session.player;
  const planet = player.planets.find((p) => p.id === planetId);
  const upgrade = planet?.upgrades.find((u) => u.id === upgradeId);
  if (!planet || !upgrade) return { uninstalled: false };

  const installDurationMs = getUpgradeInstallDurationMs(def.tier, upgrade.cost.toNumber());
  const durationMs = Math.max(1, Math.floor(installDurationMs / 2));
  const mult = getPlanetTypeMultiplier(def.id, getPlanetType(planet.name));
  const started = upgradeService.startUninstallUpgrade(player, planet, upgradeId, mult, Date.now(), durationMs);
  if (!started) return { uninstalled: false };

  notifyRefresh();
  return { uninstalled: true, durationMs };
}
