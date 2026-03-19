import { describe, it, expect } from 'vitest';
import { createCombatState, executeCombatRound, isCombatOver, getCombatResult } from '../../src/roguelike/combat.js';
import type { EnemyDef } from '../../src/roguelike/entities.js';
import type { SkillBuffs } from '../../src/roguelike/skills.js';

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
