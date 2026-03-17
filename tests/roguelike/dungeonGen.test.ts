import { describe, it, expect } from 'vitest';
import { generateDungeon } from '../../src/roguelike/dungeonGen.js';

describe('Dungeon Generation', () => {
  it('generates a dungeon with rooms', () => {
    const dungeon = generateDungeon(3, 1);
    expect(dungeon.width).toBeGreaterThan(0);
    expect(dungeon.height).toBeGreaterThan(0);
    expect(dungeon.rooms.length).toBeGreaterThan(0);
  });

  it('dungeon has a start and exit', () => {
    const dungeon = generateDungeon(3, 1);
    expect(dungeon.startPos).toBeDefined();
    expect(dungeon.exitPos).toBeDefined();
  });

  it('deeper floors generate more rooms', () => {
    const d1 = generateDungeon(1, 1);
    const d3 = generateDungeon(3, 1);
    expect(d3.rooms.length).toBeGreaterThanOrEqual(d1.rooms.length);
  });

  it('tile map has correct dimensions', () => {
    const dungeon = generateDungeon(3, 1);
    expect(dungeon.tiles.length).toBe(dungeon.height);
    expect(dungeon.tiles[0].length).toBe(dungeon.width);
  });

  it('start position is on a floor tile', () => {
    const dungeon = generateDungeon(3, 1);
    const [sx, sy] = dungeon.startPos;
    expect(dungeon.tiles[sy][sx]).not.toBe(1);
  });
});
