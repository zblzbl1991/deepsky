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
});
