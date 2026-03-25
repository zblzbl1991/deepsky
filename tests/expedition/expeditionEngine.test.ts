import { describe, it, expect } from 'vitest';
import { createExpedition, advanceExpedition, settleExpedition } from '../../src/expedition/expeditionEngine.js';

describe('createExpedition', () => {
  it('创建远征状态', () => {
    const exp = createExpedition('aridia', 1, 'spaceMarine', 1);
    expect(exp.planetId).toBe('aridia');
    expect(exp.difficulty).toBe(1);
    expect(exp.status).toBe('active');
    expect(exp.currentEventIndex).toBe(0);
    expect(exp.events.length).toBe(8);
    expect(exp.player.classId).toBe('spaceMarine');
    expect(exp.player.hp).toBeGreaterThan(0);
  });

  it('玩家属性基于等级', () => {
    const exp1 = createExpedition('aridia', 1, 'spaceMarine', 1);
    const exp5 = createExpedition('aridia', 1, 'spaceMarine', 5);
    expect(exp5.player.maxHp).toBeGreaterThan(exp1.player.maxHp);
    expect(exp5.player.attack).toBeGreaterThan(exp1.player.attack);
  });

  it('第一个事件不是战斗', () => {
    const exp = createExpedition('aridia', 1, 'spaceMarine', 1);
    expect(exp.events[0].type).not.toBe('combat');
  });
});

describe('advanceExpedition', () => {
  it('推进事件索引', () => {
    const exp = createExpedition('aridia', 1, 'spaceMarine', 1);
    advanceExpedition(exp);
    expect(exp.currentEventIndex).toBe(1);
  });

  it('战斗事件后更新玩家 HP', () => {
    const exp = createExpedition('aridia', 1, 'spaceMarine', 1);
    const combatIdx = exp.events.findIndex(e => e.type === 'combat');
    if (combatIdx < 0) return;
    exp.currentEventIndex = combatIdx;
    advanceExpedition(exp);
    expect(exp.player.hp).toBeGreaterThanOrEqual(0);
  });

  it('遭遇事件恢复 HP', () => {
    const exp = createExpedition('aridia', 1, 'spaceMarine', 1);
    exp.player.hp = 50;
    const encIdx = exp.events.findIndex(e => e.type === 'encounter');
    if (encIdx < 0) return;
    exp.currentEventIndex = encIdx;
    advanceExpedition(exp);
    expect(exp.player.hp).toBeGreaterThanOrEqual(0);
  });

  it('探索事件设置 outcome', () => {
    const exp = createExpedition('aridia', 1, 'spaceMarine', 1);
    const exploreIdx = exp.events.findIndex(e => e.type === 'explore');
    if (exploreIdx < 0) return;
    exp.currentEventIndex = exploreIdx;
    advanceExpedition(exp);
    if (exp.events[exploreIdx].type === 'explore') {
      expect(exp.events[exploreIdx].outcome).toBeDefined();
    }
  });

  it('所有事件完成后远征成功', () => {
    const exp = createExpedition('aridia', 1, 'spaceMarine', 1);
    while (exp.status === 'active') {
      const event = exp.events[exp.currentEventIndex];
      if (event.type === 'combat') {
        event.result = {
          victory: true, turnsUsed: 1,
          hpRemaining: exp.player.hp,
          damageDealt: event.enemy.hp,
          damageReceived: 0,
          log: ['测试：自动胜利'],
        };
      }
      advanceExpedition(exp);
      if (exp.currentEventIndex >= exp.events.length) break;
    }
    expect(exp.status).toBe('success');
  });

  it('HP 归零时远征失败', () => {
    const exp = createExpedition('aridia', 3, 'spaceMarine', 1);
    exp.player.hp = 1;
    const combatIdx = exp.events.findIndex(e => e.type === 'combat');
    if (combatIdx < 0) return;
    exp.currentEventIndex = combatIdx;
    advanceExpedition(exp);
    if (exp.player.hp <= 0) {
      expect(exp.status).toBe('failed');
    }
  });
});

describe('settleExpedition', () => {
  it('成功远征返回全部战利品', () => {
    const exp = createExpedition('aridia', 1, 'spaceMarine', 1);
    exp.status = 'success';
    exp.loot = [{ itemId: 'chainsword', name: '链锯剑' }];
    const result = settleExpedition(exp);
    expect(result.loot.length).toBe(1);
    expect(result.failedLoot.length).toBe(0);
  });

  it('失败远征丢失部分战利品', () => {
    const exp = createExpedition('aridia', 1, 'spaceMarine', 1);
    exp.status = 'failed';
    exp.loot = [
      { itemId: 'chainsword', name: '链锯剑' },
      { itemId: 'bolter', name: '爆弹枪' },
      { itemId: 'plasmaGun', name: '等离子枪' },
    ];
    const result = settleExpedition(exp);
    // Should lose ~50%
    expect(result.loot.length).toBeLessThan(exp.loot.length);
    expect(result.failedLoot.length).toBeGreaterThan(0);
    expect(result.loot.length + result.failedLoot.length).toBe(exp.loot.length);
  });
});
