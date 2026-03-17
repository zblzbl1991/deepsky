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
});
