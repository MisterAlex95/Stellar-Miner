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
  generatePlanetName,
  HOUSING_BASE_COST,
  getHousingCost,
  ASTRONAUT_BASE_COST,
  ASTRONAUT_PRODUCTION_BONUS,
  getAstronautCost,
  getMaxAstronauts,
} from './constants.js';

describe('constants', () => {
  it('NEW_PLANET_BASE_COST is from balance', () => {
    expect(NEW_PLANET_BASE_COST).toBe(120000);
  });

  it('getNewPlanetCost scales with planet count and exponent', () => {
    expect(getNewPlanetCost(0).toNumber()).toBe(120000);
    expect(getNewPlanetCost(1).toNumber()).toBe(307200);
    expect(getNewPlanetCost(2).toNumber()).toBe(589824);
  });

  it('PLANET_PRODUCTION_BONUS is from balance', () => {
    expect(PLANET_PRODUCTION_BONUS).toBe(0.04);
  });

  it('PRESTIGE_BONUS_PER_LEVEL is from balance', () => {
    expect(PRESTIGE_BONUS_PER_LEVEL).toBe(0.07);
  });

  it('PRESTIGE_COIN_THRESHOLD is from balance', () => {
    expect(PRESTIGE_COIN_THRESHOLD.toNumber()).toBe(5_000_000);
  });

  it('getAddSlotCost gives first expansion discount when at base slots (6)', () => {
    const raw6 = Math.floor(25000 * Math.pow(6, 1.38));
    const atBase = getAddSlotCost(6).toNumber();
    const next = getAddSlotCost(7).toNumber();
    expect(atBase).toBe(Math.floor(raw6 * 0.82));
    expect(atBase).toBeLessThan(raw6);
    expect(next).toBe(Math.floor(25000 * Math.pow(7, 1.38)));
  });

  it('getAddSlotCost with custom baseSlots uses it for first-expansion check', () => {
    const raw8 = Math.floor(25000 * Math.pow(8, 1.38));
    const atCustomBase = getAddSlotCost(8, 8).toNumber();
    const notBase = getAddSlotCost(8, 6).toNumber();
    expect(atCustomBase).toBe(Math.floor(raw8 * 0.82));
    expect(notBase).toBe(raw8);
  });

  it('PLANET_NAMES is an array (may be empty for full procedural names)', () => {
    expect(Array.isArray(PLANET_NAMES)).toBe(true);
  });

  it('getPlanetName returns balance name when in range, else procedural by syllables', () => {
    if (PLANET_NAMES.length > 0) {
      expect(getPlanetName(0)).toBe(PLANET_NAMES[0]);
    } else {
      expect(getPlanetName(0)).toBe(generatePlanetName('planet-1'));
    }
    expect(getPlanetName(1)).toBe(generatePlanetName('planet-2'));
    expect(getPlanetName(99)).toBe(generatePlanetName('planet-100'));
  });

  it('generatePlanetName is deterministic and returns two-word syllable-based names', () => {
    expect(generatePlanetName('planet-1')).toBe(generatePlanetName('planet-1'));
    expect(generatePlanetName('planet-2')).toBe(generatePlanetName('planet-2'));
    const name1 = generatePlanetName('planet-1');
    const name2 = generatePlanetName('planet-2');
    expect(name1).toMatch(/^[A-Za-z]+ [A-Za-z]+$/);
    expect(name2).toMatch(/^[A-Za-z]+ [A-Za-z]+$/);
    expect(name1).not.toBe(name2);
  });

  it('HOUSING_BASE_COST and getHousingCost scale with count', () => {
    expect(HOUSING_BASE_COST).toBe(12000);
    expect(getHousingCost(0).toNumber()).toBe(12000);
    expect(getHousingCost(1).toNumber()).toBe(15120);
  });

  it('ASTRONAUT_BASE_COST and getAstronautCost scale with count', () => {
    expect(ASTRONAUT_BASE_COST).toBe(2500);
    expect(getAstronautCost(0).toNumber()).toBe(2500);
    expect(getAstronautCost(1).toNumber()).toBe(3000);
    expect(getAstronautCost(5).toNumber()).toBe(6220);
  });

  it('ASTRONAUT_PRODUCTION_BONUS is from balance', () => {
    expect(ASTRONAUT_PRODUCTION_BONUS).toBe(0.015);
  });

  it('getMaxAstronauts is at least 2 and scales with planet count', () => {
    expect(getMaxAstronauts(1)).toBe(2);
    expect(getMaxAstronauts(2)).toBe(4);
    expect(getMaxAstronauts(3)).toBe(6);
    expect(getMaxAstronauts(5)).toBe(10);
  });
});
