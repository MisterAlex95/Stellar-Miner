import { getSession, setSession, getRunStats, setRunStatsFromPayload, saveLoad } from './gameState.js';

export function saveSession(): void {
  const session = getSession();
  saveLoad.save(session, getRunStats());
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
  await saveLoad.save(session, getRunStats());
  return true;
}
