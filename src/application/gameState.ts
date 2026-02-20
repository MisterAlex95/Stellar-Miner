import Decimal from 'break_infinity.js';
import { Player } from '../domain/entities/Player.js';
import { GameSession } from '../domain/aggregates/GameSession.js';
import { GameEvent } from '../domain/entities/GameEvent.js';
import type { ChoiceEvent } from '../domain/entities/ChoiceEvent.js';
import { SaveLoadService } from '../infrastructure/SaveLoadService.js';
import { UpgradeService } from '../domain/services/UpgradeService.js';
import { PlanetService } from '../domain/services/PlanetService.js';
import { loadSettings, saveSettings, type Settings } from '../settings.js';
import type { StarfieldApi, MineZoneCanvasApi } from './canvasApis.js';
import { loadQuestState } from './questState.js';
import { deserializeSession } from './sessionSerialization.js';
import { getResearchProductionMultiplier, getUnlockedResearch } from './research.js';
import type { QuestState } from './questState.js';
import { emit } from './eventBus.js';
import { PRESTIGES_TODAY_KEY } from './catalogs.js';
import { CREW_ROLES, type ExpeditionComposition } from '../domain/constants.js';
import { createObservableStore } from './observableStore.js';

/** Observable session store. Subscribe to react to session changes (load, prestige, reset). */
export const sessionStore = createObservableStore<GameSession | null>(null as GameSession | null);

/** Observable settings store. Subscribe to react to settings changes (theme, layout, etc.). */
export const settingsStore = createObservableStore<Settings>(loadSettings());

export type ActiveEventInstance = { event: GameEvent; endsAt: number };

/** Observable active events. Emits when events are pushed or set. */
export const activeEventsStore = createObservableStore<ActiveEventInstance[]>([]);

const initialQuestState = loadQuestState();

/** Observable quest state. Emits when quest changes (claim, new quest). */
export const questStateStore = createObservableStore<QuestState>(initialQuestState);

export type SavedExpedition = {
  endsAt: number;
  composition: ExpeditionComposition;
  durationMs: number;
  difficulty?: string;
};

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
let settings: Settings = settingsStore.get();
let questState: QuestState = initialQuestState;
let lastCoinsForBump: Decimal = new Decimal(0);
let lastCoinsBumpAtMs = 0;
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
/** Event IDs the player has ever seen (persisted with save). Only these appear in the events hint. */
let discoveredEventIds: string[] = [];

/** Module set bonus def ids the player has ever had active (persisted with save). Shown in Archive → Sets. */
let discoveredSetIds: string[] = [];

/** Codex entries unlocked with timestamp (persisted with save). */
export type CodexUnlockRecord = { id: string; at: number };
let codexUnlocks: CodexUnlockRecord[] = [];

/** Narrator trigger IDs already shown (persisted with save). One-off ship/mission toasts. */
let narratorShown: string[] = [];

/** When set, a choice event is waiting for player input; cleared when choice is applied or on load. */
let pendingChoiceEvent: ChoiceEvent | null = null;

let expeditionEndsAt: number | null = null;
let expeditionComposition: ExpeditionComposition | null = null;
let expeditionDurationMs = 0;
let expeditionDifficulty: string | null = null;

let _saveLoadInstance: SaveLoadService | null = null;
function getSaveLoadInstance(): SaveLoadService {
  if (!_saveLoadInstance) {
    _saveLoadInstance = new SaveLoadService({
      deserialize: deserializeSession,
      getResearchProductionMultiplier,
      getUnlockedResearch,
    });
  }
  return _saveLoadInstance;
}
/** Lazy-initialized to avoid circular dependency: SaveLoadService → research → strings → gameState → SaveLoadService */
export const saveLoad = new Proxy({} as SaveLoadService, {
  get(_, prop) {
    const inst = getSaveLoadInstance();
    const v = (inst as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof v === 'function') return (v as (...args: unknown[]) => unknown).bind(inst);
    return v;
  },
});

export const upgradeService = new UpgradeService();
export const planetService = new PlanetService();
export let starfieldApi: StarfieldApi | null = null;
export let mineZoneCanvasApi: MineZoneCanvasApi | null = null;

export function getSession(): GameSession {
  return session;
}

export function setSession(s: GameSession): void {
  session = s;
  sessionStore.set(s);
}

export function getActiveEventInstances(): ActiveEventInstance[] {
  return activeEventInstances;
}

export function setActiveEventInstances(arr: ActiveEventInstance[]): void {
  activeEventInstances = arr;
  activeEventsStore.set([...arr]);
}

export function pushActiveEventInstance(inst: ActiveEventInstance): void {
  activeEventInstances.push(inst);
  activeEventsStore.set([...activeEventInstances]);
}

export function getNextEventAt(): number {
  return nextEventAt;
}

export function setNextEventAt(n: number): void {
  nextEventAt = n;
}

export function getPendingChoiceEvent(): ChoiceEvent | null {
  return pendingChoiceEvent;
}

export function setPendingChoiceEvent(ce: ChoiceEvent | null): void {
  pendingChoiceEvent = ce;
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
  settingsStore.set(s);
}

export function getQuestState(): QuestState {
  return questState;
}

export function setQuestState(q: QuestState): void {
  questState = q;
  questStateStore.set(q);
}

export function getLastCoinsForBump(): Decimal {
  return lastCoinsForBump;
}

export function setLastCoinsForBump(n: number | Decimal): void {
  lastCoinsForBump = n instanceof Decimal ? n : new Decimal(n);
}

export function getLastCoinsBumpAtMs(): number {
  return lastCoinsBumpAtMs;
}

