import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SaveLoadService } from './SaveLoadService.js';
import { GameSession } from '../domain/aggregates/GameSession.js';
import { Player } from '../domain/entities/Player.js';
import { Upgrade } from '../domain/entities/Upgrade.js';
import { Artifact } from '../domain/entities/Artifact.js';
import { Coins } from '../domain/value-objects/Coins.js';
import { ProductionRate } from '../domain/value-objects/ProductionRate.js';
import { UpgradeEffect } from '../domain/value-objects/UpgradeEffect.js';
import { GameEvent } from '../domain/entities/GameEvent.js';
import { Planet } from '../domain/entities/Planet.js';
import { EventEffect } from '../domain/value-objects/EventEffect.js';

describe('SaveLoadService', () => {
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
  });

  it('save writes session to localStorage', async () => {
    const player = Player.create('p1');
    player.addCoins(100);
    const session = new GameSession('session-1', player);
    const service = new SaveLoadService();

    await service.save(session);

    const raw = storage['stellar-miner-session'];
    expect(raw).toBeDefined();
    const data = JSON.parse(raw);
    expect(data.id).toBe('session-1');
    expect(data.player.id).toBe('p1');
    expect(data.player.coins).toBe('100');
    expect(data.player.productionRate).toBe('0');
  });

  it('load returns null when nothing stored', async () => {
    const service = new SaveLoadService();
    const result = await service.load();
    expect(result).toBeNull();
  });

  it('load returns null when localStorage is undefined', async () => {
    const orig = globalThis.localStorage;
    vi.stubGlobal('localStorage', undefined);
    const service = new SaveLoadService();
    const result = await service.load();
    expect(result).toBeNull();
    vi.stubGlobal('localStorage', orig);
  });

  it('save does not throw when localStorage is undefined', async () => {
    const orig = globalThis.localStorage;
    vi.stubGlobal('localStorage', undefined);
    const player = Player.create('p1');
    const session = new GameSession('session-1', player);
    const service = new SaveLoadService();
    await expect(service.save(session)).resolves.toBeUndefined();
    vi.stubGlobal('localStorage', orig);
  });

  it('round-trip save and load restores session', async () => {
    const player = Player.create('p1');
    player.addCoins(500);
    const upgrade = new Upgrade('drill', 'Drill', 200, new UpgradeEffect(5));
    player.planets[0].addUpgrade(upgrade);
    player.setProductionRate(player.productionRate.add(5));
    const evt = new GameEvent('e1', 'Event 1', new EventEffect(2, 5000));
    const session = new GameSession('session-1', player, [evt]);
    const service = new SaveLoadService();

    await service.save(session);
    const loaded = await service.load();

    expect(loaded).not.toBeNull();
    const s = loaded!.session;
    expect(s.id).toBe('session-1');
    expect(s.player.id).toBe('p1');
    expect(s.player.coins.value.toNumber()).toBe(500);
    expect(s.player.productionRate.value.toNumber()).toBe(5);
    expect(s.player.upgrades).toHaveLength(1);
    expect(s.player.upgrades[0].id).toBe('drill');
    expect(s.player.planets).toHaveLength(1);
    expect(s.player.planets[0].upgrades).toHaveLength(1);
    expect(s.activeEvents).toHaveLength(1);
    expect(s.activeEvents[0].id).toBe('e1');
  });

  it('round-trip save and load restores session with artifacts', async () => {
    const artifact = new Artifact('crystal', 'Lucky Crystal', { bonus: 2 }, true);
    const firstPlanet = Planet.create('planet-1', 'Planet 1');
    const player = new Player(
      'p1',
      new Coins(100),
      new ProductionRate(0),
      [firstPlanet],
      [artifact],
      0,
      0
    );
    const session = new GameSession('session-1', player);
    const service = new SaveLoadService();

    await service.save(session);
    const loaded = await service.load();

    expect(loaded).not.toBeNull();
    const s = loaded!.session;
    expect(s.player.artifacts).toHaveLength(1);
    expect(s.player.artifacts[0].id).toBe('crystal');
    expect(s.player.artifacts[0].name).toBe('Lucky Crystal');
    expect(s.player.artifacts[0].isActive).toBe(true);
  });

  it('clearProgress removes session from localStorage', async () => {
    const player = Player.create('p1');
    const session = new GameSession('session-1', player);
    const service = new SaveLoadService();
    await service.save(session);
    expect(storage['stellar-miner-session']).toBeDefined();

    service.clearProgress();
    expect(storage['stellar-miner-session']).toBeUndefined();

    const loaded = await service.load();
    expect(loaded).toBeNull();
  });

  it('load migrates legacy save (upgrades array, no planets) to planets', async () => {
    const legacy = {
      id: 'session-1',
      player: {
        id: 'p1',
        coins: 100,
        productionRate: 5,
        upgrades: [
          { id: 'drill', name: 'Drill', cost: 100, effect: { coinsPerSecond: 5 } },
        ],
        artifacts: [],
        prestigeLevel: 0,
        totalCoinsEver: 100,
      },
      activeEvents: [],
    };
    storage['stellar-miner-session'] = JSON.stringify(legacy);
    const service = new SaveLoadService();

    const loaded = await service.load();

    expect(loaded).not.toBeNull();
    const s = loaded!.session;
    expect(s.player.planets).toHaveLength(1);
    expect(s.player.planets[0].id).toBe('planet-1');
    expect(s.player.planets[0].upgrades).toHaveLength(1);
    expect(s.player.planets[0].upgrades[0].id).toBe('drill');
    expect(s.player.coins.value.toNumber()).toBe(100);
    expect(s.player.productionRate.value.toNumber()).toBe(5);
  });

  it('load migrates legacy save with no upgrades key (empty array fallback)', async () => {
    const legacy = {
      id: 'session-1',
      player: {
        id: 'p1',
        coins: 0,
        productionRate: 0,
        artifacts: [],
        prestigeLevel: 0,
        totalCoinsEver: 0,
      },
      activeEvents: [],
    };
    storage['stellar-miner-session'] = JSON.stringify(legacy);
    const service = new SaveLoadService();

    const loaded = await service.load();

    expect(loaded).not.toBeNull();
    const s = loaded!.session;
    expect(s.player.planets).toHaveLength(1);
    expect(s.player.planets[0].upgrades).toHaveLength(0);
  });

  it('getLastOfflineCoins returns 0 and resets after each call', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000_000_000);
    const player = Player.create('p1');
    player.addCoins(100);
    player.planets[0].addUpgrade(new Upgrade('drill-mk1', 'Drill', 0, new UpgradeEffect(10)));
    player.setProductionRate(new ProductionRate(10));
    const session = new GameSession('session-1', player);
    const service = new SaveLoadService();
    await service.save(session);

    expect(service.getLastOfflineCoins()).toBe(0);
    expect(service.getLastOfflineCoins()).toBe(0);

    vi.setSystemTime(1_000_000_000_000 + 120_000);
    await service.load();
    const offline = service.getLastOfflineCoins();
    expect(offline).toBeGreaterThan(0);
    expect(service.getLastOfflineCoins()).toBe(0);
    vi.useRealTimers();
  });

  it('load applies offline progress when elapsed >= 1 min and production > 0', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000_000_000);
    const player = Player.create('p1');
    player.addCoins(0);
    player.planets[0].addUpgrade(new Upgrade('drill-mk1', 'Drill', 0, new UpgradeEffect(10)));
    player.setProductionRate(new ProductionRate(10));
    const session = new GameSession('session-1', player);
    const service = new SaveLoadService();
    await service.save(session);

    vi.setSystemTime(1_000_000_000_000 + 120_000);
    const loaded = await service.load();
    vi.useRealTimers();

    expect(loaded).not.toBeNull();
    const s = loaded!.session;
    expect(s.player.coins.value.toNumber()).toBeGreaterThan(0);
    const reported = service.getLastOfflineCoins();
    expect(reported).toBe(s.player.coins.value.toNumber());
  });

  it('exportSession returns JSON string', async () => {
    const player = Player.create('p1');
    player.addCoins(100);
    const session = new GameSession('session-1', player);
    const service = new SaveLoadService();
    const json = service.exportSession(session);
    expect(typeof json).toBe('string');
    const data = JSON.parse(json);
    expect(data.version).toBe(1);
    expect(data.player.coins).toBe('100');
  });

  it('importSession returns null for invalid JSON', () => {
    const service = new SaveLoadService();
    expect(service.importSession('not json')).toBeNull();
    expect(service.importSession('{}')).toBeNull();
  });

  it('importSession deserializes valid payload', async () => {
    const player = Player.create('p1');
    player.addCoins(200);
    const session = new GameSession('session-1', player);
    const service = new SaveLoadService();
    const json = service.exportSession(session);
    const loaded = service.importSession(json);
    expect(loaded).not.toBeNull();
    expect(loaded!.player.coins.value.toNumber()).toBe(200);
  });

  it('validateSavePayload returns true for valid JSON', async () => {
    const player = Player.create('p1');
    const session = new GameSession('session-1', player);
    const service = new SaveLoadService();
    const json = service.exportSession(session);
    expect(service.validateSavePayload(json)).toBe(true);
  });

  it('validateSavePayload returns false for invalid', () => {
    const service = new SaveLoadService();
    expect(service.validateSavePayload('{}')).toBe(false);
    expect(service.validateSavePayload('x')).toBe(false);
  });

  it('save emits save_failed when setItem throws', async () => {
    const eventBus = await import('../application/eventBus.js');
    const emitSpy = vi.spyOn(eventBus, 'emit');
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => (k === 'stellar-miner-last-save' ? null : storage[k] ?? null),
      setItem: () => {
        throw new Error('quota exceeded');
      },
      removeItem: (k: string) => delete storage[k],
    });
    const player = Player.create('p1');
    const session = new GameSession('session-1', player);
    const service = new SaveLoadService();
    await service.save(session);
    expect(emitSpy).toHaveBeenCalledWith('save_failed', expect.any(Object));
    emitSpy.mockRestore();
  });

  it('load applies offline progress in 12-14h decay window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000_000_000);
    const player = Player.create('p1');
    player.planets[0].addUpgrade(new Upgrade('drill-mk1', 'Drill', 0, new UpgradeEffect(10)));
    player.setProductionRate(new ProductionRate(10));
    const session = new GameSession('session-1', player);
    const service = new SaveLoadService();
    await service.save(session);
    vi.setSystemTime(1_000_000_000_000 + 13 * 60 * 60 * 1000);
    const loaded = await service.load();
    vi.useRealTimers();
    expect(loaded).not.toBeNull();
    expect(loaded!.session.player.coins.value.toNumber()).toBeGreaterThan(0);
  });

  it('load applies offline progress in 14-24h decay window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000_000_000);
    const player = Player.create('p1');
    player.planets[0].addUpgrade(new Upgrade('drill-mk1', 'Drill', 0, new UpgradeEffect(10)));
    player.setProductionRate(new ProductionRate(10));
    const session = new GameSession('session-1', player);
    const service = new SaveLoadService();
    await service.save(session);
    vi.setSystemTime(1_000_000_000_000 + 20 * 60 * 60 * 1000);
    const loaded = await service.load();
    vi.useRealTimers();
    expect(loaded).not.toBeNull();
    expect(loaded!.session.player.coins.value.toNumber()).toBeGreaterThan(0);
  });

  it('load applies offline progress in 24h+ window and getLastOfflineWasCapped', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000_000_000);
    const player = Player.create('p1');
    player.planets[0].addUpgrade(new Upgrade('drill-mk1', 'Drill', 0, new UpgradeEffect(10)));
    player.setProductionRate(new ProductionRate(10));
    const session = new GameSession('session-1', player);
    const service = new SaveLoadService();
    await service.save(session);
    vi.setSystemTime(1_000_000_000_000 + 30 * 60 * 60 * 1000);
    const loaded = await service.load();
    expect(service.getLastOfflineWasCapped()).toBe(true);
    expect(service.getLastOfflineWasCapped()).toBe(false);
    vi.useRealTimers();
    expect(loaded).not.toBeNull();
    expect(loaded!.session.player.coins.value.toNumber()).toBeGreaterThan(0);
  });

  it('load returns null when deserialize throws', async () => {
    const badPayload = JSON.stringify({
      version: 1,
      id: 's1',
      player: {
        id: 'p1',
        coins: 100,
        productionRate: 0,
        planets: [{ id: 'p1', name: 'T', maxUpgrades: 6, upgrades: [{ id: 'u', name: 'U', cost: 1, effect: {} }], housing: 0 }],
        artifacts: [],
        prestigeLevel: 0,
        totalCoinsEver: 100,
        astronautCount: 0,
      },
      activeEvents: [],
    });
    storage['stellar-miner-session'] = badPayload;
    const service = new SaveLoadService();
    const loaded = await service.load();
    expect(loaded).toBeNull();
  });

  it('save with runStats and expedition options includes them in payload', async () => {
    const player = Player.create('p1');
    const session = new GameSession('session-1', player);
    const service = new SaveLoadService();
    const runStats = {
      runStartTime: 1000,
      runCoinsEarned: 500,
      runQuestsClaimed: 1,
      runEventsTriggered: 0,
      runMaxComboMult: 1.2,
    };
    const expedition = {
      endsAt: 2000,
      composition: { miner: 2, scientist: 0, pilot: 0 },
      durationMs: 10000,
    };
    await service.save(session, runStats, { discoveredEventIds: ['e1'], expedition });
    const raw = storage['stellar-miner-session'];
    expect(raw).toBeDefined();
    const data = JSON.parse(raw);
    expect(data.runStats).toEqual(runStats);
    expect(data.discoveredEventIds).toEqual(['e1']);
    expect(data.expedition).toEqual(expedition);
  });

  it('load returns runStats, discoveredEventIds and expedition when present in stored payload', async () => {
    const player = Player.create('p1');
    const session = new GameSession('session-1', player);
    const service = new SaveLoadService();
    const runStats = {
      runStartTime: 1000,
      runCoinsEarned: 500,
      runQuestsClaimed: 0,
      runEventsTriggered: 0,
      runMaxComboMult: 1,
    };
    const expedition = {
      endsAt: 3000,
      composition: { miner: 1, scientist: 0, pilot: 0 },
      durationMs: 5000,
    };
    await service.save(session, runStats, { discoveredEventIds: ['evt-a', 'evt-b'], expedition });
    const loaded = await service.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.runStats).toEqual(runStats);
    expect(loaded!.discoveredEventIds).toEqual(['evt-a', 'evt-b']);
    expect(loaded!.expedition).toEqual(expedition);
  });
});
