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
import type { ISaveLoadService } from '../domain/services/ISaveLoadService.js';
import { getPlanetName } from '../domain/constants.js';

const STORAGE_KEY = 'stellar-miner-session';
const LAST_SAVE_KEY = 'stellar-miner-last-save';
const MIN_OFFLINE_MS = 60_000; // 1 min before offline progress counts
const MAX_OFFLINE_MS = 24 * 60 * 60 * 1000; // cap 24h

type SavedUpgrade = { id: string; name: string; cost: number; effect: { coinsPerSecond: number } };
type SavedPlanet = { id: string; name: string; maxUpgrades: number; upgrades: SavedUpgrade[] };

type SavedSession = {
  id: string;
  player: {
    id: string;
    coins: number;
    productionRate: number;
    /** New format: planets with upgrades. */
    planets?: SavedPlanet[];
    /** Legacy: flat upgrades (migrated to one planet on load). */
    upgrades?: SavedUpgrade[];
    artifacts: Array<{ id: string; name: string; effect: unknown; isActive: boolean }>;
    prestigeLevel: number;
    totalCoinsEver: number;
  };
  activeEvents: Array<{ id: string; name: string; effect: { multiplier: number; durationMs: number } }>;
};

/** Infrastructure: persist game session to localStorage. */
export class SaveLoadService implements ISaveLoadService {
  private lastOfflineCoinsApplied = 0;

  getLastOfflineCoins(): number {
    const n = this.lastOfflineCoinsApplied;
    this.lastOfflineCoinsApplied = 0;
    return n;
  }

  async save(session: GameSession): Promise<void> {
    const payload = this.serialize(session);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      localStorage.setItem(LAST_SAVE_KEY, String(Date.now()));
    }
  }

  async load(): Promise<GameSession | null> {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SavedSession;
    const session = this.deserialize(data);
    const lastSaveRaw = localStorage.getItem(LAST_SAVE_KEY);
    if (lastSaveRaw) {
      const lastSave = parseInt(lastSaveRaw, 10);
      const elapsed = Date.now() - lastSave;
      if (elapsed >= MIN_OFFLINE_MS && session.player.productionRate.value > 0) {
        const cappedMs = Math.min(elapsed, MAX_OFFLINE_MS);
        const offlineCoins = (cappedMs / 1000) * session.player.effectiveProductionRate;
        session.player.addCoins(offlineCoins);
        this.lastOfflineCoinsApplied = offlineCoins;
      }
    }
    return session;
  }

  clearProgress(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LAST_SAVE_KEY);
    }
  }

  private serialize(session: GameSession): SavedSession {
    return {
      id: session.id,
      player: {
        id: session.player.id,
        coins: session.player.coins.value,
        productionRate: session.player.productionRate.value,
        planets: session.player.planets.map((p) => ({
          id: p.id,
          name: p.name,
          maxUpgrades: p.maxUpgrades,
          upgrades: p.upgrades.map((u) => ({
            id: u.id,
            name: u.name,
            cost: u.cost,
            effect: { coinsPerSecond: u.effect.coinsPerSecond },
          })),
        })),
        artifacts: session.player.artifacts.map((a) => ({
          id: a.id,
          name: a.name,
          effect: a.effect,
          isActive: a.isActive,
        })),
        prestigeLevel: session.player.prestigeLevel,
        totalCoinsEver: session.player.totalCoinsEver,
      },
      activeEvents: session.activeEvents.map((e) => ({
        id: e.id,
        name: e.name,
        effect: { multiplier: e.effect.multiplier, durationMs: e.effect.durationMs },
      })),
    };
  }

  private deserialize(data: SavedSession): GameSession {
    let planets: Planet[];
    if (data.player.planets && data.player.planets.length > 0) {
      planets = data.player.planets.map((p) => {
        const planet = new Planet(
          p.id,
          p.name,
          p.maxUpgrades,
          p.upgrades.map(
            (u) => new Upgrade(u.id, u.name, u.cost, new UpgradeEffect(u.effect.coinsPerSecond))
          )
        );
        return planet;
      });
    } else {
      // Migration: old save had flat upgrades → put them on one planet
      const upgrades = (data.player.upgrades ?? []).map(
        (u) => new Upgrade(u.id, u.name, u.cost, new UpgradeEffect(u.effect.coinsPerSecond))
      );
      const first = new Planet('planet-1', getPlanetName(0), 6, upgrades);
      planets = [first];
    }
    const artifacts = data.player.artifacts.map(
      (a) => new Artifact(a.id, a.name, a.effect, a.isActive)
    );
    const player = new Player(
      data.player.id,
      new Coins(data.player.coins),
      new ProductionRate(data.player.productionRate),
      planets,
      artifacts,
      data.player.prestigeLevel,
      data.player.totalCoinsEver
    );
    const activeEvents = data.activeEvents.map(
      (e) => new GameEvent(e.id, e.name, new EventEffect(e.effect.multiplier, e.effect.durationMs))
    );
    return new GameSession(data.id, player, activeEvents);
  }
}
