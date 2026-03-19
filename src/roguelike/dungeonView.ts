import type { GameState } from '../game/gameState.js';
import type { Dungeon } from './dungeonGen.js';
import { generateDungeon } from './dungeonGen.js';
import type { EnemyDef } from './entities.js';
import { createCombatState, executeCombatRound, isCombatOver, getCombatResult, useSkill, executeEnemyTurn, endTurn } from './combat.js';
import { createFogMap, revealAround, fadeVisibility } from './fogOfWar.js';
import type { FogState } from './fogOfWar.js';
import { getSkillsForClass, getSkillDef } from './skills.js';
import type { SkillBuffs } from './skills.js';

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
  playerMp: number;
  playerMaxMp: number;
  skillCooldowns: Record<string, number>;
  skillBuffs: SkillBuffs;
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
    playerMp: 50,
    playerMaxMp: 50,
    skillCooldowns: {},
    skillBuffs: {},
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
    run.combatLog.push(`拾取: ${run.activeItems[itemIdx].id}`);
    run.activeItems.splice(itemIdx, 1);
  }

  if (run.dungeon.tiles[ny][nx] === 2) {
    if (run.currentFloor < run.maxFloors) {
      enterFloor(run, run.currentFloor + 1);
      run.combatLog.push(`下降到第 ${run.currentFloor} 层...`);
    } else {
      run.gameOver = true;
      run.victory = true;
      run.combatLog.push('远征完成！帝皇庇佑！');
    }
  }
}

function startCombat(run: DungeonRun, enemy: { def: EnemyDef; x: number; y: number; hp: number; maxHp: number; isBoss?: boolean }): void {
  run.inCombat = true;
  run.combatState = createCombatState(run.playerHp, run.playerMp, run.playerAttack, run.playerDefense, enemy.def);
  run.skillCooldowns = {};
  run.skillBuffs = {};
  run.combatLog = [];
}

export function playerAttack(run: DungeonRun): void {
  if (!run.combatState || !run.inCombat) return;
  executeCombatRound(run.combatState, 'attack');
  run.combatLog.push(...run.combatState.log);
  run.combatState.log = [];
  if (isCombatOver(run.combatState)) {
    resolveCombat(run);
  } else {
    endTurn(run.combatState);
    run.playerMp = run.combatState.playerMp;
    run.skillCooldowns = run.combatState.skillCooldowns;
  }
}

export function playerFlee(run: DungeonRun): void {
  if (!run.combatState || !run.inCombat) return;
  executeCombatRound(run.combatState, 'flee');
  run.combatLog.push(...run.combatState.log);
  run.combatState.log = [];
  if (isCombatOver(run.combatState)) {
    resolveCombat(run);
  }
}

export function useSkillById(run: DungeonRun, classId: string, skillId: string): void {
  if (!run.inCombat || !run.combatState) return;

  const skill = getSkillDef(classId, skillId);
  if (!skill) return;

  const result = useSkill(run.combatState, skill);
  run.combatLog.push(...run.combatState.log);
  run.combatState.log = [];

  if (!result.success) {
    run.combatLog.push(result.message);
    return;
  }

  // Sync MP and cooldowns to DungeonRun
  run.playerMp = run.combatState.playerMp;
  run.skillCooldowns = run.combatState.skillCooldowns;
  run.skillBuffs = run.combatState.skillBuffs;

  if (isCombatOver(run.combatState)) {
    resolveCombat(run);
  } else {
    // Enemy turn
    executeEnemyTurn(run.combatState);
    run.combatLog.push(...run.combatState.log);
    run.combatState.log = [];

    if (isCombatOver(run.combatState)) {
      resolveCombat(run);
    } else {
      // Turn end: MP regen, cooldown tick
      endTurn(run.combatState);
      run.playerMp = run.combatState.playerMp;
      run.skillCooldowns = run.combatState.skillCooldowns;
    }
  }
}

function resolveCombat(run: DungeonRun): void {
  if (!run.combatState) return;
  const result = getCombatResult(run.combatState);
  run.playerHp = run.combatState.playerHp;
  if (result.winner === 'player') {
    const enemy = run.activeEnemies.find(e => e.def.id === run.combatState!.enemy.id && e.hp > 0);
    if (enemy) enemy.hp = 0;
    run.exp += result.expGained;
    run.combatLog.push(`获得 ${result.expGained} 经验！`);
  }
  if (result.winner === 'enemy' || run.playerHp <= 0) {
    run.gameOver = true;
    run.victory = false;
    run.combatLog.push('你已经倒下。帝皇庇佑。');
  }
  run.inCombat = false;
  run.combatState = null;
}
