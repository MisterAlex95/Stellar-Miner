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
import { generatePlanetName } from '../domain/constants.js';
import { getUpgradeUsesSlot } from '../application/catalogs.js';
import { getBaseProductionRateFromPlanets } from '../application/planetAffinity.js';
import { toDecimal } from '../domain/bigNumber.js';
import { emit } from '../application/eventBus.js';
import { RESEARCH_STORAGE_KEY, getResearchProductionMultiplier, getEffectiveRequiredAstronauts } from '../application/research.js';

export const SAVE_VERSION = 1;

const STORAGE_KEY = 'stellar-miner-session';
export const LAST_SAVE_KEY = 'stellar-miner-last-save';
const PROGRESSION_KEY = 'stellar-miner-progression';
const STATS_STORAGE_KEY = 'stellar-miner-stats';
const STATS_HISTORY_STORAGE_KEY = 'stellar-miner-stats-history';
const MIN_OFFLINE_MS = 60_000; // 1 min before offline progress counts
const FULL_CAP_OFFLINE_MS = 12 * 60 * 60 * 1000; // full rate up to 12h
// Soft decay after 12h: 12–14h at 80% rate, 14–24h linear 80%→50%, 24h+ at 50%
const DECAY_12_14H_MS = 2 * 60 * 60 * 1000;
const DECAY_12_14H_MULT = 0.8;
const DECAY_14_24H_MS = 10 * 60 * 60 * 1000;
const DECAY_24H_PLUS_MULT = 0.5;

type SavedUpgrade = { id: string; name: string; cost: number | string; effect: { coinsPerSecond: number | string } };
type SavedPlanet = { id: string; name: string; maxUpgrades: number; upgrades: SavedUpgrade[]; housing?: number; assignedCrew?: number; visualSeed?: number };
type SavedCrewByRole = { miner?: number; scientist?: number; medic?: number; pilot?: number };

export type SavedRunStats = {
  runStartTime: number;
  runCoinsEarned: number;
  runQuestsClaimed: number;
  runEventsTriggered: number;
  runMaxComboMult: number;
};

