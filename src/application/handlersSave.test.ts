import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setSession, getSession, saveLoad, setRunStatsFromPayload } from './gameState.js';
import { GameSession } from '../domain/aggregates/GameSession.js';
import { Player } from '../domain/entities/Player.js';
import { saveSession, handleExportSave, handleImportSave } from './handlersSave.js';

describe('handlersSave', () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
    });
    const player = Player.create('p1');
    player.addCoins(500);
    setSession(new GameSession('s1', player));
    setRunStatsFromPayload(null);
  });

  describe('saveSession', () => {
    it('persists session so load restores it', async () => {
      const session = getSession();
      session.player.addCoins(100);

      saveSession();

      const loaded = await saveLoad.load();
      expect(loaded).not.toBeNull();
      expect(loaded!.session.player.id).toBe('p1');
      expect(loaded!.session.player.coins.value.toNumber()).toBe(600);
    });
  });

  describe('handleExportSave', () => {
    it('exported session JSON can be imported and restores state', async () => {
      const session = getSession();
      const json = saveLoad.exportSession(session);
      expect(json.length).toBeGreaterThan(0);
      const ok = await handleImportSave(json);
      expect(ok).toBe(true);
      expect(getSession().player.id).toBe(session.player.id);
      expect(getSession().player.coins.value.toNumber()).toBe(session.player.coins.value.toNumber());
    });
  });

  describe('handleImportSave', () => {
    it('restores session from valid JSON', async () => {
      const session = getSession();
      session.player.addCoins(1000);
      saveSession();
      const raw = storage['stellar-miner-session'];
      expect(raw).toBeTruthy();

      const other = Player.create('other');
      setSession(new GameSession('other', other));

      const ok = await handleImportSave(raw!);
      expect(ok).toBe(true);
      expect(getSession().player.id).toBe('p1');
      expect(getSession().player.coins.value.toNumber()).toBe(1500);
    });

    it('returns false for invalid JSON', async () => {
      const ok = await handleImportSave('not valid json');
      expect(ok).toBe(false);
    });

    it('returns false for empty string', async () => {
      const ok = await handleImportSave('');
      expect(ok).toBe(false);
    });

    it('returns false for JSON without session', async () => {
      const ok = await handleImportSave(JSON.stringify({ version: 1 }));
      expect(ok).toBe(false);
    });
  });

  describe('saveSession with run stats', () => {
    it('persists and restores run stats', async () => {
      const session = getSession();
      saveSession();
      const loaded = await saveLoad.load();
      expect(loaded?.runStats).toBeDefined();
    });
  });
});
