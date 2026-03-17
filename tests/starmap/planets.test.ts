import { describe, it, expect } from 'vitest';
import { getPlanets, isPlanetUnlocked } from '../../src/starmap/planets.js';
import { createGameState } from '../../src/game/gameState.js';

describe('Planets', () => {
  it('returns planet definitions', () => {
    const planets = getPlanets();
    expect(planets.length).toBeGreaterThan(0);
  });

  it('first planet is always unlocked', () => {
    const state = createGameState();
    const planets = getPlanets();
    expect(isPlanetUnlocked(state, planets[0].id)).toBe(true);
  });

  it('planet with ship requirement is locked without ship', () => {
    const state = createGameState();
    const planets = getPlanets();
    const locked = planets.find(p => p.requiredShip);
    if (locked) {
      expect(isPlanetUnlocked(state, locked.id)).toBe(false);
    }
  });

  it('planet is unlocked when ship requirement is met', () => {
    const state = createGameState();
    state.shipsBuilt.push('frigate');
    const planets = getPlanets();
    const withShip = planets.find(p => p.requiredShip === 'frigate');
    if (withShip) {
      expect(isPlanetUnlocked(state, withShip.id)).toBe(true);
    }
  });
});
