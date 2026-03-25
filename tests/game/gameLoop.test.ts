import { describe, it, expect } from 'vitest';
import { GameLoop, calculateOfflineProgress } from '../../src/game/gameLoop.js';
import { createGameState } from '../../src/game/gameState.js';
import { unlockBuilding } from '../../src/idle/buildings.js';

describe('GameLoop', () => {
  it('produces resources based on buildings', () => {
    const state = createGameState();
    state.buildings['mine'] = { level: 3, unlocked: true };

    const loop = new GameLoop(state);
    loop.tick(1); // 1 second

    expect(state.resources.minerals).toBeGreaterThan(0);
  });

  it('multiple buildings produce independently', () => {
    const state = createGameState();
    state.buildings['mine'] = { level: 2, unlocked: true };
    state.buildings['powerPlant'] = { level: 2, unlocked: true };

    const loop = new GameLoop(state);
    loop.tick(1);

    expect(state.resources.minerals).toBeGreaterThan(0);
    expect(state.resources.energy).toBeGreaterThan(0);
  });

  it('refinery consumes resources while producing', () => {
    const state = createGameState();
    state.buildings['refinery'] = { level: 1, unlocked: true };
    state.addResource('minerals', 1000);
    state.addResource('energy', 1000);

    const loop = new GameLoop(state);
    loop.tick(10);

    expect(state.resources.alloys).toBeGreaterThan(0);
  });

  it('refinery stops when input resources are depleted', () => {
    const state = createGameState();
    state.buildings['refinery'] = { level: 1, unlocked: true };
    // No input resources

    const loop = new GameLoop(state);
    loop.tick(10);

    expect(state.resources.alloys).toBe(0);
  });

  it('updates last tick time', () => {
    const state = createGameState();
    const before = state.lastTickTime;
    const loop = new GameLoop(state);
    loop.tick(1);
    expect(state.lastTickTime).toBeGreaterThanOrEqual(before);
  });
});

describe('calculateOfflineProgress', () => {
  it('calculates offline resources', () => {
    const state = createGameState();
    state.buildings['mine'] = { level: 2, unlocked: true };
    const offlineSeconds = 600; // 10 minutes

    calculateOfflineProgress(state, offlineSeconds);

    expect(state.resources.minerals).toBeGreaterThan(0);
  });

  it('caps offline progress at 8 hours', () => {
    const state = createGameState();
    state.buildings['mine'] = { level: 10, unlocked: true };

    const capped = calculateOfflineProgress(state, 86400); // 24 hours
    expect(capped).toBeLessThanOrEqual(28800);
  });
});

describe('GameLoop tech production bonus', () => {
  it('mine produces more with improvedMining tech', () => {
    const state = createGameState();
    state.addResource('minerals', 999);
    unlockBuilding(state, 'mine');

    const loop = new GameLoop(state);

    // Tick without tech
    loop.tick(1);
    const base = state.resources.minerals;

    // Reset to the same starting point (after unlock cost but before production)
    state.resources.minerals -= 2; // remove the production from the first tick

    // Now with tech
    state.techUnlocked.push('improvedMining');
    loop.tick(1);

    // With +50% tech bonus, mine produces 3 minerals/sec instead of 2
    expect(state.resources.minerals).toBeGreaterThan(base);
  });
});
