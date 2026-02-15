import Decimal from 'break_infinity.js';
import { Player } from '../domain/entities/Player.js';
import { GameSession } from '../domain/aggregates/GameSession.js';
import { GameEvent } from '../domain/entities/GameEvent.js';
import { SaveLoadService } from '../infrastructure/SaveLoadService.js';
import { UpgradeService } from '../domain/services/UpgradeService.js';
import { PlanetService } from '../domain/services/PlanetService.js';
import { loadSettings, saveSettings, type Settings } from '../settings.js';
import { startStarfield } from '../presentation/StarfieldCanvas.js';
import { createMineZoneCanvas } from '../presentation/MineZoneCanvas.js';
import { loadQuestState } from './questState.js';
import type { QuestState } from './questState.js';
import { emit } from './eventBus.js';
import { PRESTIGES_TODAY_KEY } from './catalogs.js';

export type ActiveEventInstance = { event: GameEvent; endsAt: number };

export type RunStats = {
  runStartTime: number;
  runCoinsEarned: number;
  runQuestsClaimed: number;
  runEventsTriggered: number;
  runMaxComboMult: number;
};

let session: GameSession;
let activeEventInstances: ActiveEventInstance[] = [];
let nextEventAt = 0;
let gameStartTime = 0;
let settings: Settings = loadSettings();
let questState: QuestState = loadQuestState();
let lastCoinsForBump: Decimal = new Decimal(0);
let clickTimestamps: number[] = [];
let sessionClickCount = 0;
let sessionCoinsFromClicks = 0;
let runStats: RunStats = {
  runStartTime: 0,
  runCoinsEarned: 0,
  runQuestsClaimed: 0,
  runEventsTriggered: 0,
  runMaxComboMult: 0,
};

export const saveLoad = new SaveLoadService();
export const upgradeService = new UpgradeService();
export const planetService = new PlanetService();
export let starfieldApi: ReturnType<typeof startStarfield> | null = null;
export let mineZoneCanvasApi: ReturnType<typeof createMineZoneCanvas> | null = null;

export function getSession(): GameSession {
  return session;
}

export function setSession(s: GameSession): void {
  session = s;
}

export function getActiveEventInstances(): ActiveEventInstance[] {
  return activeEventInstances;
}

export function setActiveEventInstances(arr: ActiveEventInstance[]): void {
  activeEventInstances = arr;
}

export function pushActiveEventInstance(inst: ActiveEventInstance): void {
  activeEventInstances.push(inst);
}

export function getNextEventAt(): number {
  return nextEventAt;
}

export function setNextEventAt(n: number): void {
  nextEventAt = n;
}

export function getGameStartTime(): number {
  return gameStartTime;
}

export function setGameStartTime(n: number): void {
  gameStartTime = n;
}

export function getSettings(): Settings {
  return settings;
}

export function setSettings(s: Settings): void {
  settings = s;
  saveSettings(settings);
}

export function getQuestState(): QuestState {
  return questState;
}

export function setQuestState(q: QuestState): void {
  questState = q;
}

export function getLastCoinsForBump(): Decimal {
  return lastCoinsForBump;
}

export function setLastCoinsForBump(n: number | Decimal): void {
  lastCoinsForBump = n instanceof Decimal ? n : new Decimal(n);
}

export function getClickTimestamps(): number[] {
  return clickTimestamps;
}

export function setClickTimestamps(arr: number[]): void {
  clickTimestamps = arr;
}

export function getSessionClickCount(): number {
  return sessionClickCount;
}

export function setSessionClickCount(n: number): void {
  sessionClickCount = n;
}

export function getSessionCoinsFromClicks(): number {
  return sessionCoinsFromClicks;
}

export function setSessionCoinsFromClicks(n: number): void {
  sessionCoinsFromClicks = n;
}

export function getRunStats(): RunStats {
  return runStats;
}

export function setRunStatsFromPayload(data: Partial<RunStats> | null): void {
  if (!data) {
    runStats = {
      runStartTime: Date.now(),
      runCoinsEarned: 0,
      runQuestsClaimed: 0,
      runEventsTriggered: 0,
      runMaxComboMult: 0,
    };
    return;
  }
  runStats = {
    runStartTime: data.runStartTime ?? Date.now(),
    runCoinsEarned: data.runCoinsEarned ?? 0,
    runQuestsClaimed: data.runQuestsClaimed ?? 0,
    runEventsTriggered: data.runEventsTriggered ?? 0,
    runMaxComboMult: data.runMaxComboMult ?? 0,
  };
}

export function resetRunStatsOnPrestige(): void {
  runStats = {
    runStartTime: Date.now(),
    runCoinsEarned: 0,
    runQuestsClaimed: 0,
    runEventsTriggered: 0,
    runMaxComboMult: 0,
  };
}

export function addRunCoins(amount: number): void {
  runStats.runCoinsEarned += amount;
}

export function incrementRunQuestsClaimed(): void {
  runStats.runQuestsClaimed += 1;
}

export function incrementRunEventsTriggered(): void {
  runStats.runEventsTriggered += 1;
}

export function updateRunMaxComboMult(mult: number): void {
  if (mult > runStats.runMaxComboMult) runStats.runMaxComboMult = mult;
}

export function getPrestigesToday(): number {
  if (typeof localStorage === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(PRESTIGES_TODAY_KEY);
    if (!raw) return 0;
    const data = JSON.parse(raw) as { date?: string; count?: number };
    const today = new Date().toISOString().slice(0, 10);
    return data.date === today && typeof data.count === 'number' ? data.count : 0;
  } catch {
    return 0;
  }
}

export function incrementPrestigesToday(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem(PRESTIGES_TODAY_KEY);
    const data = raw ? (JSON.parse(raw) as { date?: string; count?: number }) : {};
    const count = data.date === today && typeof data.count === 'number' ? data.count + 1 : 1;
    localStorage.setItem(PRESTIGES_TODAY_KEY, JSON.stringify({ date: today, count }));
  } catch {}
}

export function setStarfieldApi(api: ReturnType<typeof startStarfield> | null): void {
  starfieldApi = api;
}

export function setMineZoneCanvasApi(api: ReturnType<typeof createMineZoneCanvas> | null): void {
  mineZoneCanvasApi = api;
}

export function getEventContext(): { activeEventIds: string[] } {
  const now = Date.now();
  return {
    activeEventIds: activeEventInstances.filter((a) => a.endsAt > now).map((a) => a.event.id),
  };
}

export function getEventMultiplier(): number {
  const now = Date.now();
  activeEventInstances = activeEventInstances.filter((a) => a.endsAt > now);
  let mult = 1;
  for (const a of activeEventInstances) mult *= a.event.effect.multiplier;
  return mult;
}

export async function getOrCreateSession(): Promise<GameSession> {
  const result = await saveLoad.load();
  emit('session_loaded', { fromStorage: !!result });
  if (result) {
    setSession(result.session);
    setRunStatsFromPayload(result.runStats ?? null);
    return result.session;
  }
  const player = Player.create('player-1');
  player.addCoins(0);
  setRunStatsFromPayload(null);
  return new GameSession('session-1', player);
}
