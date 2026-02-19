/**
 * Session deserialization: builds GameSession from saved payload.
 * Application owns this logic; SaveLoadService only does I/O and calls this.
 */

import Decimal from 'break_infinity.js';
import { GameSession } from '../domain/aggregates/GameSession.js';
import { Player } from '../domain/entities/Player.js';
import { Planet } from '../domain/entities/Planet.js';
import { Upgrade } from '../domain/entities/Upgrade.js';
import { GameEvent } from '../domain/entities/GameEvent.js';
import { Artifact } from '../domain/entities/Artifact.js';
import { Coins } from '../domain/value-objects/Coins.js';
import { ProductionRate } from '../domain/value-objects/ProductionRate.js';
import { UpgradeEffect } from '../domain/value-objects/UpgradeEffect.js';
import { EventEffect } from '../domain/value-objects/EventEffect.js';
import { generatePlanetName } from '../domain/constants.js';
import { toDecimal } from '../domain/bigNumber.js';
import { getUpgradeUsesSlot, EVENT_CATALOG } from './catalogs.js';
import { getBaseProductionRateFromPlanets } from './planetAffinity.js';
import { getEffectiveRequiredAstronauts } from './research.js';
import type { SavedSession, SavedUpgrade, SavedUninstallingUpgrade } from '../infrastructure/SaveLoadService.js';
import { SAVE_VERSION } from '../infrastructure/SaveLoadService.js';

export function deserializeSession(data: SavedSession): GameSession {
  const version = data.version ?? 0;
  if (version > SAVE_VERSION) throw new Error('Unsupported save version');
  const player = data.player;
  const mapUpgrade = (u: SavedUpgrade): Upgrade => {
    if (u.effect == null || (typeof u.effect.coinsPerSecond !== 'number' && typeof u.effect.coinsPerSecond !== 'string')) {
      throw new Error('Invalid upgrade effect');
    }
    return new Upgrade(
      u.id,
      u.name,
      toDecimal(u.cost),
      new UpgradeEffect(toDecimal(u.effect.coinsPerSecond)),
      getUpgradeUsesSlot(u.id)
    );
  };
  let planets: Planet[];
  if (player.planets && player.planets.length > 0) {
    planets = player.planets.map((p) => {
      const visualSeed = p.visualSeed ?? Math.floor(Math.random() * 0xffff_ffff);
      const savedInstalling = p.installingUpgrades ?? [];
      const installingUpgrades = savedInstalling.map((i) => ({
        upgrade: mapUpgrade(i.upgrade),
        startAt: i.startAt ?? i.endsAt - 60_000,
        endsAt: i.endsAt,
        rateToAdd: toDecimal(i.rateToAdd),
      }));
      const savedUninstalling = (p as { uninstallingUpgrades?: (SavedUninstallingUpgrade | { upgrade: SavedUpgrade; startAt?: number; endsAt: number })[] }).uninstallingUpgrades ?? [];
      const uninstallingUpgrades = savedUninstalling.map((u) => {
        const upgradeId = 'upgradeId' in u ? u.upgradeId : (u as { upgrade: SavedUpgrade }).upgrade.id;
        return {
          upgradeId,
          startAt: u.startAt ?? u.endsAt - 60_000,
          endsAt: u.endsAt,
        };
      });
      const planetName =
        typeof p.name === 'string' && !/undefined/i.test(p.name)
          ? p.name
          : generatePlanetName(p.id);
      return new Planet(
        p.id,
        planetName,
        p.maxUpgrades,
        p.upgrades.map(mapUpgrade),
        p.housing ?? 0,
        p.assignedCrew ?? 0,
        visualSeed,
        installingUpgrades,
        uninstallingUpgrades,
        p.discoveryFlavor
      );
    });
  } else {
    const upgrades = (player.upgrades ?? []).map(mapUpgrade);
    const firstVisualSeed = Math.floor(Math.random() * 0xffff_ffff);
    planets = [new Planet('planet-1', generatePlanetName('planet-1'), 6, upgrades, 0, 0, firstVisualSeed)];
  }
  const artifacts = player.artifacts.map(
    (a) => new Artifact(a.id, a.name, a.effect, a.isActive)
  );
  const productionRate = getBaseProductionRateFromPlanets(planets);
  const crewByRole = player.crewByRole;
  const veteranCount = player.veteranCount ?? 0;
  const crewOrCount =
    crewByRole && typeof crewByRole === 'object'
      ? {
          astronaut: crewByRole.astronaut ?? 0,
          miner: crewByRole.miner ?? 0,
          scientist: crewByRole.scientist ?? 0,
          pilot: crewByRole.pilot ?? 0,
          medic: crewByRole.medic ?? 0,
          engineer: crewByRole.engineer ?? 0,
        }
      : (player.astronautCount ?? 0);
  const crewAssignedToEquipment =
    player.crewAssignedToEquipment ??
    planets.reduce((sum, p) => sum + p.upgrades.reduce((s, u) => s + getEffectiveRequiredAstronauts(u.id), 0), 0);
  const prestigePlanetBonus = player.prestigePlanetBonus ?? 0;
  const prestigeResearchBonus = player.prestigeResearchBonus ?? 0;
  const newPlayer = new Player(
    player.id,
    Coins.from(player.coins),
    ProductionRate.from(productionRate),
    planets,
    artifacts,
    player.prestigeLevel,
    new Decimal(player.totalCoinsEver),
    crewOrCount,
    veteranCount,
    crewAssignedToEquipment,
    prestigePlanetBonus,
    prestigeResearchBonus
  );
  const activeEvents = data.activeEvents.map((e) => {
    const catalogEvent = EVENT_CATALOG.find((ev) => ev.id === e.id);
    return catalogEvent ?? new GameEvent(e.id, e.name, new EventEffect(e.effect.multiplier, e.effect.durationMs));
  });
  return new GameSession(data.id, newPlayer, activeEvents);
}
