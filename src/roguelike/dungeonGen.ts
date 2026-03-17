import type { EnemyDef } from './entities.js';
import { getEnemiesForFloor } from './entities.js';
import type { ItemDef } from './items.js';
import { getItems } from './items.js';

export type Tile = 0 | 1 | 2; // 0=floor, 1=wall, 2=exit

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  enemies: { def: EnemyDef; x: number; y: number }[];
  items: { def: ItemDef; x: number; y: number }[];
}

export interface Dungeon {
  width: number;
  height: number;
  tiles: Tile[][];
  rooms: Room[];
  startPos: [number, number];
  exitPos: [number, number];
  floor: number;
  dangerLevel: number;
}

const BASE_WIDTH = 40;
const BASE_HEIGHT = 30;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateDungeon(floor: number, dangerLevel: number): Dungeon {
  const width = BASE_WIDTH + floor * 5;
  const height = BASE_HEIGHT + floor * 3;
  const tiles: Tile[][] = Array.from({ length: height }, () => Array(width).fill(1) as Tile[]);
  const rooms: Room[] = [];
  const numRooms = 5 + floor * 2;

  for (let attempt = 0; attempt < numRooms * 10 && rooms.length < numRooms; attempt++) {
    const rw = randomInt(5, 10);
    const rh = randomInt(4, 8);
    const rx = randomInt(1, width - rw - 1);
    const ry = randomInt(1, height - rh - 1);

    const overlaps = rooms.some(r =>
      rx < r.x + r.w + 1 && rx + rw + 1 > r.x &&
      ry < r.y + r.h + 1 && ry + rh + 1 > r.y
    );
    if (overlaps) continue;

    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        tiles[y][x] = 0;
      }
    }

    const enemies = getEnemiesForFloor(floor);
    const items = getItems();
    const roomEnemies: Room['enemies'] = [];
    const roomItems: Room['items'] = [];

    if (rooms.length > 0) {
      const numEnemies = randomInt(1, Math.min(3, floor));
      for (let i = 0; i < numEnemies && enemies.length > 0; i++) {
        const def = enemies[randomInt(0, enemies.length - 1)];
        roomEnemies.push({ def, x: randomInt(rx + 1, rx + rw - 2), y: randomInt(ry + 1, ry + rh - 2) });
      }
    }

    if (Math.random() < 0.3 && items.length > 0) {
      const def = items[randomInt(0, items.length - 1)];
      roomItems.push({ def, x: randomInt(rx + 1, rx + rw - 2), y: randomInt(ry + 1, ry + rh - 2) });
    }

    rooms.push({ x: rx, y: ry, w: rw, h: rh, enemies: roomEnemies, items: roomItems });
  }

  // Connect rooms with corridors
  for (let i = 1; i < rooms.length; i++) {
    const prev = rooms[i - 1];
    const curr = rooms[i];
    const px = Math.floor(prev.x + prev.w / 2);
    const py = Math.floor(prev.y + prev.h / 2);
    const cx = Math.floor(curr.x + curr.w / 2);
    const cy = Math.floor(curr.y + curr.h / 2);
    for (let x = Math.min(px, cx); x <= Math.max(px, cx); x++) tiles[py][x] = 0;
    for (let y = Math.min(py, cy); y <= Math.max(py, cy); y++) tiles[y][cx] = 0;
  }

  const lastRoom = rooms[rooms.length - 1];
  const exitX = Math.floor(lastRoom.x + lastRoom.w / 2);
  const exitY = Math.floor(lastRoom.y + lastRoom.h / 2);
  tiles[exitY][exitX] = 2;

  const firstRoom = rooms[0];
  const startX = Math.floor(firstRoom.x + firstRoom.w / 2);
  const startY = Math.floor(firstRoom.y + firstRoom.h / 2);

  return { width, height, tiles, rooms, startPos: [startX, startY], exitPos: [exitX, exitY], floor, dangerLevel };
}
