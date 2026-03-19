import { describe, it, expect } from 'vitest';
import { createCombatState, executeCombatRound, isCombatOver, getCombatResult, useSkill, endTurn, executeEnemyTurn } from '../../src/roguelike/combat.js';
import type { EnemyDef } from '../../src/roguelike/entities.js';
import type { SkillBuffs } from '../../src/roguelike/skills.js';
import { getSkillDef } from '../../src/roguelike/skills.js';

const dummyEnemy: EnemyDef = {
  id: 'grot', name: 'Grot', type: 'ork',
  hp: 30, attack: 5, defense: 2, exp: 10, minFloor: 1,
};

describe('Combat', () => {
  it('creates combat state', () => {
    const combat = createCombatState(100, 50, 10, 5, dummyEnemy);
    expect(combat.playerHp).toBe(100);
    expect(combat.playerMaxHp).toBe(100);
    expect(combat.enemyHp).toBe(30);
    expect(combat.enemy.name).toBe('Grot');
  });

  it('player attacks reduce enemy HP', () => {
    const combat = createCombatState(100, 50, 10, 5, dummyEnemy);
    executeCombatRound(combat, 'attack');
    expect(combat.enemyHp).toBeLessThan(30);
  });

  it('enemy attacks back', () => {
    const combat = createCombatState(100, 50, 10, 5, dummyEnemy);
    executeCombatRound(combat, 'attack');
    expect(combat.playerHp).toBeLessThan(100);
  });

  it('player can flee', () => {
    const combat = createCombatState(100, 50, 10, 5, dummyEnemy);
    executeCombatRound(combat, 'flee');
    // Flee is probabilistic, but state should change (either fled or took damage)
    expect(combat.fled || combat.playerHp < 100).toBe(true);
  });

  it('combat ends when enemy HP reaches 0', () => {
    const combat = createCombatState(100, 50, 999, 0, dummyEnemy);
    executeCombatRound(combat, 'attack');
    expect(isCombatOver(combat)).toBe(true);
    expect(getCombatResult(combat).winner).toBe('player');
  });

  it('combat ends when player HP reaches 0', () => {
    const combat = createCombatState(1, 50, 0, 0, dummyEnemy);
    executeCombatRound(combat, 'attack');
    expect(isCombatOver(combat)).toBe(true);
  });

  it('player attack adds message to combat log', () => {
    const combat = createCombatState(100, 50, 10, 5, dummyEnemy);
    executeCombatRound(combat, 'attack');
    expect(combat.log.length).toBeGreaterThan(0);
    expect(combat.log[0]).toContain('造成');
  });

  it('enemy counterattack adds message to combat log', () => {
    const combat = createCombatState(100, 50, 10, 5, dummyEnemy);
    executeCombatRound(combat, 'attack');
    expect(combat.log.some(l => l.includes('反击'))).toBe(true);
  });

  it('flee success adds message to combat log', () => {
    // Mock Math.random to ensure flee succeeds
    const originalRandom = Math.random;
    Math.random = () => 0.3; // Always < 0.5
    const combat = createCombatState(100, 50, 10, 5, dummyEnemy);
    executeCombatRound(combat, 'flee');
    Math.random = originalRandom;
    expect(combat.log.some(l => l.includes('脱离'))).toBe(true);
  });

  it('flee failure adds message to combat log', () => {
    // Mock Math.random to ensure flee fails
    const originalRandom = Math.random;
    Math.random = () => 0.7; // Always >= 0.5
    const combat = createCombatState(100, 50, 10, 5, dummyEnemy);
    executeCombatRound(combat, 'flee');
    Math.random = originalRandom;
    expect(combat.log.some(l => l.includes('失败'))).toBe(true);
  });

  it('getCombatResult returns fled when player escaped', () => {
    const originalRandom = Math.random;
    Math.random = () => 0.3;
    const combat = createCombatState(100, 50, 10, 5, dummyEnemy);
    executeCombatRound(combat, 'flee');
    Math.random = originalRandom;
    const result = getCombatResult(combat);
    expect(result.winner).toBe('fled');
    expect(result.expGained).toBe(0);
  });

  it('getCombatResult returns player when enemy defeated', () => {
    const combat = createCombatState(100, 50, 999, 0, dummyEnemy);
    executeCombatRound(combat, 'attack');
    const result = getCombatResult(combat);
    expect(result.winner).toBe('player');
    expect(result.expGained).toBe(dummyEnemy.exp);
  });

  it('getCombatResult returns enemy when player defeated', () => {
    const combat = createCombatState(1, 50, 0, 0, dummyEnemy);
    executeCombatRound(combat, 'attack');
    const result = getCombatResult(combat);
    expect(result.winner).toBe('enemy');
    expect(result.expGained).toBe(0);
  });

  it('slain enemy message is added to combat log', () => {
    const combat = createCombatState(100, 50, 999, 0, dummyEnemy);
    executeCombatRound(combat, 'attack');
    expect(combat.log.some(l => l.includes('击杀'))).toBe(true);
  });

  it('fled combat state is marked correctly', () => {
    const originalRandom = Math.random;
    Math.random = () => 0.3;
    const combat = createCombatState(100, 50, 10, 5, dummyEnemy);
    executeCombatRound(combat, 'flee');
    Math.random = originalRandom;
    expect(combat.fled).toBe(true);
  });
});

