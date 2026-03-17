import { TILE_SIZE, TILE_COLORS } from './tileset.js';
import type { Dungeon } from '../roguelike/dungeonGen.js';
import type { FogState } from '../roguelike/fogOfWar.js';

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cameraX = 0;
  private cameraY = 0;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  clear(): void {
    this.ctx.fillStyle = TILE_COLORS.fog;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  renderDungeon(dungeon: Dungeon, fog: FogState[][], playerPos: [number, number], enemies: { x: number; y: number; isBoss?: boolean; hp: number }[], items: { x: number; y: number }[]): void {
    this.clear();

    const viewW = this.canvas.width;
    const viewH = this.canvas.height;
    this.cameraX = playerPos[0] * TILE_SIZE - viewW / 2;
    this.cameraY = playerPos[1] * TILE_SIZE - viewH / 2;

    this.ctx.save();
    this.ctx.translate(-this.cameraX, -this.cameraY);

    for (let y = 0; y < dungeon.height; y++) {
      for (let x = 0; x < dungeon.width; x++) {
        const fogState = fog[y][x];
        if (fogState === 'hidden') continue;
        const tile = dungeon.tiles[y][x];
        let color: string;
        if (tile === 1) color = TILE_COLORS.wall;
        else if (tile === 2) color = TILE_COLORS.exit;
        else color = TILE_COLORS.floor;

        if (fogState === 'seen') this.ctx.globalAlpha = 0.4;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        this.ctx.globalAlpha = 1.0;
      }
    }

    for (const pos of items) {
      if (fog[pos.y][pos.x] !== 'visible') continue;
      this.ctx.fillStyle = TILE_COLORS.item;
      this.ctx.fillRect(pos.x * TILE_SIZE + 6, pos.y * TILE_SIZE + 6, TILE_SIZE - 12, TILE_SIZE - 12);
    }

    for (const pos of enemies) {
      if (pos.hp <= 0) continue;
      if (fog[pos.y][pos.x] !== 'visible') continue;
      this.ctx.fillStyle = pos.isBoss ? TILE_COLORS.boss : TILE_COLORS.enemy;
      this.ctx.fillRect(pos.x * TILE_SIZE + 4, pos.y * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    }

    this.ctx.fillStyle = TILE_COLORS.player;
    this.ctx.fillRect(playerPos[0] * TILE_SIZE + 2, playerPos[1] * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);

    this.ctx.restore();
  }
}
