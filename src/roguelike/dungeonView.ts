import type { GameState } from '../game/gameState.js';
import type { Dungeon } from './dungeonGen.js';
import { generateDungeon } from './dungeonGen.js';
import type { EnemyDef } from './entities.js';
import { createCombatState, executeCombatRound, isCombatOver, getCombatResult } from './combat.js';
import { createFogMap, revealAround, fadeVisibility } from './fogOfWar.js';
import type { FogState } from './fogOfWar.js';

export interface DungeonRun {
  dungeon: Dungeon;
  playerPos: [number, number];
  fog: FogState[][];
  playerHp: number;
  playerMaxHp: number;
  playerAttack: number;
  playerDefense: number;
  exp: number;
  loot: string[];
  currentFloor: number;
  maxFloors: number;
  inCombat: boolean;
  combatState: ReturnType<typeof createCombatState> | null;
  combatLog: string[];
  activeEnemies: { def: EnemyDef; x: number; y: number; hp: number; maxHp: number; isBoss?: boolean }[];
  activeItems: { id: string; x: number; y: number }[];
  gameOver: boolean;
  victory: boolean;
}

export function startDungeonRun(state: GameState, _planetId: string, maxFloors: number): DungeonRun {
  const dungeon = generateDungeon(1, 1);
  return {
    dungeon,
    playerPos: [...dungeon.startPos],
    fog: createFogMap(dungeon.width, dungeon.height),
    playerHp: 100 + state.player.level * 10,
    playerMaxHp: 100 + state.player.level * 10,
    playerAttack: 10 + state.player.level * 2,
    playerDefense: 3 + state.player.level,
    exp: 0,
    loot: [],
    currentFloor: 1,
    maxFloors,
    inCombat: false,
    combatState: null,
    combatLog: [],
    activeEnemies: [],
    activeItems: [],
    gameOver: false,
    victory: false,
  };
}

export function enterFloor(run: DungeonRun, floor: number): void {
  const dungeon = generateDungeon(floor, 1);
  run.dungeon = dungeon;
  run.playerPos = [...dungeon.startPos];
  run.fog = createFogMap(dungeon.width, dungeon.height);
  run.currentFloor = floor;
  run.activeEnemies = dungeon.rooms.flatMap(r => r.enemies.map(e => ({
    ...e,
    hp: e.def.hp,
    maxHp: e.def.hp,
    isBoss: e.def.isBoss,
  })));
  run.activeItems = dungeon.rooms.flatMap(r => r.items.map(i => ({ id: i.def.id, x: i.x, y: i.y })));
  revealAround(run.fog, run.playerPos[0], run.playerPos[1], 4);
}

export function movePlayer(run: DungeonRun, dx: number, dy: number): void {
  if (run.inCombat || run.gameOver) return;
  const [px, py] = run.playerPos;
  const nx = px + dx;
  const ny = py + dy;
  if (ny < 0 || ny >= run.dungeon.height || nx < 0 || nx >= run.dungeon.width) return;
  if (run.dungeon.tiles[ny][nx] === 1) return;

  const enemy = run.activeEnemies.find(e => e.x === nx && e.y === ny && e.hp > 0);
  if (enemy) {
    startCombat(run, enemy);
    return;
  }

  fadeVisibility(run.fog);
  run.playerPos = [nx, ny];
  revealAround(run.fog, nx, ny, 4);

  const itemIdx = run.activeItems.findIndex(i => i.x === nx && i.y === ny);
  if (itemIdx >= 0) {
    run.loot.push(run.activeItems[itemIdx].id);
    run.combatLog.push(`Picked up: ${run.activeItems[itemIdx].id}`);
    run.activeItems.splice(itemIdx, 1);
  }

  if (run.dungeon.tiles[ny][nx] === 2) {
    if (run.currentFloor < run.maxFloors) {
      enterFloor(run, run.currentFloor + 1);
      run.combatLog.push(`Descending to floor ${run.currentFloor}...`);
    } else {
      run.gameOver = true;
      run.victory = true;
      run.combatLog.push('Expedition complete! For the Emperor!');
    }
  }
}

function startCombat(run: DungeonRun, enemy: { def: EnemyDef; x: number; y: number; hp: number; maxHp: number; isBoss?: boolean }): void {
  run.inCombat = true;
  run.combatState = createCombatState(run.playerHp, run.playerAttack, run.playerDefense, enemy.def);
  run.combatLog = [];
}

export function playerAttack(run: DungeonRun): void {
  if (!run.combatState || !run.inCombat) return;
  executeCombatRound(run.combatState, 'attack');
  run.combatLog.push(...run.combatState.log);
  run.combatState.log = [];
  if (isCombatOver(run.combatState)) resolveCombat(run);
}

export function playerFlee(run: DungeonRun): void {
  if (!run.combatState || !run.inCombat) return;
  executeCombatRound(run.combatState, 'flee');
  run.combatLog.push(...run.combatState.log);
  run.combatState.log = [];
  if (isCombatOver(run.combatState)) resolveCombat(run);
}

function resolveCombat(run: DungeonRun): void {
  if (!run.combatState) return;
  const result = getCombatResult(run.combatState);
  run.playerHp = run.combatState.playerHp;
  if (result.winner === 'player') {
    const enemy = run.activeEnemies.find(e => e.def.id === run.combatState!.enemy.id && e.hp > 0);
    if (enemy) enemy.hp = 0;
    run.exp += result.expGained;
    run.combatLog.push(`Gained ${result.expGained} EXP!`);
  }
  if (result.winner === 'enemy' || run.playerHp <= 0) {
    run.gameOver = true;
    run.victory = false;
    run.combatLog.push('You have fallen. The Emperor protects.');
  }
  run.inCombat = false;
  run.combatState = null;
}
