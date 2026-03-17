import { describe, it, expect } from 'vitest';
import { getBuildings, getUpgradeCost, getProductionRate, canUpgrade, upgradeBuilding } from '../../src/idle/buildings.js';
import { createGameState } from '../../src/game/gameState.js';

describe('Buildings', () => {
  it('returns all building definitions', () => {
    const buildings = getBuildings();
    expect(buildings.length).toBeGreaterThan(0);
    expect(buildings[0]).toHaveProperty('id');
    expect(buildings[0]).toHaveProperty('name');
    expect(buildings[0]).toHaveProperty('baseCost');
  });

  it('calculates upgrade cost with scaling', () => {
    const cost = getUpgradeCost('mine', 1);
    expect(cost.minerals).toBeGreaterThan(0);
    const cost2 = getUpgradeCost('mine', 5);
    expect(cost2.minerals).toBeGreaterThan(cost.minerals);
  });

  it('calculates production rate based on level', () => {
    const rate = getProductionRate('mine', 1);
    expect(rate).toBeGreaterThan(0);
    const rate5 = getProductionRate('mine', 5);
    expect(rate5).toBeGreaterThan(rate);
  });

  it('can upgrade when player can afford', () => {
    const state = createGameState();
    state.addResource('minerals', 10000);
    state.buildings['mine'] = { level: 1, unlocked: true };
    expect(canUpgrade(state, 'mine')).toBe(true);
  });

  it('cannot upgrade when player cannot afford', () => {
    const state = createGameState();
    state.buildings['mine'] = { level: 1, unlocked: true };
    expect(canUpgrade(state, 'mine')).toBe(false);
  });

  it('upgrades building and deducts cost', () => {
    const state = createGameState();
    state.addResource('minerals', 10000);
    state.buildings['mine'] = { level: 1, unlocked: true };
    upgradeBuilding(state, 'mine');
    expect(state.buildings['mine'].level).toBe(2);
    expect(state.resources.minerals).toBeLessThan(10000);
  });
});
