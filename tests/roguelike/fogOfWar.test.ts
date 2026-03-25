import { describe, it, expect } from 'vitest';
import { createFogMap, revealAround, fadeVisibility } from '../../src/roguelike/fogOfWar.js';

describe('Fog of War', () => {
  it('createFogMap creates 2D array with hidden state', () => {
    const fog = createFogMap(10, 10);
    expect(fog.length).toBe(10);
    expect(fog[0].length).toBe(10);
    expect(fog[5][5]).toBe('hidden');
  });

  it('createFogMap uses correct dimensions', () => {
    const fog = createFogMap(20, 15);
    expect(fog.length).toBe(15);
    expect(fog[0].length).toBe(20);
  });

  it('revealAround reveals tiles in radius', () => {
    const fog = createFogMap(20, 20);
    revealAround(fog, 10, 10, 3);
    expect(fog[10][10]).toBe('visible');
    expect(fog[10][9]).toBe('visible');
    expect(fog[9][10]).toBe('visible');
  });

  it('revealAround does not reveal beyond map bounds', () => {
    const fog = createFogMap(10, 10);
    revealAround(fog, 1, 1, 5);
    // Should not throw or go out of bounds
    expect(fog[0][0]).toBe('visible');
  });

  it('revealAround reveals circular area', () => {
    const fog = createFogMap(20, 20);
    revealAround(fog, 10, 10, 2);
    // Corner should not be visible (diagonal distance > 2)
    expect(fog[8][8]).toBe('hidden');
    // Adjacent should be visible (distance = 1)
    expect(fog[10][11]).toBe('visible');
  });

  it('fadeVisibility changes visible to seen', () => {
    const fog = createFogMap(10, 10);
    revealAround(fog, 5, 5, 2);
    fadeVisibility(fog);
    expect(fog[5][5]).toBe('seen');
    expect(fog[5][4]).toBe('seen');
  });

  it('fadeVisibility does not affect hidden tiles', () => {
    const fog = createFogMap(10, 10);
    fadeVisibility(fog);
    expect(fog[0][0]).toBe('hidden');
  });

  it('fadeVisibility only affects visible tiles', () => {
    const fog = createFogMap(10, 10);
    revealAround(fog, 5, 5, 1);
    const originalHidden = fog[0][0];
    fadeVisibility(fog);
    expect(fog[0][0]).toBe(originalHidden);
  });
});
