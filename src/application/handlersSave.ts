import {
  getSession,
  setSession,
  getRunStats,
  setRunStatsFromPayload,
  getDiscoveredEventIds,
  getDiscoveredSetIds,
  getCodexUnlocksWithTime,
  getNarratorShown,
  getExpeditionForSave,
  setExpeditionFromPayload,
  setCodexUnlocks,
  setNarratorShown,
  setDiscoveredSetIds,
  saveLoad,
  type SavedExpedition,
} from './gameState.js';

function getSavePayload(): {
  session: ReturnType<typeof getSession>;
  runStats: ReturnType<typeof getRunStats>;
  extras: { discoveredEventIds: string[]; discoveredSetIds: string[]; codexUnlocks: Array<{ id: string; at: number }>; narratorShown: string[]; expedition: SavedExpedition | null };
} {
  return {
    session: getSession(),
    runStats: getRunStats(),
    extras: {
      discoveredEventIds: getDiscoveredEventIds(),
      discoveredSetIds: getDiscoveredSetIds(),
      codexUnlocks: getCodexUnlocksWithTime(),
      narratorShown: getNarratorShown(),
      expedition: getExpeditionForSave(),
    },
  };
}

export function saveSession(): void {
  const { session, runStats, extras } = getSavePayload();
  if (session) saveLoad.save(session, runStats, extras);
}

export function handleExportSave(): void {
  const { session, runStats, extras } = getSavePayload();
  const json = saveLoad.exportSession(session, { runStats, ...extras });
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
  let parsed: { codexUnlocks?: unknown; narratorShown?: string[]; discoveredSetIds?: string[] } | null = null;
  try {
    parsed = JSON.parse(json) as { codexUnlocks?: unknown; narratorShown?: string[]; discoveredSetIds?: string[] };
  } catch {
    // importSession will fail too
  }
  const session = saveLoad.importSession(json);
  if (!session) return false;
  setSession(session);
  setRunStatsFromPayload(null);
  setExpeditionFromPayload(null);
  if (Array.isArray(parsed?.discoveredSetIds)) {
    setDiscoveredSetIds((parsed.discoveredSetIds as string[]).filter((id) => typeof id === 'string'));
  }
  if (Array.isArray(parsed?.codexUnlocks)) {
    const list = parsed.codexUnlocks as unknown[];
    const normalized = list
      .map((item) => {
        if (typeof item === 'object' && item !== null && 'id' in item && 'at' in item)
          return { id: String((item as { id: unknown }).id), at: Number((item as { at: unknown }).at) };
        if (typeof item === 'string') return { id: item, at: 0 };
        return null;
      })
      .filter((r): r is { id: string; at: number } => r !== null);
    setCodexUnlocks(normalized);
  }
  if (Array.isArray(parsed?.narratorShown)) {
    setNarratorShown((parsed.narratorShown as string[]).filter((id) => typeof id === 'string'));
  }
  const { runStats, extras } = getSavePayload();
  await saveLoad.save(session, runStats, extras);
  return true;
}
