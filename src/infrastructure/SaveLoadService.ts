import { GameSession } from '../domain/aggregates/GameSession.js';
import type { ISaveLoadService } from '../domain/services/ISaveLoadService.js';
import { emit } from '../application/eventBus.js';
import {
  RESEARCH_STORAGE_KEY,
  RESEARCH_PROGRESS_STORAGE_KEY,
  PRESTIGE_RESEARCH_POINTS_KEY,
  getResearchProgressState,
  getPrestigeResearchPoints,
  setResearchProgressState,
} from '../application/research.js';
import { getSetBonusMultiplier } from '../application/moduleSetBonuses.js';

export type SessionDeserializer = (data: SavedSession) => GameSession;
export type GetResearchProductionMultiplier = () => number;
export type GetUnlockedResearch = () => string[];

export const SAVE_VERSION = 1;

export const SESSION_STORAGE_KEY = 'stellar-miner-session';
export const LAST_SAVE_KEY = 'stellar-miner-last-save';
const PROGRESSION_KEY = 'stellar-miner-progression';
const STATS_STORAGE_KEY = 'stellar-miner-stats';
const STATS_HISTORY_STORAGE_KEY = 'stellar-miner-stats-history';
const MIN_OFFLINE_MS = 60_000; // 1 min before offline progress counts
const FULL_CAP_OFFLINE_MS = 12 * 60 * 60 * 1000; // full rate up to 12h
// Soft cap: no hard stop. Decay after 12h → 80% at 14h, 50% at 24h, 25% at 48h, then 25% floor.
const DECAY_12_14H_MS = 2 * 60 * 60 * 1000;
const DECAY_12_14H_MULT = 0.8;
const DECAY_14_24H_MS = 10 * 60 * 60 * 1000;
const DECAY_14_24H_AVG_MULT = 0.65; // average of 80% and 50%
const DECAY_24_48H_MS = 24 * 60 * 60 * 1000;
const DECAY_24_48H_AVG_MULT = 0.375; // average of 50% and 25%
const DECAY_48H_PLUS_MULT = 0.25;

export type SavedUpgrade = { id: string; name: string; cost: number | string; effect: { coinsPerSecond: number | string } };
export type SavedInstallingUpgrade = { upgrade: SavedUpgrade; startAt?: number; endsAt: number; rateToAdd: number | string };
export type SavedUninstallingUpgrade = { upgradeId: string; startAt?: number; endsAt: number };
export type SavedPlanet = {
  id: string;
  name: string;
  maxUpgrades: number;
  upgrades: SavedUpgrade[];
  housing?: number;
  assignedCrew?: number;
  visualSeed?: number;
  installingUpgrades?: SavedInstallingUpgrade[];
  uninstallingUpgrades?: SavedUninstallingUpgrade[];
  discoveryFlavor?: string;
};
type SavedCrewByRole = {
  astronaut?: number;
  miner?: number;
  scientist?: number;
  pilot?: number;
  medic?: number;
  engineer?: number;
};

export type SavedRunStats = {
  runStartTime: number;
  runCoinsEarned: number;
  runQuestsClaimed: number;
  runEventsTriggered: number;
  runMaxComboMult: number;
};

export type SavedExpedition = {
  endsAt: number;
  composition: Record<string, number>;
  durationMs: number;
  difficulty?: string;
};

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
    prestigePlanetBonus?: number;
    prestigeResearchBonus?: number;
    totalCoinsEver: number | string;
    astronautCount?: number;
    crewByRole?: SavedCrewByRole;
    crewAssignedToEquipment?: number;
    veteranCount?: number;
  };
  activeEvents: Array<{ id: string; name: string; effect: { multiplier: number; durationMs: number } }>;
  runStats?: SavedRunStats;
  discoveredEventIds?: string[];
  codexUnlocks?: Array<{ id: string; at: number }>;
  narratorShown?: string[];
  expedition?: SavedExpedition;
  /** Unlocked research node ids (restored on import so click/production modifiers work). */
  unlockedResearch?: string[];
  /** Research progress (failures, research data). Restored on import. */
  researchProgress?: { researchData: number; nodeProgress: Record<string, { failures: number }> };
  /** Prestige research points (survive prestige). Restored on import. */
  prestigeResearchPoints?: number;
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

export interface SaveLoadServiceOptions {
  deserialize: SessionDeserializer;
  getResearchProductionMultiplier?: GetResearchProductionMultiplier;
  getUnlockedResearch?: GetUnlockedResearch;
}

/** Infrastructure: persist game session to localStorage. */
export class SaveLoadService implements ISaveLoadService {
  private lastOfflineCoinsApplied = 0;
  private lastOfflineHoursApplied = 0;
  private lastOfflineWasCapped = false;
  private readonly deserialize: SessionDeserializer;
  private readonly getResearchProductionMultiplier: GetResearchProductionMultiplier;
  private readonly getUnlockedResearch: GetUnlockedResearch;

