import { describe, it, expect } from 'vitest';
import { getEnemies, getEnemiesForFloor, getBossForFloor } from '../../src/roguelike/entities.js';

describe('Enemies', () => {
  it('has 7 enemy definitions', () => {
    const enemies = getEnemies();
    expect(enemies.length).toBe(7);
  });

  it('each enemy has required fields', () => {
    const enemies = getEnemies();
    for (const enemy of enemies) {
      expect(enemy).toHaveProperty('id');
      expect(enemy).toHaveProperty('name');
      expect(enemy).toHaveProperty('type');
      expect(enemy).toHaveProperty('hp');
      expect(enemy).toHaveProperty('attack');
      expect(enemy).toHaveProperty('defense');
      expect(enemy).toHaveProperty('exp');
      expect(enemy).toHaveProperty('minFloor');
    }
  });

  it('has correct enemy types', () => {
    const enemies = getEnemies();
    const types = enemies.map(e => e.type);
    expect(types).toContain('ork');
    expect(types).toContain('tyranid');
    expect(types).toContain('chaos');
  });

  it('has boss enemies with isBoss flag', () => {
    const enemies = getEnemies();
    const bosses = enemies.filter(e => e.isBoss);
    expect(bosses.length).toBe(2);
  });

  it('getEnemiesForFloor returns enemies available on that floor', () => {
    const floor1 = getEnemiesForFloor(1);
    expect(floor1.every(e => e.minFloor <= 1 && !e.isBoss)).toBe(true);
  });

  it('getEnemiesForFloor excludes bosses', () => {
    const floor5 = getEnemiesForFloor(5);
    const hasBoss = floor5.some(e => e.isBoss);
    expect(hasBoss).toBe(false);
  });

  it('getBossForFloor returns boss for floor', () => {
    const boss = getBossForFloor(5);
    expect(boss).toBeDefined();
    expect(boss!.isBoss).toBe(true);
  });

  it('Warboss is a boss enemy', () => {
    const enemies = getEnemies();
    const warboss = enemies.find(e => e.id === 'warboss');
    expect(warboss).toBeDefined();
    expect(warboss!.isBoss).toBe(true);
  });

  it('Hive Tyrant is a boss enemy', () => {
    const enemies = getEnemies();
    const hiveTyrant = enemies.find(e => e.id === 'hiveTyrant');
    expect(hiveTyrant).toBeDefined();
    expect(hiveTyrant!.isBoss).toBe(true);
  });

  it('enemy stats scale with difficulty', () => {
    const enemies = getEnemies();
    const grot = enemies.find(e => e.id === 'grot');
    const warboss = enemies.find(e => e.id === 'warboss');
    expect(warboss!.hp).toBeGreaterThan(grot!.hp);
    expect(warboss!.attack).toBeGreaterThan(grot!.attack);
  });
});
