/**
 * Handlers for choice-based events: apply selected choice (spend crew/coins/modules if needed, push effect, toast).
 */
import { getSession, getPendingChoiceEvent, setPendingChoiceEvent, pushActiveEventInstance, incrementRunEventsTriggered, addDiscoveredEvent, getDiscoveredEventIds } from './gameState.js';
import { getPresentationPort } from './uiBridge.js';
import { CHOICE_EVENT_CATALOG } from './catalogs.js';
import { GameEvent } from '../domain/entities/GameEvent.js';
import { notifyRefresh } from './refreshSignal.js';
import { checkCodexUnlocks } from './codex.js';
import { CREW_ROLES } from '../domain/constants.js';
import type { ExpeditionComposition } from '../domain/constants.js';
import { toDecimal } from '../domain/bigNumber.js';

/** Total number of installed upgrades across all planets (for choice availability). */
export function getTotalInstalledUpgradeCount(): number {
  const session = getSession();
  if (!session) return 0;
  return session.player.planets.reduce((s, p) => s + p.upgrades.length, 0);
}

/** Remove one random installed upgrade (no refund). Returns true if one was removed. */
function removeOneRandomUpgrade(): boolean {
  const session = getSession();
  if (!session) return false;
  const player = session.player;
  const planetsWithUpgrades = player.planets.filter((p) => p.upgrades.length > 0);
  if (planetsWithUpgrades.length === 0) return false;
  const planet = planetsWithUpgrades[Math.floor(Math.random() * planetsWithUpgrades.length)];
  const idx = Math.floor(Math.random() * planet.upgrades.length);
  const upgradeId = planet.upgrades[idx].id;
  return planet.removeUpgrade(upgradeId) != null;
}

/**
 * Apply the player's choice for the pending choice event. Idempotent if no pending event.
 * Spends astronauts/coins/modules if the choice has cost; pushes active event if choice has duration > 0; clears pending and notifies.
 */
export function applyEventChoice(choiceEventId: string, choiceId: string): void {
  const pending = getPendingChoiceEvent();
  if (!pending || pending.id !== choiceEventId) return;

  const choice = pending.choices.find((c) => c.id === choiceId);
  if (!choice) return;

  const session = getSession();
  if (!session) return;

  const player = session.player;

  if (choice.costAstronauts > 0) {
    const totalCrew = CREW_ROLES.reduce((s, r) => s + (player.crewByRole[r] ?? 0), 0);
    if (totalCrew < choice.costAstronauts) return;
    const comp: ExpeditionComposition = { astronaut: 0, miner: 0, scientist: 0, pilot: 0, medic: 0, engineer: 0 };
    let left = choice.costAstronauts;
    for (const r of CREW_ROLES) {
      const take = Math.min(left, player.crewByRole[r] ?? 0);
      if (take > 0) comp[r] = take;
      left -= take;
      if (left <= 0) break;
    }
    if (!player.spendCrewByComposition(comp)) return;
  }

  if (choice.costCoins > 0) {
    const cost = toDecimal(choice.costCoins);
    if (!player.coins.gte(cost)) return;
    player.spendCoins(cost);
  }

  if (choice.costUpgrade > 0) {
    const total = getTotalInstalledUpgradeCount();
    if (total < choice.costUpgrade) return;
    for (let i = 0; i < choice.costUpgrade; i++) {
      if (!removeOneRandomUpgrade()) break;
    }
  }

  setPendingChoiceEvent(null);
  getPresentationPort().clearEventChoice();

  const firstTime = !getDiscoveredEventIds().includes(pending.id);
  addDiscoveredEvent(pending.id);
  incrementRunEventsTriggered();
  checkCodexUnlocks();
  notifyRefresh();

  const effectiveEffect =
    choice.successChance != null && choice.successChance < 1
      ? Math.random() < choice.successChance
        ? choice.effect
        : choice.failureEffect
      : choice.effect;

  if (effectiveEffect != null && effectiveEffect.durationMs > 0) {
    const syntheticEvent = new GameEvent(
      `${pending.id}-${choice.id}`,
      pending.name,
      effectiveEffect,
      pending.flavor
    );
    pushActiveEventInstance({
      event: syntheticEvent,
      endsAt: Date.now() + effectiveEffect.durationMs,
    });
    getPresentationPort().showEventToast(syntheticEvent, { firstTime });
  }
}

function canAffordChoice(
  c: { costAstronauts: number; costCoins: number; costUpgrade: number },
  astronautCount: number,
  coins: number,
  upgradeCount: number
): boolean {
  if (c.costAstronauts > 0 && astronautCount < c.costAstronauts) return false;
  if (c.costCoins > 0 && coins < c.costCoins) return false;
  if (c.costUpgrade > 0 && upgradeCount < c.costUpgrade) return false;
  return true;
}

/**
 * Return whether a choice event can be shown: at least one choice is available (no cost or player can afford it).
 */
export function canShowChoiceEvent(
  astronautCount: number,
  coins: number = 0,
  upgradeCount: number = 0
): boolean {
  return CHOICE_EVENT_CATALOG.some((ce) =>
    ce.choices.some((c) => {
      const noCost = c.costAstronauts === 0 && c.costCoins === 0 && c.costUpgrade === 0;
      return noCost || canAffordChoice(c, astronautCount, coins, upgradeCount);
    })
  );
}
