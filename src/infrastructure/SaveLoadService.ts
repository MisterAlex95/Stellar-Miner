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
import type { ISaveLoadService } from '../domain/services/ISaveLoadService.js';
import { getPlanetName } from '../domain/constants.js';
import { emit } from '../application/eventBus.js';
import { RESEARCH_STORAGE_KEY, getResearchProductionMultiplier } from '../application/research.js';

export const SAVE_VERSION = 1;

const STORAGE_KEY = 'stellar-miner-session';
const LAST_SAVE_KEY = 'stellar-miner-last-save';
const PROGRESSION_KEY = 'stellar-miner-progression';
const STATS_STORAGE_KEY = 'stellar-miner-stats';
const STATS_HISTORY_STORAGE_KEY = 'stellar-miner-stats-history';
const MIN_OFFLINE_MS = 60_000; // 1 min before offline progress counts
const MAX_OFFLINE_MS = 12 * 60 * 60 * 1000; // cap 12h

type SavedUpgrade = { id: string; name: string; cost: number; effect: { coinsPerSecond: number } };
type SavedPlanet = { id: string; name: string; maxUpgrades: number; upgrades: SavedUpgrade[]; housing?: number };

export type SavedSession = {
  version?: number;
  id: string;
  player: {
    id: string;
    coins: number | string;
    productionRate: number | string;
    planets?: SavedPlanet[];
    upgrades?: SavedUpgrade[];
    artifacts: Array<{ id: string; name: string; effect: unknown; isActive: boolean }>;
    prestigeLevel: number;
    totalCoinsEver: number | string;
    astronautCount?: number;
  };
  activeEvents: Array<{ id: string; name: string; effect: { multiplier: number; durationMs: number } }>;
};

function isSavedSession(data: unknown): data is SavedSession {
  if (!data || typeof data !== 'object') return false;
  const o = data as Record<string, unknown>;
  if (typeof o.id !== 'string') return false;
  if (!o.player || typeof o.player !== 'object') return false;
  const p = o.player as Record<string, unknown>;
  if (typeof p.id !== 'string') return false;
  if (typeof p.coins !== 'number' && typeof p.coins !== 'string') return false;
  if (typeof p.productionRate !== 'number' && typeof p.productionRate !== 'string') return false;
  if (!Array.isArray(p.artifacts) || typeof p.prestigeLevel !== 'number') return false;
  if (typeof p.totalCoinsEver !== 'number' && typeof p.totalCoinsEver !== 'string') return false;
  if (!Array.isArray(o.activeEvents)) return false;
  return true;
}

/** Infrastructure: persist game session to localStorage. */
export class SaveLoadService implements ISaveLoadService {
  private lastOfflineCoinsApplied = 0;
  private lastOfflineWasCapped = false;

  getLastOfflineCoins(): number {
    const n = this.lastOfflineCoinsApplied;
    this.lastOfflineCoinsApplied = 0;
    return n;
  }

  getLastOfflineWasCapped(): boolean {
    const v = this.lastOfflineWasCapped;
    this.lastOfflineWasCapped = false;
    return v;
  }

