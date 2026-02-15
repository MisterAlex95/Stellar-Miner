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
    expect(data.player.coins).toBe(100);
    expect(data.player.productionRate).toBe(0);
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
    expect(loaded!.id).toBe('session-1');
    expect(loaded!.player.id).toBe('p1');
    expect(loaded!.player.coins.value).toBe(500);
    expect(loaded!.player.productionRate.value).toBe(5);
    expect(loaded!.player.upgrades).toHaveLength(1);
    expect(loaded!.player.upgrades[0].id).toBe('drill');
    expect(loaded!.player.planets).toHaveLength(1);
    expect(loaded!.player.planets[0].upgrades).toHaveLength(1);
    expect(loaded!.activeEvents).toHaveLength(1);
    expect(loaded!.activeEvents[0].id).toBe('e1');
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
    expect(loaded!.player.artifacts).toHaveLength(1);
    expect(loaded!.player.artifacts[0].id).toBe('crystal');
    expect(loaded!.player.artifacts[0].name).toBe('Lucky Crystal');
    expect(loaded!.player.artifacts[0].isActive).toBe(true);
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
    expect(loaded!.player.planets).toHaveLength(1);
    expect(loaded!.player.planets[0].id).toBe('planet-1');
    expect(loaded!.player.planets[0].upgrades).toHaveLength(1);
    expect(loaded!.player.planets[0].upgrades[0].id).toBe('drill');
    expect(loaded!.player.coins.value).toBe(100);
    expect(loaded!.player.productionRate.value).toBe(5);
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
    expect(loaded!.player.planets).toHaveLength(1);
    expect(loaded!.player.planets[0].upgrades).toHaveLength(0);
  });

  it('getLastOfflineCoins returns 0 and resets after each call', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000_000_000);
    const player = Player.create('p1');
    player.addCoins(100);
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
    player.setProductionRate(new ProductionRate(10));
    const session = new GameSession('session-1', player);
    const service = new SaveLoadService();
    await service.save(session);

    vi.setSystemTime(1_000_000_000_000 + 120_000);
    const loaded = await service.load();
    vi.useRealTimers();

    expect(loaded).not.toBeNull();
    expect(loaded!.player.coins.value).toBeGreaterThan(0);
    const reported = service.getLastOfflineCoins();
    expect(reported).toBe(loaded!.player.coins.value);
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
    expect(data.player.coins).toBe(100);
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
    expect(loaded!.player.coins.value).toBe(200);
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
});
