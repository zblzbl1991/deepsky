export type FogState = 'hidden' | 'seen' | 'visible';

export function createFogMap(width: number, height: number): FogState[][] {
  return Array.from({ length: height }, () =>
    Array(width).fill('hidden') as FogState[]
  );
}

export function revealAround(fog: FogState[][], px: number, py: number, radius: number): void {
  for (let y = py - radius; y <= py + radius; y++) {
    for (let x = px - radius; x <= px + radius; x++) {
      if (x < 0 || y < 0 || y >= fog.length || x >= fog[0].length) continue;
      if (Math.sqrt((x - px) ** 2 + (y - py) ** 2) <= radius) {
        fog[y][x] = 'visible';
      }
    }
  }
}

export function fadeVisibility(fog: FogState[][]): void {
  for (let y = 0; y < fog.length; y++) {
    for (let x = 0; x < fog[y].length; x++) {
      if (fog[y][x] === 'visible') fog[y][x] = 'seen';
    }
  }
}