  constructor(options: SaveLoadServiceOptions) {
    this.deserialize = options.deserialize;
    this.getResearchProductionMultiplier = options.getResearchProductionMultiplier ?? (() => 1);
    this.getUnlockedResearch = options.getUnlockedResearch ?? (() => []);
  }

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
    options?: { discoveredEventIds?: string[]; codexUnlocks?: Array<{ id: string; at: number }>; narratorShown?: string[]; expedition?: SavedExpedition | null }
  ): Promise<void> {
    if (typeof performance !== 'undefined' && performance.mark) performance.mark('save-start');
    const payload = this.serialize(session, runStats, options);
    if (typeof localStorage === 'undefined') return;
    const now = Date.now();
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      emit('save_failed', { error: err });
      try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
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

  async load(): Promise<{ session: GameSession; runStats?: SavedRunStats; discoveredEventIds?: string[]; codexUnlocks?: Array<{ id: string; at: number }>; narratorShown?: string[]; expedition?: SavedExpedition } | null> {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
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
    const getResearchMult = this.getResearchProductionMultiplier;
    const runStats = data.runStats && typeof data.runStats === 'object' ? (data.runStats as SavedRunStats) : undefined;
    const discoveredEventIds = Array.isArray(data.discoveredEventIds)
      ? (data.discoveredEventIds as string[]).filter((id) => typeof id === 'string')
      : undefined;
    const codexUnlocks = Array.isArray(data.codexUnlocks)
      ? (data.codexUnlocks as unknown[])
          .map((item) => {
            if (typeof item === 'object' && item !== null && 'id' in item && 'at' in item)
              return { id: String((item as { id: unknown }).id), at: Number((item as { at: unknown }).at) };
            if (typeof item === 'string') return { id: item, at: 0 };
            return null;
          })
          .filter((r): r is { id: string; at: number } => r !== null)
      : undefined;
    const narratorShown = Array.isArray(data.narratorShown)
      ? (data.narratorShown as string[]).filter((id) => typeof id === 'string')
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
        const researchMult = getResearchMult();
        let effectiveSeconds = 0;
        const elapsedSec = elapsed / 1000;
        const cap12hSec = FULL_CAP_OFFLINE_MS / 1000;
        const decay12_14Sec = DECAY_12_14H_MS / 1000;
        const decay14_24Sec = DECAY_14_24H_MS / 1000;
        const decay24_48Sec = DECAY_24_48H_MS / 1000;
        if (elapsedSec <= cap12hSec) {
          effectiveSeconds = elapsedSec;
        } else if (elapsedSec <= cap12hSec + decay12_14Sec) {
          effectiveSeconds = cap12hSec + (elapsedSec - cap12hSec) * DECAY_12_14H_MULT;
        } else if (elapsedSec <= cap12hSec + decay12_14Sec + decay14_24Sec) {
          const in14_24 = elapsedSec - cap12hSec - decay12_14Sec;
          effectiveSeconds =
            cap12hSec +
            decay12_14Sec * DECAY_12_14H_MULT +
            in14_24 * DECAY_14_24H_AVG_MULT;
        } else if (elapsedSec <= cap12hSec + decay12_14Sec + decay14_24Sec + decay24_48Sec) {
          const in24_48 = elapsedSec - cap12hSec - decay12_14Sec - decay14_24Sec;
          effectiveSeconds =
            cap12hSec +
            decay12_14Sec * DECAY_12_14H_MULT +
            decay14_24Sec * DECAY_14_24H_AVG_MULT +
            in24_48 * DECAY_24_48H_AVG_MULT;
        } else {
          const extra48 = elapsedSec - cap12hSec - decay12_14Sec - decay14_24Sec - decay24_48Sec;
          effectiveSeconds =
            cap12hSec +
            decay12_14Sec * DECAY_12_14H_MULT +
            decay14_24Sec * DECAY_14_24H_AVG_MULT +
            decay24_48Sec * DECAY_24_48H_AVG_MULT +
            extra48 * DECAY_48H_PLUS_MULT;
        }
        const setBonusMult = getSetBonusMultiplier(session.player);
        const offlineCoins = session.player.effectiveProductionRate
          .mul(effectiveSeconds)
          .mul(researchMult)
          .mul(setBonusMult);
        session.player.addCoins(offlineCoins);
        const n = offlineCoins.toNumber();
        this.lastOfflineCoinsApplied = Number.isFinite(n) ? n : Number.MAX_VALUE;
        this.lastOfflineHoursApplied = Math.round((elapsed / (60 * 60 * 1000)) * 10) / 10;
        this.lastOfflineWasCapped = elapsed > FULL_CAP_OFFLINE_MS;
      }
    }
    return { session, runStats, discoveredEventIds, codexUnlocks, narratorShown, expedition };
  }

  clearProgress(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(LAST_SAVE_KEY);
      localStorage.removeItem(PROGRESSION_KEY);
      localStorage.removeItem(STATS_STORAGE_KEY);
      localStorage.removeItem(STATS_HISTORY_STORAGE_KEY);
      localStorage.removeItem(RESEARCH_STORAGE_KEY);
    }
  }

  /** Export current session as JSON string (for copy/download). Optionally include runStats and extras (e.g. codexUnlocks). */
  exportSession(
    session: GameSession,
    options?: { runStats?: SavedRunStats; discoveredEventIds?: string[]; codexUnlocks?: Array<{ id: string; at: number }>; narratorShown?: string[]; expedition?: SavedExpedition | null }
  ): string {
    return JSON.stringify(this.serialize(session, options?.runStats, options));
  }

  /** Import session from JSON string. Returns null if invalid. Restores unlocked research to localStorage when present. */
  importSession(json: string): GameSession | null {
    try {
      const data = JSON.parse(json) as unknown;
      if (!isSavedSession(data)) return null;
      const session = this.deserialize(data);
      if (typeof localStorage !== 'undefined' && Array.isArray(data.unlockedResearch)) {
        const ids = data.unlockedResearch.filter((id: unknown) => typeof id === 'string') as string[];
        if (ids.length > 0) localStorage.setItem(RESEARCH_STORAGE_KEY, JSON.stringify(ids));
      }
      if (typeof localStorage !== 'undefined' && data.researchProgress) {
        const rp = data.researchProgress as { researchData?: number; nodeProgress?: Record<string, { failures: number }> };
        if (typeof rp.researchData === 'number' && rp.nodeProgress && typeof rp.nodeProgress === 'object') {
          setResearchProgressState({ researchData: rp.researchData, nodeProgress: rp.nodeProgress });
        }
      }
      if (typeof localStorage !== 'undefined' && typeof data.prestigeResearchPoints === 'number' && data.prestigeResearchPoints >= 0) {
        localStorage.setItem(PRESTIGE_RESEARCH_POINTS_KEY, String(data.prestigeResearchPoints));
      }
      return session;
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
    options?: { discoveredEventIds?: string[]; codexUnlocks?: Array<{ id: string; at: number }>; narratorShown?: string[]; expedition?: SavedExpedition | null }
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
          installingUpgrades:
            p.installingUpgrades?.length > 0
              ? p.installingUpgrades.map((i) => ({
                  upgrade: {
                    id: i.upgrade.id,
                    name: i.upgrade.name,
                    cost: i.upgrade.cost.toString(),
                    effect: { coinsPerSecond: i.upgrade.effect.coinsPerSecond.toString() },
                  },
                  startAt: i.startAt,
                  endsAt: i.endsAt,
                  rateToAdd: i.rateToAdd.toString(),
                }))
              : undefined,
          uninstallingUpgrades:
            p.uninstallingUpgrades?.length > 0
              ? p.uninstallingUpgrades.map((u) => ({
                  upgradeId: u.upgradeId,
                  startAt: u.startAt,
                  endsAt: u.endsAt,
                }))
              : undefined,
          discoveryFlavor: p.discoveryFlavor,
        })),
        artifacts: session.player.artifacts.map((a) => ({
          id: a.id,
          name: a.name,
          effect: a.effect,
          isActive: a.isActive,
        })),
        prestigeLevel: session.player.prestigeLevel,
        prestigePlanetBonus: session.player.prestigePlanetBonus,
        prestigeResearchBonus: session.player.prestigeResearchBonus,
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
    if (options?.codexUnlocks && options.codexUnlocks.length > 0) {
      payload.codexUnlocks = options.codexUnlocks;
    }
    if (options?.narratorShown && options.narratorShown.length > 0) {
      payload.narratorShown = options.narratorShown;
    }
    if (options?.expedition) payload.expedition = options.expedition;
    const unlockedResearch = this.getUnlockedResearch();
    if (unlockedResearch.length > 0) payload.unlockedResearch = unlockedResearch;
    const researchProgress = getResearchProgressState();
    if (researchProgress.researchData > 0 || Object.keys(researchProgress.nodeProgress).length > 0) {
      payload.researchProgress = researchProgress;
    }
    const prestigeResearchPoints = getPrestigeResearchPoints();
    if (prestigeResearchPoints > 0) payload.prestigeResearchPoints = prestigeResearchPoints;
    return payload;
  }

}