export type SavedExpedition = { endsAt: number; composition: Record<string, number>; durationMs: number };

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
    crewByRole?: SavedCrewByRole;
    crewAssignedToEquipment?: number;
    veteranCount?: number;
  };
  activeEvents: Array<{ id: string; name: string; effect: { multiplier: number; durationMs: number } }>;
  runStats?: SavedRunStats;
  discoveredEventIds?: string[];
  expedition?: SavedExpedition;
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
  private lastOfflineHoursApplied = 0;
  private lastOfflineWasCapped = false;

  getLastOfflineCoins(): number {
    const n = this.lastOfflineCoinsApplied;
    this.lastOfflineCoinsApplied = 0;
    return n;
  }

  getLastOfflineHours(): number {
    const h = this.lastOfflineHoursApplied;
    this.lastOfflineHoursApplied = 0;
    return h;
  }

  getLastOfflineWasCapped(): boolean {
    const v = this.lastOfflineWasCapped;
    this.lastOfflineWasCapped = false;
    return v;
  }

  /** Timestamp (ms) of last successful save, or null if never saved. */
  getLastSaveTimestamp(): number | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(LAST_SAVE_KEY);
    if (!raw) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  }

  async save(
    session: GameSession,
    runStats?: SavedRunStats,
    options?: { discoveredEventIds?: string[]; expedition?: SavedExpedition | null }
  ): Promise<void> {
    if (typeof performance !== 'undefined' && performance.mark) performance.mark('save-start');
    const payload = this.serialize(session, runStats, options);
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

  async load(): Promise<{ session: GameSession; runStats?: SavedRunStats; discoveredEventIds?: string[]; expedition?: SavedExpedition } | null> {
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
    const runStats = data.runStats && typeof data.runStats === 'object' ? (data.runStats as SavedRunStats) : undefined;
    const discoveredEventIds = Array.isArray(data.discoveredEventIds)
      ? (data.discoveredEventIds as string[]).filter((id) => typeof id === 'string')
      : undefined;
    const expedition =
      data.expedition &&
      typeof data.expedition === 'object' &&
      typeof data.expedition.endsAt === 'number' &&
      typeof data.expedition.durationMs === 'number' &&
      data.expedition.composition &&
      typeof data.expedition.composition === 'object'
        ? (data.expedition as SavedExpedition)
        : undefined;
    const lastSaveRaw = localStorage.getItem(LAST_SAVE_KEY);
    if (lastSaveRaw) {
      const lastSave = parseInt(lastSaveRaw, 10);
      const elapsed = Date.now() - lastSave;
      if (elapsed >= MIN_OFFLINE_MS && session.player.productionRate.value.gt(0)) {
        const researchMult = getResearchProductionMultiplier();
        let effectiveSeconds = 0;
        const elapsedSec = elapsed / 1000;
        const cap12hSec = FULL_CAP_OFFLINE_MS / 1000;
        const decay12_14Sec = DECAY_12_14H_MS / 1000;
        const decay14_24Sec = DECAY_14_24H_MS / 1000;
        if (elapsedSec <= cap12hSec) {
          effectiveSeconds = elapsedSec;
        } else if (elapsedSec <= cap12hSec + decay12_14Sec) {
          effectiveSeconds = cap12hSec + (elapsedSec - cap12hSec) * DECAY_12_14H_MULT;
        } else if (elapsedSec <= cap12hSec + decay12_14Sec + decay14_24Sec) {
          const in14_24 = elapsedSec - cap12hSec - decay12_14Sec;
          const t = in14_24 / decay14_24Sec;
          const avgMult = 0.8 - (0.3 * t);
          effectiveSeconds = cap12hSec + decay12_14Sec * DECAY_12_14H_MULT + in14_24 * avgMult;
        } else {
          const extra = elapsedSec - cap12hSec - decay12_14Sec - decay14_24Sec;
          effectiveSeconds =
            cap12hSec +
            decay12_14Sec * DECAY_12_14H_MULT +
            decay14_24Sec * 0.65 +
            extra * DECAY_24H_PLUS_MULT;
        }
        const offlineCoins = session.player.effectiveProductionRate
          .mul(effectiveSeconds)
          .mul(researchMult);
        session.player.addCoins(offlineCoins);
        const n = offlineCoins.toNumber();
        this.lastOfflineCoinsApplied = Number.isFinite(n) ? n : Number.MAX_VALUE;
        this.lastOfflineHoursApplied = Math.round((elapsed / (60 * 60 * 1000)) * 10) / 10;
        this.lastOfflineWasCapped = elapsed > FULL_CAP_OFFLINE_MS;
      }
    }
    return { session, runStats, discoveredEventIds, expedition };
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

  private serialize(
    session: GameSession,
    runStats?: SavedRunStats,
    options?: { discoveredEventIds?: string[]; expedition?: SavedExpedition | null }
  ): SavedSession {
    const payload: SavedSession = {
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
            cost: u.cost.toString(),
            effect: { coinsPerSecond: u.effect.coinsPerSecond.toString() },
          })),
          housing: p.housingCount,
          assignedCrew: p.assignedCrew,
          visualSeed: p.visualSeed,
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
        crewByRole: session.player.crewByRole,
        crewAssignedToEquipment: session.player.crewAssignedToEquipment,
        veteranCount: session.player.veteranCount,
      },
      activeEvents: session.activeEvents.map((e) => ({
        id: e.id,
        name: e.name,
        effect: { multiplier: e.effect.multiplier, durationMs: e.effect.durationMs },
      })),
    };
    if (runStats) payload.runStats = runStats;
    if (options?.discoveredEventIds && options.discoveredEventIds.length > 0) {
      payload.discoveredEventIds = options.discoveredEventIds;
    }
    if (options?.expedition) payload.expedition = options.expedition;
    return payload;
  }

  private deserialize(data: SavedSession): GameSession {
    const version = data.version ?? 0;
    if (version > SAVE_VERSION) throw new Error('Unsupported save version');
    let planets: Planet[];
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
    if (data.player.planets && data.player.planets.length > 0) {
      planets = data.player.planets.map((p) => {
        const visualSeed = p.visualSeed ?? Math.floor(Math.random() * 0xffff_ffff);
        const planet = new Planet(
          p.id,
          p.name,
          p.maxUpgrades,
          p.upgrades.map(mapUpgrade),
          p.housing ?? 0,
          p.assignedCrew ?? 0,
          visualSeed
        );
        return planet;
      });
    } else {
      // Migration: old save had flat upgrades → put them on one planet
      const upgrades = (data.player.upgrades ?? []).map(mapUpgrade);
      const firstVisualSeed = Math.floor(Math.random() * 0xffff_ffff);
      const first = new Planet('planet-1', generatePlanetName('planet-1'), 6, upgrades, 0, 0, firstVisualSeed);
      planets = [first];
    }
    const artifacts = data.player.artifacts.map(
      (a) => new Artifact(a.id, a.name, a.effect, a.isActive)
    );
    const productionRate = getBaseProductionRateFromPlanets(planets);
    const crewByRole = data.player.crewByRole;
    const veteranCount = data.player.veteranCount ?? 0;
    const crewOrCount =
      crewByRole && typeof crewByRole === 'object'
        ? {
            miner: crewByRole.miner ?? 0,
            scientist: crewByRole.scientist ?? 0,
            pilot: crewByRole.pilot ?? 0,
          }
        : (data.player.astronautCount ?? 0);
    const crewAssignedToEquipment =
      data.player.crewAssignedToEquipment ??
      planets.reduce((sum, p) => sum + p.upgrades.reduce((s, u) => s + getEffectiveRequiredAstronauts(u.id), 0), 0);
    const player = new Player(
      data.player.id,
      Coins.from(data.player.coins),
      ProductionRate.from(productionRate),
      planets,
      artifacts,
      data.player.prestigeLevel,
      new Decimal(data.player.totalCoinsEver),
      crewOrCount,
      veteranCount,
      crewAssignedToEquipment
    );
    const activeEvents = data.activeEvents.map(
      (e) => new GameEvent(e.id, e.name, new EventEffect(e.effect.multiplier, e.effect.durationMs))
    );
    return new GameSession(data.id, player, activeEvents);
  }
}
