import type { EnemyDef } from './entities.js';
import type { SkillBuffs } from './skills.js';

export interface CombatState {
  playerHp: number;
  playerMaxHp: number;
  playerAttack: number;
  playerDefense: number;
  enemy: EnemyDef;
  enemyHp: number;
  enemyMaxHp: number;
  fled: boolean;
  log: string[];
  playerMp: number;
  playerMaxMp: number;
  skillCooldowns: Record<string, number>;
  skillBuffs: SkillBuffs;
}

export type CombatAction = 'attack' | 'flee';

function calcDamage(attack: number, defense: number): number {
  const base = Math.max(1, attack - defense);
  return Math.max(1, base + Math.floor(Math.random() * 3) - 1);
}

export function createCombatState(
  playerHp: number, playerMp: number, playerAttack: number, playerDefense: number, enemy: EnemyDef
): CombatState {
  return {
    playerHp, playerMaxHp: playerHp,
    playerMp, playerMaxMp: playerMp,
    playerAttack, playerDefense,
    enemy: { ...enemy }, enemyHp: enemy.hp, enemyMaxHp: enemy.hp,
    fled: false, log: [],
    skillCooldowns: {},
    skillBuffs: {},
  };
}

export function executeCombatRound(state: CombatState, action: CombatAction): void {
  if (action === 'flee') {
    state.fled = Math.random() < 0.5;
    if (state.fled) {
      state.log.push('你脱离战斗撤退了！');
    } else {
      state.log.push('撤退失败！');
      const dmg = calcDamage(state.enemy.attack, state.playerDefense);
      state.playerHp = Math.max(0, state.playerHp - dmg);
      state.log.push(`${state.enemy.name} 造成了 ${dmg} 点伤害！`);
    }
    return;
  }

  // Player attacks
  const playerDmg = calcDamage(state.playerAttack, state.enemy.defense);
  state.enemyHp = Math.max(0, state.enemyHp - playerDmg);
  state.log.push(`你对 ${state.enemy.name} 造成了 ${playerDmg} 点伤害！`);

  if (state.enemyHp <= 0) {
    state.log.push(`${state.enemy.name} 已被击杀！帝皇庇佑！`);
    return;
  }

  // Enemy counterattacks
  const enemyDmg = calcDamage(state.enemy.attack, state.playerDefense);
  state.playerHp = Math.max(0, state.playerHp - enemyDmg);
  state.log.push(`${state.enemy.name} 反击造成了 ${enemyDmg} 点伤害！`);
}

export function isCombatOver(state: CombatState): boolean {
  return state.playerHp <= 0 || state.enemyHp <= 0 || state.fled;
}

export function getCombatResult(state: CombatState): { winner: 'player' | 'enemy' | 'fled'; expGained: number } {
  if (state.fled) return { winner: 'fled', expGained: 0 };
  if (state.enemyHp <= 0) return { winner: 'player', expGained: state.enemy.exp };
  return { winner: 'enemy', expGained: 0 };
}
