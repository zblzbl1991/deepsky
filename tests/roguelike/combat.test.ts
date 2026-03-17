import { describe, it, expect } from 'vitest';
import { createCombatState, executeCombatRound, isCombatOver, getCombatResult } from '../../src/roguelike/combat.js';
import type { EnemyDef } from '../../src/roguelike/entities.js';

const dummyEnemy: EnemyDef = {
  id: 'grot', name: 'Grot', type: 'ork',
  hp: 30, attack: 5, defense: 2, exp: 10, minFloor: 1,
};

describe('Combat', () => {
  it('creates combat state', () => {
    const combat = createCombatState(100, 10, 5, dummyEnemy);
    expect(combat.playerHp).toBe(100);
    expect(combat.playerMaxHp).toBe(100);
    expect(combat.enemyHp).toBe(30);
    expect(combat.enemy.name).toBe('Grot');
  });

  it('player attacks reduce enemy HP', () => {
    const combat = createCombatState(100, 10, 5, dummyEnemy);
    executeCombatRound(combat, 'attack');
    expect(combat.enemyHp).toBeLessThan(30);
  });

  it('enemy attacks back', () => {
    const combat = createCombatState(100, 10, 5, dummyEnemy);
    executeCombatRound(combat, 'attack');
    expect(combat.playerHp).toBeLessThan(100);
  });

  it('player can flee', () => {
    const combat = createCombatState(100, 10, 5, dummyEnemy);
    executeCombatRound(combat, 'flee');
    // Flee is probabilistic, but state should change (either fled or took damage)
    expect(combat.fled || combat.playerHp < 100).toBe(true);
  });

  it('combat ends when enemy HP reaches 0', () => {
    const combat = createCombatState(100, 999, 0, dummyEnemy);
    executeCombatRound(combat, 'attack');
    expect(isCombatOver(combat)).toBe(true);
    expect(getCombatResult(combat).winner).toBe('player');
  });

  it('combat ends when player HP reaches 0', () => {
    const combat = createCombatState(1, 0, 0, dummyEnemy);
    executeCombatRound(combat, 'attack');
    expect(isCombatOver(combat)).toBe(true);
  });
});
