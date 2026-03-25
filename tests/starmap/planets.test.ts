import { describe, it, expect } from 'vitest';
import { getPlanets, getPlanetDef, isPlanetUnlocked, getPlanetsInRange } from '../../src/starmap/planets.js';
import { createGameState } from '../../src/game/gameState.js';

describe('Planets', () => {
  it('returns 5 planet definitions', () => {
    const planets = getPlanets();
    expect(planets.length).toBe(5);
  });

  it('each planet has required fields', () => {
    const planets = getPlanets();
    for (const planet of planets) {
      expect(planet).toHaveProperty('id');
      expect(planet).toHaveProperty('name');
      expect(planet).toHaveProperty('type');
      expect(planet).toHaveProperty('dangerLevel');
      expect(planet).toHaveProperty('distance');
      expect(planet).toHaveProperty('energyCost');
      expect(planet).toHaveProperty('rewards');
      expect(planet).toHaveProperty('requiredShip');
      expect(planet).toHaveProperty('dungeonFloors');
    }
  });

  it('has correct planet types', () => {
    const planets = getPlanets();
    const types = planets.map(p => p.type);
    expect(types).toContain('deadWorld');
    expect(types).toContain('hiveWorld');
    expect(types).toContain('deathWorld');
    expect(types).toContain('chaosSpace');
    expect(types).toContain('forgeWorld');
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

  it('getPlanetDef returns correct planet', () => {
    const planet = getPlanetDef('aridia');
    expect(planet).toBeDefined();
    expect(planet!.name).toBe('阿里迪亚主星');
  });

  it('getPlanetDef returns undefined for unknown', () => {
    const planet = getPlanetDef('nonexistent');
    expect(planet).toBeUndefined();
  });

  it('danger level is between 1 and 4', () => {
    const planets = getPlanets();
    for (const planet of planets) {
      expect(planet.dangerLevel).toBeGreaterThanOrEqual(1);
      expect(planet.dangerLevel).toBeLessThanOrEqual(4);
    }
  });

  it('getPlanetsInRange returns only unlocked planets', () => {
    const state = createGameState();
    const inRange = getPlanetsInRange(state);
    for (const planet of inRange) {
      expect(isPlanetUnlocked(state, planet.id)).toBe(true);
    }
  });

  it('Aridia Prime has no ship requirement', () => {
    const planet = getPlanetDef('aridia');
    expect(planet!.requiredShip).toBeNull();
  });

  it('Hive Tartarus requires frigate', () => {
    const planet = getPlanetDef('hiveTartarus');
    expect(planet!.requiredShip).toBe('frigate');
  });

  it('each planet has dungeon floors defined', () => {
    const planets = getPlanets();
    for (const planet of planets) {
      expect(planet.dungeonFloors).toBeGreaterThan(0);
    }
  });
});
