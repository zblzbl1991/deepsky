import { describe, it, expect } from 'vitest';
import { getBuildingProductionBonus, getTechCombatBonus, getEnergyDiscount } from '../../src/tech/techEffects.js';

describe('getBuildingProductionBonus', () => {
  it('no techs returns 0', () => {
    expect(getBuildingProductionBonus('mine', [])).toBe(0);
  });
  it('improvedMining gives mine +0.5', () => {
    expect(getBuildingProductionBonus('mine', ['improvedMining'])).toBeCloseTo(0.5);
  });
  it('wrong building returns 0', () => {
    expect(getBuildingProductionBonus('powerPlant', ['improvedMining'])).toBe(0);
  });
  it('plasmaEfficiency gives powerPlant +0.5', () => {
    expect(getBuildingProductionBonus('powerPlant', ['plasmaEfficiency'])).toBeCloseTo(0.5);
  });
});

describe('getTechCombatBonus', () => {
  it('no techs returns 0,0', () => {
    const b = getTechCombatBonus([]);
    expect(b.attack).toBe(0);
    expect(b.defense).toBe(0);
  });
  it('xenoAnalysis gives +5 attack', () => {
    const b = getTechCombatBonus(['xenoAnalysis']);
    expect(b.attack).toBe(5);
    expect(b.defense).toBe(0);
  });
  it('voidShielding gives +5 defense', () => {
    const b = getTechCombatBonus(['voidShielding']);
    expect(b.attack).toBe(0);
    expect(b.defense).toBe(5);
  });
  it('both stack', () => {
    const b = getTechCombatBonus(['xenoAnalysis', 'voidShielding']);
    expect(b.attack).toBe(5);
    expect(b.defense).toBe(5);
  });
});

describe('getEnergyDiscount', () => {
  it('no techs returns 0', () => {
    expect(getEnergyDiscount([])).toBe(0);
  });
  it('warpDrive gives 0.25 discount', () => {
    expect(getEnergyDiscount(['warpDrive'])).toBeCloseTo(0.25);
  });
  it('caps at 0.75', () => {
    expect(getEnergyDiscount(['warpDrive', 'warpDrive', 'warpDrive', 'warpDrive'])).toBeCloseTo(0.75);
  });
});
