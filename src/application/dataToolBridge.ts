/**
 * Application bridge for the dev data tool. Used only when ?tool=data.
 * Provides read/write/validate for session and localStorage without starting the game loop.
 */
import { SESSION_STORAGE_KEY } from '../infrastructure/SaveLoadService.js';
import { SaveLoadService } from '../infrastructure/SaveLoadService.js';
import { deserializeSession } from './sessionSerialization.js';
import { getResearchProductionMultiplier, getUnlockedResearch } from './research.js';

const STORAGE_PREFIX = 'stellar-miner-';

function getSaveLoad(): SaveLoadService {
  return new SaveLoadService({
    deserialize: deserializeSession,
    getResearchProductionMultiplier,
    getUnlockedResearch,
  });
}

export function getStoredSessionRaw(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(SESSION_STORAGE_KEY);
}

export function setStoredSessionRaw(json: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(SESSION_STORAGE_KEY, json);
}

export function validateSessionJson(json: string): boolean {
  return getSaveLoad().validateSavePayload(json);
}

/** Write JSON to storage and optionally apply in-memory (when game is running). Returns true if valid and written. */
export function writeSessionAndReload(json: string): boolean {
  if (!validateSessionJson(json)) return false;
  setStoredSessionRaw(json);
  return true;
}

export function listStorageKeys(): string[] {
  if (typeof localStorage === 'undefined') return [];
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) keys.push(key);
  }
  return keys.sort();
}

export function getStorageValue(key: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(key);
}

export function setStorageValue(key: string, value: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key, value);
}

export function removeStorageKey(key: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(key);
}

export { SESSION_STORAGE_KEY };
