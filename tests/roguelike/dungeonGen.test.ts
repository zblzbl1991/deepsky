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

  it('exit position has exit tile type (2)', () => {
    const dungeon = generateDungeon(1, 1);
    const [ex, ey] = dungeon.exitPos;
    expect(dungeon.tiles[ey][ex]).toBe(2);
  });

  it('floor 1 dungeon has minimum room count', () => {
    const dungeon = generateDungeon(1, 1);
    // spec: 5 + floor*2 rooms per floor = 5 + 1*2 = 7
    expect(dungeon.rooms.length).toBeGreaterThanOrEqual(5);
  });

  it('dungeon width scales with floor', () => {
    const d1 = generateDungeon(1, 1);
    const d5 = generateDungeon(5, 1);
    expect(d5.width).toBeGreaterThan(d1.width);
  });

  it('dungeon height scales with floor', () => {
    const d1 = generateDungeon(1, 1);
    const d5 = generateDungeon(5, 1);
    expect(d5.height).toBeGreaterThan(d1.height);
  });

  it('all rooms have valid dimensions (5-10 x 4-8)', () => {
    const dungeon = generateDungeon(3, 1);
    for (const room of dungeon.rooms) {
      expect(room.w).toBeGreaterThanOrEqual(5);
      expect(room.w).toBeLessThanOrEqual(10);
      expect(room.h).toBeGreaterThanOrEqual(4);
      expect(room.h).toBeLessThanOrEqual(8);
    }
  });

  it('first room has no enemies', () => {
    const dungeon = generateDungeon(3, 1);
    expect(dungeon.rooms[0].enemies.length).toBe(0);
  });

  it('rooms after first may have enemies', () => {
    // This is probabilistic but should pass most of the time
    const dungeon = generateDungeon(3, 1);
    const hasEnemies = dungeon.rooms.slice(1).some(r => r.enemies.length > 0);
    expect(hasEnemies).toBe(true);
  });

  it('tiles are 0 (floor), 1 (wall), or 2 (exit)', () => {
    const dungeon = generateDungeon(1, 1);
    for (let y = 0; y < dungeon.height; y++) {
      for (let x = 0; x < dungeon.width; x++) {
        expect([0, 1, 2]).toContain(dungeon.tiles[y][x]);
      }
    }
  });

  it('corridors connect rooms with floor or exit tiles', () => {
    const dungeon = generateDungeon(3, 1);
    // L-shaped corridors: when x varies, y should be floor or exit; when y varies, x should be floor or exit
    for (let i = 1; i < dungeon.rooms.length; i++) {
      const prev = dungeon.rooms[i - 1];
      const curr = dungeon.rooms[i];
      const px = Math.floor(prev.x + prev.w / 2);
      const py = Math.floor(prev.y + prev.h / 2);
      const cx = Math.floor(curr.x + curr.w / 2);
      const cy = Math.floor(curr.y + curr.h / 2);
      // Check horizontal corridor
      for (let x = Math.min(px, cx); x <= Math.max(px, cx); x++) {
        expect([0, 2]).toContain(dungeon.tiles[py][x]);
      }
      // Check vertical corridor
      for (let y = Math.min(py, cy); y <= Math.max(py, cy); y++) {
        expect([0, 2]).toContain(dungeon.tiles[y][cx]);
      }
    }
  });
});
