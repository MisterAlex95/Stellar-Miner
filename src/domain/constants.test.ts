import { describe, it, expect } from 'vitest';
import {
  NEW_PLANET_BASE_COST,
  getNewPlanetCost,
  PLANET_PRODUCTION_BONUS,
  PRESTIGE_BONUS_PER_LEVEL,
  PRESTIGE_COIN_THRESHOLD,
  getAddSlotCost,
  PLANET_NAMES,
  getPlanetName,
  ASTRONAUT_BASE_COST,
  ASTRONAUT_PRODUCTION_BONUS,
  getAstronautCost,
} from './constants.js';

describe('constants', () => {
  it('NEW_PLANET_BASE_COST is 2500', () => {
    expect(NEW_PLANET_BASE_COST).toBe(2500);
  });

  it('getNewPlanetCost scales with planet count and exponent', () => {
    expect(getNewPlanetCost(0)).toBe(2500);
    expect(getNewPlanetCost(1)).toBe(Math.floor(2500 * 2 * Math.pow(1.15, 1)));
    expect(getNewPlanetCost(2)).toBe(Math.floor(2500 * 3 * Math.pow(1.15, 2)));
  });

  it('PLANET_PRODUCTION_BONUS is 0.05', () => {
    expect(PLANET_PRODUCTION_BONUS).toBe(0.05);
  });

  it('PRESTIGE_BONUS_PER_LEVEL is 0.05', () => {
    expect(PRESTIGE_BONUS_PER_LEVEL).toBe(0.05);
  });

  it('PRESTIGE_COIN_THRESHOLD is 50_000', () => {
    expect(PRESTIGE_COIN_THRESHOLD).toBe(50_000);
  });

  it('getAddSlotCost gives first expansion discount when at base slots (6)', () => {
    const raw6 = Math.floor(150 * Math.pow(6, 1.25));
    const atBase = getAddSlotCost(6);
    const next = getAddSlotCost(7);
    expect(atBase).toBe(Math.floor(raw6 * 0.85));
    expect(atBase).toBeLessThan(raw6);
    expect(next).toBe(Math.floor(150 * Math.pow(7, 1.25)));
  });

  it('getAddSlotCost with custom baseSlots uses it for first-expansion check', () => {
    const atCustomBase = getAddSlotCost(8, 8);
    const notBase = getAddSlotCost(8, 6);
    expect(atCustomBase).toBe(Math.floor(150 * Math.pow(8, 1.25) * 0.85));
    expect(notBase).toBe(Math.floor(150 * Math.pow(8, 1.25)));
  });

  it('PLANET_NAMES has themed names', () => {
    expect(PLANET_NAMES.length).toBeGreaterThan(0);
    expect(PLANET_NAMES[0]).toBe('Titan');
  });

  it('getPlanetName returns name by index', () => {
    expect(getPlanetName(0)).toBe('Titan');
    expect(getPlanetName(1)).toBe('Nova Prime');
  });

  it('getPlanetName falls back to Planet N when index >= length', () => {
    expect(getPlanetName(PLANET_NAMES.length)).toBe(`Planet ${PLANET_NAMES.length + 1}`);
    expect(getPlanetName(99)).toBe('Planet 100');
  });

  it('ASTRONAUT_BASE_COST and getAstronautCost scale with count', () => {
    expect(ASTRONAUT_BASE_COST).toBe(75);
    expect(getAstronautCost(0)).toBe(75);
    expect(getAstronautCost(1)).toBe(Math.floor(75 * Math.pow(1.12, 1)));
    expect(getAstronautCost(5)).toBe(Math.floor(75 * Math.pow(1.12, 5)));
  });

  it('ASTRONAUT_PRODUCTION_BONUS is 0.02', () => {
    expect(ASTRONAUT_PRODUCTION_BONUS).toBe(0.02);
  });
});
