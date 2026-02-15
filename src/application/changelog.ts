import { compareVersions } from './version.js';
import changelogData from '../data/changelog.json';

/**
 * Changelog entries, linked to app version. Newest first.
 * Data lives in src/data/changelog.json.
 */
export type ChangelogEntry = {
  version: string;
  date: string;
  changes: string[];
};

const CHANGELOG: ChangelogEntry[] = changelogData as ChangelogEntry[];

/** All changelog entries (newest first). */
export function getChangelog(): ChangelogEntry[] {
  return [...CHANGELOG];
}

/** Entries for versions newer than the given version (e.g. last seen). Newest first. */
export function getChangelogSince(lastSeenVersion: string | null): ChangelogEntry[] {
  if (!lastSeenVersion) return [...CHANGELOG];
  return CHANGELOG.filter((e) => compareVersions(e.version, lastSeenVersion) > 0);
}