  async save(session: GameSession): Promise<void> {
    if (typeof performance !== 'undefined' && performance.mark) performance.mark('save-start');
    const payload = this.serialize(session);
    if (typeof localStorage === 'undefined') return;
    const now = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      emit('save_failed', { error: err });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch {
        emit('save_failed', { error: 'retry failed' });
      }
      return;
    }
    const lastSaveRaw = localStorage.getItem(LAST_SAVE_KEY);
    const lastSave = lastSaveRaw ? parseInt(lastSaveRaw, 10) : 0;
    const elapsed = lastSave > 0 ? now - lastSave : 0;
    const statsRaw = localStorage.getItem(STATS_STORAGE_KEY);
    const stats = statsRaw ? (JSON.parse(statsRaw) as { firstPlayedAt?: number; totalPlayTimeMs?: number }) : {};
    const totalPlayTimeMs = (stats.totalPlayTimeMs ?? 0) + elapsed;
    const firstPlayedAt = stats.firstPlayedAt ?? now;
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify({ firstPlayedAt, totalPlayTimeMs }));
    localStorage.setItem(LAST_SAVE_KEY, String(now));
    if (typeof performance !== 'undefined' && performance.mark) performance.mark('save-end');
    emit('save_success', undefined);
  }

  async load(): Promise<GameSession | null> {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }
    if (!isSavedSession(data)) return null;
    let session: GameSession;
    try {
      session = this.deserialize(data);
    } catch {
      return null;
    }
    const lastSaveRaw = localStorage.getItem(LAST_SAVE_KEY);
    if (lastSaveRaw) {
      const lastSave = parseInt(lastSaveRaw, 10);
      const elapsed = Date.now() - lastSave;
      if (elapsed >= MIN_OFFLINE_MS && session.player.productionRate.value.gt(0)) {
        const cappedMs = Math.min(elapsed, MAX_OFFLINE_MS);
        const researchMult = getResearchProductionMultiplier();
        const offlineCoins = session.player.effectiveProductionRate.mul(cappedMs / 1000).mul(researchMult);
        session.player.addCoins(offlineCoins);
        const n = offlineCoins.toNumber();
        this.lastOfflineCoinsApplied = Number.isFinite(n) ? n : Number.MAX_VALUE;
        this.lastOfflineWasCapped = elapsed > MAX_OFFLINE_MS;
      }
    }
    return session;
  }

  clearProgress(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LAST_SAVE_KEY);
      localStorage.removeItem(PROGRESSION_KEY);
      localStorage.removeItem(STATS_STORAGE_KEY);
      localStorage.removeItem(STATS_HISTORY_STORAGE_KEY);
      localStorage.removeItem(RESEARCH_STORAGE_KEY);
    }
  }

  /** Export current session as JSON string (for copy/download). */
  exportSession(session: GameSession): string {
    return JSON.stringify(this.serialize(session));
  }

  /** Import session from JSON string. Returns null if invalid. */
  importSession(json: string): GameSession | null {
    try {
      const data = JSON.parse(json) as unknown;
      if (!isSavedSession(data)) return null;
      return this.deserialize(data);
    } catch {
      return null;
    }
  }

  /** Validate raw JSON string without deserializing. */
  validateSavePayload(json: string): boolean {
    try {
      const data = JSON.parse(json) as unknown;
      return isSavedSession(data);
    } catch {
      return false;
    }
  }

  private serialize(session: GameSession): SavedSession {
    return {
      version: SAVE_VERSION,
      id: session.id,
      player: {
        id: session.player.id,
        coins: session.player.coins.value.toString(),
        productionRate: session.player.productionRate.value.toString(),
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
          housing: p.housingCount,
        })),
        artifacts: session.player.artifacts.map((a) => ({
          id: a.id,
          name: a.name,
          effect: a.effect,
          isActive: a.isActive,
        })),
        prestigeLevel: session.player.prestigeLevel,
        totalCoinsEver: session.player.totalCoinsEver.toString(),
        astronautCount: session.player.astronautCount,
      },
      activeEvents: session.activeEvents.map((e) => ({
        id: e.id,
        name: e.name,
        effect: { multiplier: e.effect.multiplier, durationMs: e.effect.durationMs },
      })),
    };
  }

  private deserialize(data: SavedSession): GameSession {
    const version = data.version ?? 0;
    if (version > SAVE_VERSION) throw new Error('Unsupported save version');
    let planets: Planet[];
    if (data.player.planets && data.player.planets.length > 0) {
      planets = data.player.planets.map((p) => {
        const planet = new Planet(
          p.id,
          p.name,
          p.maxUpgrades,
          p.upgrades.map(
            (u) => new Upgrade(u.id, u.name, u.cost, new UpgradeEffect(u.effect.coinsPerSecond))
          ),
          p.housing ?? 0
        );
        return planet;
      });
    } else {
      // Migration: old save had flat upgrades → put them on one planet
      const upgrades = (data.player.upgrades ?? []).map(
        (u) => new Upgrade(u.id, u.name, u.cost, new UpgradeEffect(u.effect.coinsPerSecond))
      );
      const first = new Planet('planet-1', getPlanetName(0), 6, upgrades, 0);
      planets = [first];
    }
    const artifacts = data.player.artifacts.map(
      (a) => new Artifact(a.id, a.name, a.effect, a.isActive)
    );
    const player = new Player(
      data.player.id,
      Coins.from(data.player.coins),
      ProductionRate.from(data.player.productionRate),
      planets,
      artifacts,
      data.player.prestigeLevel,
      new Decimal(data.player.totalCoinsEver),
      data.player.astronautCount ?? 0
    );
    const activeEvents = data.activeEvents.map(
      (e) => new GameEvent(e.id, e.name, new EventEffect(e.effect.multiplier, e.effect.durationMs))
    );
    return new GameSession(data.id, player, activeEvents);
  }
}
