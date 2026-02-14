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
    player.addUpgrade(
      new Upgrade('drill', 'Drill', 200, new UpgradeEffect(5))
    );
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
    expect(loaded!.activeEvents).toHaveLength(1);
    expect(loaded!.activeEvents[0].id).toBe('e1');
  });

  it('round-trip save and load restores session with artifacts', async () => {
    const artifact = new Artifact('crystal', 'Lucky Crystal', { bonus: 2 }, true);
    const player = new Player(
      'p1',
      new Coins(100),
      new ProductionRate(0),
      [],
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
});