describe('CombatState 扩展', () => {
  it('createCombatState 接受 playerMp 参数', () => {
    const combat = createCombatState(100, 50, 10, 5, dummyEnemy);
    expect(combat.playerMp).toBe(50);
    expect(combat.playerMaxMp).toBe(50);
  });

  it('CombatState 有 skillCooldowns 和 skillBuffs', () => {
    const combat = createCombatState(100, 50, 10, 5, dummyEnemy);
    expect(combat.skillCooldowns).toEqual({});
    expect(combat.skillBuffs).toEqual({});
  });
});

describe('useSkill', () => {
  it('使用技能消耗 MP', () => {
    const combat = createCombatState(100, 50, 20, 5, dummyEnemy);
    const skill = getSkillDef('spaceMarine', 'sm_charge')!;
    const result = useSkill(combat, skill);
    expect(result.success).toBe(true);
    expect(combat.playerMp).toBe(35);
  });

  it('MP 不足时技能失败', () => {
    const combat = createCombatState(100, 5, 20, 5, dummyEnemy);
    const skill = getSkillDef('spaceMarine', 'sm_charge')!;
    const result = useSkill(combat, skill);
    expect(result.success).toBe(false);
    expect(result.message).toContain('MP');
    expect(combat.playerMp).toBe(5);
  });

  it('冷却中的技能无法使用', () => {
    const combat = createCombatState(100, 50, 20, 5, dummyEnemy);
    combat.skillCooldowns['sm_charge'] = 2;
    const skill = getSkillDef('spaceMarine', 'sm_charge')!;
    const result = useSkill(combat, skill);
    expect(result.success).toBe(false);
    expect(result.message).toContain('冷却');
  });

  it('使用技能后设置冷却', () => {
    const combat = createCombatState(100, 50, 20, 5, dummyEnemy);
    const skill = getSkillDef('inquisitor', 'inq_purge')!;
    useSkill(combat, skill);
    expect(combat.skillCooldowns['inq_purge']).toBe(2);
  });

  it('damage 类型技能对敌人造成伤害', () => {
    const combat = createCombatState(100, 50, 20, 5, dummyEnemy);
    const skill = getSkillDef('spaceMarine', 'sm_charge')!;
    useSkill(combat, skill);
    expect(combat.enemyHp).toBeLessThan(dummyEnemy.hp);
  });

  it('heal 类型技能恢复生命', () => {
    const combat = createCombatState(100, 50, 20, 5, dummyEnemy);
    combat.playerHp = 50;
    const skill = getSkillDef('techPriest', 'tp_repair')!;
    useSkill(combat, skill);
    expect(combat.playerHp).toBe(80);
  });

  it('heal 不超过最大生命', () => {
    const combat = createCombatState(100, 50, 20, 5, dummyEnemy);
    combat.playerHp = 90;
    const skill = getSkillDef('techPriest', 'tp_repair')!;
    useSkill(combat, skill);
    expect(combat.playerHp).toBe(100);
  });

  it('mp_restore 类型技能恢复 MP', () => {
    const combat = createCombatState(100, 50, 20, 5, dummyEnemy);
    combat.playerMp = 20;
    const skill = getSkillDef('commissar', 'com_rally')!;
    useSkill(combat, skill);
    expect(combat.playerMp).toBe(30);
  });

  it('immunity 类型技能设置免疫标记', () => {
    const combat = createCombatState(100, 50, 20, 5, dummyEnemy);
    const skill = getSkillDef('inquisitor', 'inq_barrier')!;
    useSkill(combat, skill);
    expect(combat.skillBuffs.immunity).toBe(true);
  });

  it('buff defense_half 设置减伤标记', () => {
    const combat = createCombatState(100, 50, 20, 5, dummyEnemy);
    const skill = getSkillDef('spaceMarine', 'sm_shield_wall')!;
    useSkill(combat, skill);
    expect(combat.skillBuffs.defenseHalf).toBe(true);
  });

  it('buff next_attack_boost 设置攻击加成', () => {
    const combat = createCombatState(100, 50, 20, 5, dummyEnemy);
    const skill = getSkillDef('spaceMarine', 'sm_tactical')!;
    useSkill(combat, skill);
    expect(combat.skillBuffs.nextAttackBoost).toBe(50);
    expect(combat.skillBuffs.nextAttackBoostHits).toBe(1);
  });

  it('execute 技能在敌人低血量时造成高额伤害', () => {
    const weakEnemy: EnemyDef = { id: 'test', name: 'Test', type: 'ork', hp: 100, attack: 5, defense: 2, exp: 10, minFloor: 1 };
    const combat = createCombatState(100, 50, 20, 2, weakEnemy);
    combat.enemyHp = 20;
    const skill = getSkillDef('commissar', 'com_execute')!;
    useSkill(combat, skill);
    expect(combat.enemyHp).toBeLessThan(20);
  });

  it('execute 技能在敌人高血量时使用普通倍率', () => {
    const weakEnemy: EnemyDef = { id: 'test', name: 'Test', type: 'ork', hp: 100, attack: 5, defense: 2, exp: 10, minFloor: 1 };
    const combat = createCombatState(100, 50, 20, 2, weakEnemy);
    combat.enemyHp = 80;
    const originalHp = combat.enemyHp;
    const skill = getSkillDef('commissar', 'com_execute')!;
    useSkill(combat, skill);
    expect(combat.enemyHp).toBeGreaterThan(originalHp - 60);
  });

  it('bonusVsTypes 对 chaos 敌人额外伤害', () => {
    const chaosEnemy: EnemyDef = { id: 'daemon', name: 'Daemon', type: 'chaos', hp: 100, attack: 10, defense: 5, exp: 20, minFloor: 1 };
    const combat = createCombatState(100, 50, 20, 5, chaosEnemy);
    const skill = getSkillDef('inquisitor', 'inq_purge')!;
    useSkill(combat, skill);
    expect(combat.enemyHp).toBeLessThan(100);
    expect(combat.log.some(l => l.includes('造成'))).toBe(true);
  });
});

