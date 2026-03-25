import { describe, it, expect } from 'vitest';
import { simulateAutoCombat } from '../../src/expedition/autoCombat.js';

const dummyPlayer = {
  hp: 100, maxHp: 100, mp: 50, maxMp: 50,
  attack: 20, defense: 5, classId: 'spaceMarine',
};

describe('simulateAutoCombat', () => {
  it('返回战斗结果', () => {
    const result = simulateAutoCombat(dummyPlayer, {
      id: 'grot', name: 'Grot', type: 'ork',
      hp: 15, attack: 3, defense: 1, exp: 5, minFloor: 1,
    });
    expect(result).toHaveProperty('victory');
    expect(result).toHaveProperty('turnsUsed');
    expect(result).toHaveProperty('log');
    expect(result.log.length).toBeGreaterThan(0);
  });

  it('强玩家击败弱敌人', () => {
    const result = simulateAutoCombat(dummyPlayer, {
      id: 'grot', name: 'Grot', type: 'ork',
      hp: 15, attack: 1, defense: 0, exp: 5, minFloor: 1,
    });
    expect(result.victory).toBe(true);
  });

  it('弱玩家被强敌人击败', () => {
    const weakPlayer = {
      hp: 10, maxHp: 10, mp: 0, maxMp: 0,
      attack: 1, defense: 0, classId: 'spaceMarine',
    };
    const result = simulateAutoCombat(weakPlayer, {
      id: 'warboss', name: 'Warboss', type: 'ork',
      hp: 100, attack: 15, defense: 8, exp: 100, minFloor: 3, isBoss: true,
    });
    expect(result.victory).toBe(false);
  });

  it('战斗结束后记录剩余 HP', () => {
    const result = simulateAutoCombat(dummyPlayer, {
      id: 'grot', name: 'Grot', type: 'ork',
      hp: 15, attack: 1, defense: 0, exp: 5, minFloor: 1,
    });
    expect(result.hpRemaining).toBeGreaterThanOrEqual(0);
    expect(result.hpRemaining).toBeLessThanOrEqual(dummyPlayer.maxHp);
  });

  it('战斗日志包含伤害信息', () => {
    const result = simulateAutoCombat(dummyPlayer, {
      id: 'grot', name: 'Grot', type: 'ork',
      hp: 15, attack: 1, defense: 0, exp: 5, minFloor: 1,
    });
    expect(result.log.some(l => l.includes('造成'))).toBe(true);
  });

  it('胜利时记录伤害统计', () => {
    const result = simulateAutoCombat(dummyPlayer, {
      id: 'grot', name: 'Grot', type: 'ork',
      hp: 15, attack: 1, defense: 0, exp: 5, minFloor: 1,
    });
    if (result.victory) {
      expect(result.damageDealt).toBeGreaterThan(0);
    }
  });
});
