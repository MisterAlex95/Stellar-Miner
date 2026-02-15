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

export type ActiveEventInstance = { event: GameEvent; endsAt: number };

let session: GameSession;
let activeEventInstances: ActiveEventInstance[] = [];
let nextEventAt = 0;
let gameStartTime = 0;
let settings: Settings = loadSettings();
let questState: QuestState = loadQuestState();
let lastCoinsForBump = 0;
let clickTimestamps: number[] = [];
let sessionClickCount = 0;
let sessionCoinsFromClicks = 0;

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

export function getLastCoinsForBump(): number {
  return lastCoinsForBump;
}

export function setLastCoinsForBump(n: number): void {
  lastCoinsForBump = n;
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
  const loaded = await saveLoad.load();
  if (loaded) return loaded;
  const player = Player.create('player-1');
  player.addCoins(0);
  return new GameSession('session-1', player);
}