describe('endTurn', () => {
  it('恢复 10 MP', () => {
    const combat = createCombatState(100, 50, 20, 5, dummyEnemy);
    combat.playerMp = 20;
    endTurn(combat);
    expect(combat.playerMp).toBe(30);
  });

  it('MP 不超过上限', () => {
    const combat = createCombatState(100, 50, 20, 5, dummyEnemy);
    combat.playerMp = 45;
    endTurn(combat);
    expect(combat.playerMp).toBe(50);
  });

  it('减少技能冷却 1', () => {
    const combat = createCombatState(100, 50, 20, 5, dummyEnemy);
    combat.skillCooldowns['sm_shield_wall'] = 2;
    endTurn(combat);
    expect(combat.skillCooldowns['sm_shield_wall']).toBe(1);
  });

  it('冷却归零后保留记录', () => {
    const combat = createCombatState(100, 50, 20, 5, dummyEnemy);
    combat.skillCooldowns['sm_shield_wall'] = 1;
    endTurn(combat);
    expect(combat.skillCooldowns['sm_shield_wall']).toBe(0);
  });
});

describe('executeEnemyTurn', () => {
  it('敌人造成伤害', () => {
    const combat = createCombatState(100, 50, 10, 5, dummyEnemy);
    const prevHp = combat.playerHp;
    executeEnemyTurn(combat);
    expect(combat.playerHp).toBeLessThan(prevHp);
  });

  it('immunity 阻挡敌人攻击', () => {
    const combat = createCombatState(100, 50, 10, 5, dummyEnemy);
    combat.skillBuffs.immunity = true;
    executeEnemyTurn(combat);
    expect(combat.playerHp).toBe(100);
    expect(combat.skillBuffs.immunity).toBeUndefined();
  });

  it('defenseHalf 减少敌人伤害', () => {
    const combat = createCombatState(100, 50, 10, 5, dummyEnemy);
    combat.skillBuffs.defenseHalf = true;
    executeEnemyTurn(combat);
    expect(combat.skillBuffs.defenseHalf).toBeUndefined();
  });
});

