import type { EnemyDef } from './entities.js';
import type { SkillDef } from './skills.js';
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

function calcDamage(attack: number, defense: number, multiplier: number = 1): number {
  const base = Math.max(1, attack - defense);
  const randomized = base + Math.floor(Math.random() * 3) - 1;
  return Math.max(1, Math.floor(randomized * multiplier));
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
      let dmg = calcDamage(state.enemy.attack, state.playerDefense);
      if (state.skillBuffs.defenseHalf) {
        dmg = Math.floor(dmg / 2);
        state.skillBuffs.defenseHalf = undefined;
      }
      state.playerHp = Math.max(0, state.playerHp - dmg);
      state.log.push(`${state.enemy.name} 造成了 ${dmg} 点伤害！`);
    }
    return;
  }

  // Player attacks
  let multiplier = 1;
  if (state.skillBuffs.nextAttackBoost && (state.skillBuffs.nextAttackBoostHits ?? 0) > 0) {
    multiplier += state.skillBuffs.nextAttackBoost / 100;
    state.skillBuffs.nextAttackBoostHits!--;
    if (state.skillBuffs.nextAttackBoostHits <= 0) {
      state.skillBuffs.nextAttackBoost = undefined;
      state.skillBuffs.nextAttackBoostHits = undefined;
    }
  }

  const playerDmg = calcDamage(state.playerAttack, state.enemy.defense, multiplier);

  // Lifesteal
  if (state.skillBuffs.lifestealHits && state.skillBuffs.lifestealHits > 0) {
    const stealPercent = state.skillBuffs.lifestealPercent || 50;
    const healAmount = Math.floor(playerDmg * (stealPercent / 100));
    state.playerHp = Math.min(state.playerMaxHp, state.playerHp + healAmount);
    state.log.push(`吸取了 ${healAmount} 点生命！`);
    state.skillBuffs.lifestealHits--;
    if (state.skillBuffs.lifestealHits <= 0) {
      state.skillBuffs.lifestealHits = undefined;
    }
  }

  state.enemyHp = Math.max(0, state.enemyHp - playerDmg);
  state.log.push(`你对 ${state.enemy.name} 造成了 ${playerDmg} 点伤害！`);

  if (state.enemyHp <= 0) {
    state.log.push(`${state.enemy.name} 已被击杀！帝皇庇佑！`);
    return;
  }

  // Enemy counterattacks
  executeEnemyTurn(state);
}

export function useSkill(
  state: CombatState,
  skill: SkillDef,
): { success: boolean; message: string } {
  if (state.playerMp < skill.mpCost) {
    return { success: false, message: `MP 不足，需要 ${skill.mpCost} MP` };
  }
  if ((state.skillCooldowns[skill.id] || 0) > 0) {
    return { success: false, message: `${skill.name} 还在冷却中` };
  }

  state.playerMp -= skill.mpCost;
  state.skillCooldowns[skill.id] = skill.cooldown;

  switch (skill.effect.type) {
    case 'damage': {
      const { multiplier, fixedBonusDamage = 0, bonusVsTypes, bonusMultiplier = 0 } = skill.effect;
      let effectiveMultiplier = multiplier;
      if (bonusVsTypes?.includes(state.enemy.type)) {
        effectiveMultiplier += bonusMultiplier;
      }
      const baseDmg = calcDamage(state.playerAttack, state.enemy.defense, effectiveMultiplier);
      const totalDmg = baseDmg + fixedBonusDamage;
      state.enemyHp = Math.max(0, state.enemyHp - totalDmg);
      state.log.push(`${skill.icon} ${skill.name}！对 ${state.enemy.name} 造成了 ${totalDmg} 点伤害！`);
      break;
    }
    case 'execute': {
      const { threshold, multiplier } = skill.effect;
      const effectiveMultiplier = (state.enemyHp / state.enemyMaxHp) < (threshold / 100) ? multiplier : 1.0;
      const dmg = calcDamage(state.playerAttack, state.enemy.defense, effectiveMultiplier);
      state.enemyHp = Math.max(0, state.enemyHp - dmg);
      state.log.push(`${skill.icon} ${skill.name}！对 ${state.enemy.name} 造成了 ${dmg} 点伤害！`);
      break;
    }
    case 'buff': {
      const { buffType, value, duration } = skill.effect;
      switch (buffType) {
        case 'defense_half':
          state.skillBuffs.defenseHalf = true;
          state.log.push(`${skill.icon} ${skill.name}！本回合受伤减半！`);
          break;
        case 'next_attack_boost':
          state.skillBuffs.nextAttackBoost = value;
          state.skillBuffs.nextAttackBoostHits = duration;
          state.log.push(`${skill.icon} ${skill.name}！接下来 ${duration} 次攻击伤害 +${value}%！`);
          break;
        case 'lifesteal':
          state.skillBuffs.lifestealHits = (state.skillBuffs.lifestealHits || 0) + duration;
          state.skillBuffs.lifestealPercent = value || 50;
          state.log.push(`${skill.icon} ${skill.name}！接下来 ${duration} 次攻击吸取生命！`);
          break;
      }
      break;
    }
    case 'immunity':
      state.skillBuffs.immunity = true;
      state.log.push(`${skill.icon} ${skill.name}！免疫下一次攻击！`);
      break;
    case 'heal': {
      const healAmount = Math.floor(state.playerMaxHp * (skill.effect.percent / 100));
      state.playerHp = Math.min(state.playerMaxHp, state.playerHp + healAmount);
      state.log.push(`${skill.icon} ${skill.name}！恢复了 ${healAmount} 点生命！`);
      break;
    }
    case 'mp_restore': {
      const restoreAmount = Math.min(skill.effect.amount, state.playerMaxMp - state.playerMp);
      state.playerMp += restoreAmount;
      state.log.push(`${skill.icon} ${skill.name}！恢复了 ${restoreAmount} 点 MP！`);
      break;
    }
  }

  return { success: true, message: '' };
}

export function endTurn(state: CombatState): void {
  state.playerMp = Math.min(state.playerMaxMp, state.playerMp + 10);
  for (const skillId in state.skillCooldowns) {
    if (state.skillCooldowns[skillId] > 0) {
      state.skillCooldowns[skillId]--;
    }
  }
}

export function executeEnemyTurn(state: CombatState): void {
  if (state.skillBuffs.immunity) {
    state.skillBuffs.immunity = undefined;
    state.log.push('精神壁垒抵挡了攻击！');
    return;
  }

  let enemyDmg = calcDamage(state.enemy.attack, state.playerDefense);
  if (state.skillBuffs.defenseHalf) {
    enemyDmg = Math.floor(enemyDmg / 2);
    state.skillBuffs.defenseHalf = undefined;
  }
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
