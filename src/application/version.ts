/**
 * App version from package.json so the UI always shows the current version (no dev-server restart needed).
 * Compare with last seen version to show "What's new" when the user gets an update.
 */
import pkg from '../../package.json' with { type: 'json' };

export const APP_VERSION = (pkg as { version: string }).version;

const LAST_SEEN_VERSION_KEY = 'stellar-miner-last-seen-version';

export function getLastSeenVersion(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(LAST_SEEN_VERSION_KEY);
  } catch {
    return null;
  }
}

export function setLastSeenVersion(version: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LAST_SEEN_VERSION_KEY, version);
  } catch {
    // ignore
  }
}

/** True when current app version is newer than the last version the user had when they last visited. */
export function hasNewUpdate(): boolean {
  const last = getLastSeenVersion();
  if (!last) return true;
  return compareVersions(APP_VERSION, last) > 0;
}

/** Mark current version as seen so we stop showing "new update" until the next release. */
export function markUpdateSeen(): void {
  setLastSeenVersion(APP_VERSION);
}

/** Compare semver-like versions (e.g. "0.1.0" vs "0.2.0"). Returns >0 if a > b, <0 if a < b, 0 if equal. */
export function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map((n) => parseInt(n, 10) || 0);
  const partsB = b.split('.').map((n) => parseInt(n, 10) || 0);
  const maxLen = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < maxLen; i++) {
    const va = partsA[i] ?? 0;
    const vb = partsB[i] ?? 0;
    if (va !== vb) return va - vb;
  }
  return 0;
}
