import { describe, it, expect } from 'vitest';
import { getShips, canBuildShip, buildShip } from '../../src/starmap/ships.js';
import { createGameState } from '../../src/game/gameState.js';

describe('Ships', () => {
  it('has 3 ship definitions', () => {
    const ships = getShips();
    expect(ships.length).toBe(3);
  });

  it('each ship has required fields', () => {
    const ships = getShips();
    for (const ship of ships) {
      expect(ship).toHaveProperty('id');
      expect(ship).toHaveProperty('name');
      expect(ship).toHaveProperty('description');
      expect(ship).toHaveProperty('cost');
      expect(ship).toHaveProperty('range');
    }
  });

  it('has correct ship IDs', () => {
    const ships = getShips();
    const ids = ships.map(s => s.id);
    expect(ids).toContain('frigate');
    expect(ids).toContain('cruiser');
    expect(ids).toContain('battleBarge');
  });

  it('ship range increases with tier', () => {
    const ships = getShips();
    const frigate = ships.find(s => s.id === 'frigate');
    const cruiser = ships.find(s => s.id === 'cruiser');
    const battleBarge = ships.find(s => s.id === 'battleBarge');
    expect(frigate!.range).toBe(2);
    expect(cruiser!.range).toBe(3);
    expect(battleBarge!.range).toBe(5);
  });

  it('canBuildShip returns false when already built', () => {
    const state = createGameState();
    state.shipsBuilt.push('frigate');
    expect(canBuildShip(state, 'frigate')).toBe(false);
  });

  it('canBuildShip returns false when cannot afford', () => {
    const state = createGameState();
    expect(canBuildShip(state, 'frigate')).toBe(false);
  });

  it('canBuildShip returns true when can afford and not built', () => {
    const state = createGameState();
    state.addResource('minerals', 1000);
    state.addResource('alloys', 200);
    expect(canBuildShip(state, 'frigate')).toBe(true);
  });

  it('buildShip deducts resources and adds to shipsBuilt', () => {
    const state = createGameState();
    state.addResource('minerals', 1000);
    state.addResource('alloys', 200);
    const result = buildShip(state, 'frigate');
    expect(result).toBe(true);
    expect(state.shipsBuilt).toContain('frigate');
    expect(state.resources.minerals).toBeLessThan(1000);
  });

  it('buildShip returns false when already built', () => {
    const state = createGameState();
    state.shipsBuilt.push('frigate');
    state.addResource('minerals', 10000);
    expect(buildShip(state, 'frigate')).toBe(false);
  });

  it('buildShip returns false when cannot afford', () => {
    const state = createGameState();
    expect(buildShip(state, 'frigate')).toBe(false);
  });

  it('cruiser costs more resources than frigate', () => {
    const ships = getShips();
    const frigate = ships.find(s => s.id === 'frigate');
    const cruiser = ships.find(s => s.id === 'cruiser');
    const frigateCost = frigate!.cost.minerals + frigate!.cost.alloys;
    const cruiserCost = cruiser!.cost.minerals + cruiser!.cost.alloys;
    expect(cruiserCost).toBeGreaterThan(frigateCost);
  });

  it('battleBarge has relic cost', () => {
    const ships = getShips();
    const battleBarge = ships.find(s => s.id === 'battleBarge');
    expect(battleBarge!.cost.relics).toBeGreaterThan(0);
  });
});
