import { describe, it, expect } from 'vitest';
import { createGameState, type GameState } from '../../src/game/gameState.js';

describe('GameState', () => {
  it('initializes with default resources', () => {
    const state = createGameState();
    expect(state.resources.minerals).toBe(0);
    expect(state.resources.energy).toBe(0);
    expect(state.resources.tech).toBe(0);
    expect(state.resources.alloys).toBe(0);
    expect(state.resources.relics).toBe(0);
  });

  it('initializes with no buildings', () => {
    const state = createGameState();
    expect(Object.keys(state.buildings)).toHaveLength(0);
  });

  it('initializes with default player', () => {
    const state = createGameState();
    expect(state.player.level).toBe(1);
    expect(state.player.exp).toBe(0);
    expect(state.player.class).toBe('spaceMarine');
  });

  it('adds resources correctly', () => {
    const state = createGameState();
    state.addResource('minerals', 100);
    expect(state.resources.minerals).toBe(100);
  });

  it('prevents resources from going below zero', () => {
    const state = createGameState();
    state.addResource('minerals', 50);
    const result = state.spendResource('minerals', 100);
    expect(result).toBe(false);
    expect(state.resources.minerals).toBe(50);
  });

  it('spends resources correctly', () => {
    const state = createGameState();
    state.addResource('minerals', 100);
    const result = state.spendResource('minerals', 30);
    expect(result).toBe(true);
    expect(state.resources.minerals).toBe(70);
  });

  it('serializes to save data', () => {
    const state = createGameState();
    state.addResource('minerals', 500);
    const save = state.toSaveData();
    expect(save.resources.minerals).toBe(500);
    expect(save.version).toBe('0.1.0');
  });

  it('restores from save data', () => {
    const state = createGameState();
    state.addResource('minerals', 500);
    const save = state.toSaveData();

    const restored = createGameState();
    restored.fromSaveData(save);
    expect(restored.resources.minerals).toBe(500);
  });

  it('canAfford returns true when resources are sufficient', () => {
    const state = createGameState();
    state.addResource('minerals', 100);
    state.addResource('energy', 50);
    expect(state.canAfford({ minerals: 50, energy: 25 })).toBe(true);
  });

  it('canAfford returns false when resources are insufficient', () => {
    const state = createGameState();
    state.addResource('minerals', 30);
    expect(state.canAfford({ minerals: 50 })).toBe(false);
  });

  it('canAfford returns true for zero cost', () => {
    const state = createGameState();
    expect(state.canAfford({ minerals: 0 })).toBe(true);
  });

  it('spendResources deducts multiple resources atomically', () => {
    const state = createGameState();
    state.addResource('minerals', 100);
    state.addResource('energy', 50);
    const result = state.spendResources({ minerals: 30, energy: 20 });
    expect(result).toBe(true);
    expect(state.resources.minerals).toBe(70);
    expect(state.resources.energy).toBe(30);
  });

  it('spendResources fails atomically when insufficient resources', () => {
    const state = createGameState();
    state.addResource('minerals', 30);
    state.addResource('energy', 50);
    const result = state.spendResources({ minerals: 50, energy: 20 });
    expect(result).toBe(false);
    // Neither resource should be deducted
    expect(state.resources.minerals).toBe(30);
    expect(state.resources.energy).toBe(50);
  });

  it('toSaveData creates deep copy to prevent mutation', () => {
    const state = createGameState();
    state.addResource('minerals', 500);
    const save = state.toSaveData();
    save.resources.minerals = 999;
    // Original state should be unaffected
    expect(state.resources.minerals).toBe(500);
  });

  it('fromSaveData creates deep copy to prevent mutation', () => {
    const state1 = createGameState();
    state1.addResource('minerals', 500);

    const state2 = createGameState();
    const save = state1.toSaveData();
    state2.fromSaveData(save);

    // Mutate the saved data
    save.resources.minerals = 999;

    // state2 should be unaffected
    expect(state2.resources.minerals).toBe(500);
  });

  it('serializes with version string', () => {
    const state = createGameState();
    const save = state.toSaveData();
    expect(save.version).toBe('0.1.0');
  });

  it('serializes player equipment as copy', () => {
    const state = createGameState();
    state.player.equipment.push('bolter');
    const save = state.toSaveData();
    state.player.equipment.push('chainsword');
    // Save should not be affected
    expect(save.player.equipment).toEqual(['bolter']);
  });

  it('initializes exploredPlanets as empty array', () => {
    const state = createGameState();
    expect(state.exploredPlanets).toEqual([]);
  });

  it('initializes techUnlocked as empty array', () => {
    const state = createGameState();
    expect(state.techUnlocked).toEqual([]);
  });

  it('initializes shipsBuilt as empty array', () => {
    const state = createGameState();
    expect(state.shipsBuilt).toEqual([]);
  });
});
