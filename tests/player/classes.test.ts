import { describe, it, expect } from 'vitest';
import { getClasses, getClassDef } from '../../src/player/classes.js';

describe('Player Classes', () => {
  it('returns all W40K classes', () => {
    const classes = getClasses();
    expect(classes.length).toBe(4);
  });

  it('each class has required fields', () => {
    const classes = getClasses();
    for (const cls of classes) {
      expect(cls).toHaveProperty('id');
      expect(cls).toHaveProperty('name');
      expect(cls).toHaveProperty('hpBonus');
      expect(cls).toHaveProperty('attackBonus');
      expect(cls).toHaveProperty('defenseBonus');
      expect(cls).toHaveProperty('specialAbility');
      expect(cls).toHaveProperty('description');
    }
  });

  it('spaceMarine has balanced stats', () => {
    const sm = getClassDef('spaceMarine');
    expect(sm).toBeDefined();
    expect(sm!.hpBonus).toBeGreaterThan(0);
  });

  it('returns undefined for unknown class', () => {
    expect(getClassDef('nonexistent')).toBeUndefined();
  });

  it('has all four W40K class IDs', () => {
    const classes = getClasses();
    const ids = classes.map(c => c.id);
    expect(ids).toContain('spaceMarine');
    expect(ids).toContain('inquisitor');
    expect(ids).toContain('techPriest');
    expect(ids).toContain('commissar');
  });

  it('inquisitor has high attack bonus', () => {
    const inquisitor = getClassDef('inquisitor');
    expect(inquisitor).toBeDefined();
    expect(inquisitor!.attackBonus).toBeGreaterThan(3);
  });

  it('techPriest has defensive stats', () => {
    const techPriest = getClassDef('techPriest');
    expect(techPriest).toBeDefined();
    expect(techPriest!.defenseBonus).toBeGreaterThan(techPriest!.attackBonus);
  });

  it('commissar has glass cannon stats', () => {
    const commissar = getClassDef('commissar');
    expect(commissar).toBeDefined();
    expect(commissar!.attackBonus).toBeGreaterThan(commissar!.defenseBonus);
  });

  it('each class has a special ability description', () => {
    const classes = getClasses();
    for (const cls of classes) {
      expect(cls.specialAbility.length).toBeGreaterThan(0);
    }
  });
});