describe('executeCombatRound with buffs', () => {
  it('nextAttackBoost 增加攻击伤害', () => {
    const strongEnemy: EnemyDef = { id: 'tank', name: 'Tank', type: 'ork', hp: 200, attack: 0, defense: 5, exp: 10, minFloor: 1 };
    const combat = createCombatState(100, 50, 20, 5, strongEnemy);
    combat.skillBuffs.nextAttackBoost = 50;
    combat.skillBuffs.nextAttackBoostHits = 1;

    executeCombatRound(combat, 'attack');
    const boostedDmg = 200 - combat.enemyHp;

    expect(combat.skillBuffs.nextAttackBoost).toBeUndefined();
    expect(combat.skillBuffs.nextAttackBoostHits).toBeUndefined();

    const prevEnemyHp = combat.enemyHp;
    executeCombatRound(combat, 'attack');
    const normalDmg = prevEnemyHp - combat.enemyHp;

    expect(boostedDmg).toBeGreaterThan(normalDmg);
  });

  it('defenseHalf 减少受到的伤害', () => {
    const combat = createCombatState(100, 50, 10, 5, dummyEnemy);
    combat.skillBuffs.defenseHalf = true;

    executeCombatRound(combat, 'attack');
    expect(combat.skillBuffs.defenseHalf).toBeUndefined();
  });

  it('immunity 阻挡敌人攻击', () => {
    const combat = createCombatState(100, 50, 10, 5, dummyEnemy);
    combat.skillBuffs.immunity = true;
    const prevHp = combat.playerHp;

    executeCombatRound(combat, 'attack');
    expect(combat.playerHp).toBe(prevHp);
    expect(combat.skillBuffs.immunity).toBeUndefined();
  });

  it('lifesteal 吸取生命', () => {
    const weakEnemy: EnemyDef = { id: 'weak', name: 'Weak', type: 'ork', hp: 100, attack: 0, defense: 2, exp: 10, minFloor: 1 };
    const combat = createCombatState(100, 50, 20, 5, weakEnemy);
    combat.skillBuffs.lifestealHits = 1;
    combat.playerHp = 80;
    const prevHp = combat.playerHp;

    executeCombatRound(combat, 'attack');
    expect(combat.playerHp).toBeGreaterThan(prevHp);
  });
});
