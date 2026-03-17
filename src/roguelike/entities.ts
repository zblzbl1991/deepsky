export interface EnemyDef {
  id: string;
  name: string;
  type: string;
  hp: number;
  attack: number;
  defense: number;
  exp: number;
  minFloor: number;
  isBoss?: boolean;
}

import enemiesData from '../data/enemies.json' assert { type: 'json' };

export function getEnemies(): EnemyDef[] {
  return enemiesData;
}

export function getEnemiesForFloor(floor: number): EnemyDef[] {
  return enemiesData.filter((e: EnemyDef) => e.minFloor <= floor && !e.isBoss);
}

export function getBossForFloor(floor: number): EnemyDef | undefined {
  return enemiesData.find((e: EnemyDef) => e.isBoss && e.minFloor <= floor);
}
