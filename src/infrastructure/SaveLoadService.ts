import { GameSession } from '../domain/aggregates/GameSession.js';
import { Player } from '../domain/entities/Player.js';
import { Upgrade } from '../domain/entities/Upgrade.js';
import { GameEvent } from '../domain/entities/GameEvent.js';
import { Artifact } from '../domain/entities/Artifact.js';
import { Coins } from '../domain/value-objects/Coins.js';
import { ProductionRate } from '../domain/value-objects/ProductionRate.js';
import { UpgradeEffect } from '../domain/value-objects/UpgradeEffect.js';
import { EventEffect } from '../domain/value-objects/EventEffect.js';
import type { ISaveLoadService } from '../domain/services/ISaveLoadService.js';

const STORAGE_KEY = 'stellar-miner-session';

type SavedSession = {
  id: string;
  player: {
    id: string;
    coins: number;
    productionRate: number;
    upgrades: Array<{ id: string; name: string; cost: number; effect: { coinsPerSecond: number } }>;
    artifacts: Array<{ id: string; name: string; effect: unknown; isActive: boolean }>;
    prestigeLevel: number;
    totalCoinsEver: number;
  };
  activeEvents: Array<{ id: string; name: string; effect: { multiplier: number; durationMs: number } }>;
};

/** Infrastructure: persist game session to localStorage. */
export class SaveLoadService implements ISaveLoadService {
  async save(session: GameSession): Promise<void> {
    const payload = this.serialize(session);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }
  }

  async load(): Promise<GameSession | null> {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SavedSession;
    return this.deserialize(data);
  }

  private serialize(session: GameSession): SavedSession {
    return {
      id: session.id,
      player: {
        id: session.player.id,
        coins: session.player.coins.value,
        productionRate: session.player.productionRate.value,
        upgrades: session.player.upgrades.map((u) => ({
          id: u.id,
          name: u.name,
          cost: u.cost,
          effect: { coinsPerSecond: u.effect.coinsPerSecond },
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
    const upgrades = data.player.upgrades.map(
      (u) => new Upgrade(u.id, u.name, u.cost, new UpgradeEffect(u.effect.coinsPerSecond))
    );
    const artifacts = data.player.artifacts.map(
      (a) => new Artifact(a.id, a.name, a.effect, a.isActive)
    );
    const player = new Player(
      data.player.id,
      new Coins(data.player.coins),
      new ProductionRate(data.player.productionRate),
      upgrades,
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
