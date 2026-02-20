import { describe, it, expect, beforeEach, vi } from 'vitest';
import Decimal from 'break_infinity.js';
import { setSession } from '../../application/gameState.js';
import { GameSession } from '../../domain/aggregates/GameSession.js';
import { Player } from '../../domain/entities/Player.js';
import { ProductionRate } from '../../domain/value-objects/ProductionRate.js';
import { minutesUntil, getNextGoalEta } from './dashboardHelpers.js';

describe('dashboardHelpers', () => {
  describe('minutesUntil', () => {
    it('returns minutes to reach coin target at given rate', () => {
      const coins = new Decimal(600);
      const rate = new Decimal(10);
      expect(minutesUntil(coins, rate)).toBe(1);
    });

    it('returns Infinity when rate is zero', () => {
      const coins = new Decimal(100);
      const rate = new Decimal(0);
      expect(minutesUntil(coins, rate)).toBe(Infinity);
    });

    it('ceil rounds up partial minutes', () => {
      const coins = new Decimal(90);
      const rate = new Decimal(10);
      expect(minutesUntil(coins, rate)).toBe(1);
    });
  });

  describe('getNextGoalEta', () => {
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

    it('returns null when session has zero production', () => {
      const player = Player.create('p1');
      player.addCoins(200000);
      setSession(new GameSession('s1', player));
      const eta = getNextGoalEta();
      expect(eta).toBeNull();
    });

    it('returns next goal ETA when session has production and coins below next goal', () => {
      const player = Player.create('p1');
      player.addCoins(30);
      player.setProductionRate(new ProductionRate(10));
      setSession(new GameSession('s1', player));
      const eta = getNextGoalEta();
      expect(eta).not.toBeNull();
      expect(eta!.type).toMatch(/^(upgrade|planet)$/);
      expect(eta!.minutes).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(eta!.minutes)).toBe(true);
      expect(eta!.labelKey).toMatch(/^dashboardNextGoal(Upgrade|Planet)$/);
    });
  });
});
