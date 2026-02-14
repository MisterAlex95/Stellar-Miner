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
});
