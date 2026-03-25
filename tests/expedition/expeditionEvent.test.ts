import { describe, it, expect } from 'vitest';
import { generateExpeditionEvents, getEventCount } from '../../src/expedition/expeditionEvent.js';

describe('generateExpeditionEvents', () => {
  it('根据难度生成正确数量的事件', () => {
    const events = generateExpeditionEvents(1, 1, 1);
    expect(events.length).toBe(8);
  });

  it('难度2生成11个事件', () => {
    const events = generateExpeditionEvents(2, 1, 1);
    expect(events.length).toBe(11);
  });

  it('难度3生成14个事件', () => {
    const events = generateExpeditionEvents(3, 1, 1);
    expect(events.length).toBe(14);
  });

  it('第一个事件不是战斗', () => {
    const events = generateExpeditionEvents(1, 1, 1);
    expect(events[0].type).not.toBe('combat');
  });

  it('最后一个事件是战斗', () => {
    const events = generateExpeditionEvents(1, 1, 1);
    expect(events[events.length - 1].type).toBe('combat');
  });

  it('战斗间隔不超过2个非战斗事件', () => {
    for (let difficulty = 1; difficulty <= 3; difficulty++) {
      const events = generateExpeditionEvents(difficulty, 1, 1);
      let nonCombatStreak = 0;
      for (const event of events) {
        if (event.type === 'combat') {
          expect(nonCombatStreak).toBeLessThanOrEqual(2);
          nonCombatStreak = 0;
        } else {
          nonCombatStreak++;
        }
      }
    }
  });

  it('战斗事件有 enemy 属性', () => {
    const events = generateExpeditionEvents(1, 1, 1);
    const combatEvents = events.filter(e => e.type === 'combat');
    for (const event of combatEvents) {
      if (event.type === 'combat') {
        expect(event.enemy).toBeDefined();
        expect(event.enemy.hp).toBeGreaterThan(0);
      }
    }
  });

  it('非战斗事件有 description 属性', () => {
    const events = generateExpeditionEvents(1, 1, 1);
    for (const event of events) {
      if (event.type !== 'combat') {
        expect(event.description).toBeDefined();
        expect(event.description.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('getEventCount', () => {
  it('难度1返回8', () => { expect(getEventCount(1)).toBe(8); });
  it('难度2返回11', () => { expect(getEventCount(2)).toBe(11); });
  it('难度3返回14', () => { expect(getEventCount(3)).toBe(14); });
});
