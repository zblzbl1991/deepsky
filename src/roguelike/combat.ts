import type { EnemyDef } from './entities.js';

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
}

export type CombatAction = 'attack' | 'flee';

function calcDamage(attack: number, defense: number): number {
  const base = Math.max(1, attack - defense);
  return Math.max(1, base + Math.floor(Math.random() * 3) - 1);
}

export function createCombatState(
  playerHp: number, playerAttack: number, playerDefense: number, enemy: EnemyDef
): CombatState {
  return {
    playerHp, playerMaxHp: playerHp, playerAttack, playerDefense,
    enemy: { ...enemy }, enemyHp: enemy.hp, enemyMaxHp: enemy.hp,
    fled: false, log: [],
  };
}

export function executeCombatRound(state: CombatState, action: CombatAction): void {
  if (action === 'flee') {
    state.fled = Math.random() < 0.5;
    if (state.fled) {
      state.log.push('You disengaged and retreated!');
    } else {
      state.log.push('Failed to flee!');
      const dmg = calcDamage(state.enemy.attack, state.playerDefense);
      state.playerHp = Math.max(0, state.playerHp - dmg);
      state.log.push(`${state.enemy.name} strikes for ${dmg} damage!`);
    }
    return;
  }

  // Player attacks
  const playerDmg = calcDamage(state.playerAttack, state.enemy.defense);
  state.enemyHp = Math.max(0, state.enemyHp - playerDmg);
  state.log.push(`You strike ${state.enemy.name} for ${playerDmg} damage!`);

  if (state.enemyHp <= 0) {
    state.log.push(`${state.enemy.name} is slain! For the Emperor!`);
    return;
  }

  // Enemy counterattacks
  const enemyDmg = calcDamage(state.enemy.attack, state.playerDefense);
  state.playerHp = Math.max(0, state.playerHp - enemyDmg);
  state.log.push(`${state.enemy.name} retaliates for ${enemyDmg} damage!`);
}

export function isCombatOver(state: CombatState): boolean {
  return state.playerHp <= 0 || state.enemyHp <= 0 || state.fled;
}

export function getCombatResult(state: CombatState): { winner: 'player' | 'enemy' | 'fled'; expGained: number } {
  if (state.fled) return { winner: 'fled', expGained: 0 };
  if (state.enemyHp <= 0) return { winner: 'player', expGained: state.enemy.exp };
  return { winner: 'enemy', expGained: 0 };
}