export function setLastCoinsBumpAtMs(ms: number): void {
  lastCoinsBumpAtMs = ms;
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

export function getDiscoveredEventIds(): string[] {
  return [...discoveredEventIds];
}

export function setDiscoveredEventIds(ids: string[]): void {
  discoveredEventIds = Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : [];
}

export function addDiscoveredEvent(eventId: string): void {
  if (typeof eventId !== 'string' || discoveredEventIds.includes(eventId)) return;
  discoveredEventIds = [...discoveredEventIds, eventId];
}

export function getDiscoveredSetIds(): string[] {
  return [...discoveredSetIds];
}

export function setDiscoveredSetIds(ids: string[]): void {
  discoveredSetIds = Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : [];
}

export function addDiscoveredSetId(setId: string): void {
  if (typeof setId !== 'string' || discoveredSetIds.includes(setId)) return;
  discoveredSetIds = [...discoveredSetIds, setId];
}

export function getCodexUnlocks(): string[] {
  return codexUnlocks.map((r) => r.id);
}

export function getCodexUnlocksWithTime(): CodexUnlockRecord[] {
  return [...codexUnlocks];
}

export function setCodexUnlocks(data: CodexUnlockRecord[] | string[]): void {
  if (!Array.isArray(data)) {
    codexUnlocks = [];
    return;
  }
  if (data.length === 0) {
    codexUnlocks = [];
    return;
  }
  const first = data[0];
  if (typeof first === 'string') {
    codexUnlocks = (data as string[])
      .filter((id) => typeof id === 'string')
      .map((id) => ({ id, at: 0 }));
    return;
  }
  codexUnlocks = (data as CodexUnlockRecord[])
    .filter((r) => r && typeof r.id === 'string' && typeof r.at === 'number')
    .map((r) => ({ id: r.id, at: r.at }));
}

export function addCodexUnlock(entryId: string): void {
  if (typeof entryId !== 'string' || codexUnlocks.some((r) => r.id === entryId)) return;
  codexUnlocks = [...codexUnlocks, { id: entryId, at: Date.now() }];
}

export function getNarratorShown(): string[] {
  return [...narratorShown];
}

export function setNarratorShown(ids: string[]): void {
  narratorShown = Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : [];
}

export function addNarratorShown(triggerId: string): void {
  if (typeof triggerId !== 'string' || narratorShown.includes(triggerId)) return;
  narratorShown = [...narratorShown, triggerId];
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

export function setStarfieldApi(api: StarfieldApi | null): void {
  starfieldApi = api;
}

export function setMineZoneCanvasApi(api: MineZoneCanvasApi | null): void {
  mineZoneCanvasApi = api;
}

export function getExpeditionEndsAt(): number | null {
  return expeditionEndsAt;
}

export function getExpeditionComposition(): ExpeditionComposition | null {
  return expeditionComposition;
}

export function getExpeditionDurationMs(): number {
  return expeditionDurationMs;
}

export function getExpeditionDifficulty(): string | null {
  return expeditionDifficulty;
}

export function setExpeditionInProgress(
  endsAt: number,
  composition: ExpeditionComposition,
  durationMs: number,
  difficulty?: string
): void {
  expeditionEndsAt = endsAt;
  expeditionComposition = { ...composition };
  expeditionDurationMs = durationMs;
  expeditionDifficulty = difficulty ?? null;
}

export function clearExpedition(): void {
  expeditionEndsAt = null;
  expeditionComposition = null;
  expeditionDurationMs = 0;
  expeditionDifficulty = null;
}

export function getExpeditionForSave(): SavedExpedition | null {
  if (expeditionEndsAt == null || !expeditionComposition) return null;
  return {
    endsAt: expeditionEndsAt,
    composition: { ...expeditionComposition },
    durationMs: expeditionDurationMs,
    ...(expeditionDifficulty ? { difficulty: expeditionDifficulty } : {}),
  };
}

export function setExpeditionFromPayload(
  payload: { endsAt: number; composition: Record<string, number>; durationMs: number; difficulty?: string } | null | undefined
): void {
  if (!payload) {
    clearExpedition();
    return;
  }
  expeditionEndsAt = payload.endsAt;
  const raw = payload.composition;
  expeditionComposition = Object.fromEntries(
    CREW_ROLES.map((r) => [r, typeof raw[r] === 'number' ? raw[r] : 0])
  ) as ExpeditionComposition;
  expeditionDurationMs = payload.durationMs;
  expeditionDifficulty = typeof payload.difficulty === 'string' ? payload.difficulty : null;
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
  activeEventsStore.set([...activeEventInstances]);
  let mult = 1;
  for (const a of activeEventInstances) mult *= a.event.effect.multiplier;
  return mult;
}

export async function getOrCreateSession(): Promise<GameSession> {
  const result = await saveLoad.load();
  emit('session_loaded', { fromStorage: !!result });
  if (result) {
    setSession(result.session);
    setPendingChoiceEvent(null);
    setRunStatsFromPayload(result.runStats ?? null);
    setDiscoveredEventIds(result.discoveredEventIds ?? []);
    setDiscoveredSetIds(result.discoveredSetIds ?? []);
    setCodexUnlocks(result.codexUnlocks ?? []);
    setNarratorShown(result.narratorShown ?? []);
    setExpeditionFromPayload(result.expedition ?? null);
    return result.session;
  }
  const player = Player.create('player-1');
  player.addCoins(0);
  setRunStatsFromPayload(null);
  setDiscoveredEventIds([]);
  setDiscoveredSetIds([]);
  setCodexUnlocks([]);
  setNarratorShown([]);
  return new GameSession('session-1', player);
}
