import {
  getSession,
  setSession,
  getRunStats,
  setRunStatsFromPayload,
  getDiscoveredEventIds,
  getExpeditionForSave,
  setExpeditionFromPayload,
  saveLoad,
  type SavedExpedition,
} from './gameState.js';

function getSavePayload(): {
  session: ReturnType<typeof getSession>;
  runStats: ReturnType<typeof getRunStats>;
  extras: { discoveredEventIds: string[]; expedition: SavedExpedition | null };
} {
  return {
    session: getSession(),
    runStats: getRunStats(),
    extras: {
      discoveredEventIds: getDiscoveredEventIds(),
      expedition: getExpeditionForSave(),
    },
  };
}

export function saveSession(): void {
  const { session, runStats, extras } = getSavePayload();
  if (session) saveLoad.save(session, runStats, extras);
}

export function handleExportSave(): void {
  const session = getSession();
  const json = saveLoad.exportSession(session);
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(json).catch(() => {});
  }
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stellar-miner-save-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function handleImportSave(json: string): Promise<boolean> {
  const session = saveLoad.importSession(json);
  if (!session) return false;
  setSession(session);
  setRunStatsFromPayload(null);
  setExpeditionFromPayload(null);
  const { runStats, extras } = getSavePayload();
  await saveLoad.save(session, runStats, extras);
  return true;
}
