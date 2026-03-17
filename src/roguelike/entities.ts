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

const enemies: EnemyDef[] = enemiesData as EnemyDef[];

export function getEnemies(): EnemyDef[] {
  return enemies;
}

export function getEnemiesForFloor(floor: number): EnemyDef[] {
  return enemies.filter((e) => e.minFloor <= floor && !e.isBoss);
}

export function getBossForFloor(floor: number): EnemyDef | undefined {
  return enemies.find((e) => e.isBoss && e.minFloor <= floor);
}
