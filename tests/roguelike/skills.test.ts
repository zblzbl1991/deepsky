import { describe, it, expect } from 'vitest';
import { getSkillsForClass, getSkillDef } from '../../src/roguelike/skills.js';
import type { SkillDef, SkillEffect, SkillBuffs } from '../../src/roguelike/skills.js';

const ALL_CLASS_IDS = ['spaceMarine', 'inquisitor', 'techPriest', 'commissar'];

describe('Skill System', () => {
  describe('getSkillsForClass', () => {
    it('spaceMarine has 3 skills', () => {
      const skills = getSkillsForClass('spaceMarine');
      expect(skills).toHaveLength(3);
    });

    it('inquisitor has 3 skills', () => {
      const skills = getSkillsForClass('inquisitor');
      expect(skills).toHaveLength(3);
    });

    it('techPriest has 3 skills', () => {
      const skills = getSkillsForClass('techPriest');
      expect(skills).toHaveLength(3);
    });

    it('commissar has 3 skills', () => {
      const skills = getSkillsForClass('commissar');
      expect(skills).toHaveLength(3);
    });

    it('unknown class returns empty array', () => {
      const skills = getSkillsForClass('unknown_class');
      expect(skills).toEqual([]);
    });
  });

  describe('getSkillDef', () => {
    it('returns correct skill for spaceMarine sm_charge', () => {
      const skill = getSkillDef('spaceMarine', 'sm_charge');
      expect(skill).toBeDefined();
      expect(skill!.id).toBe('sm_charge');
      expect(skill!.name).toBe('猛攻');
    });

    it('returns undefined for unknown skill', () => {
      const skill = getSkillDef('spaceMarine', 'nonexistent');
      expect(skill).toBeUndefined();
    });
  });

  describe('skill effects', () => {
    it('inq_purge has bonusVsTypes including chaos', () => {
      const skill = getSkillDef('inquisitor', 'inq_purge')!;
      expect(skill.effect.type).toBe('damage');
      if (skill.effect.type === 'damage') {
        expect(skill.effect.bonusVsTypes).toBeDefined();
        expect(skill.effect.bonusVsTypes).toContain('chaos');
      }
    });

    it('com_execute has execute type with threshold', () => {
      const skill = getSkillDef('commissar', 'com_execute')!;
      expect(skill.effect.type).toBe('execute');
      if (skill.effect.type === 'execute') {
        expect(skill.effect.threshold).toBeLessThanOrEqual(30);
        expect(skill.effect.multiplier).toBe(3);
      }
    });

    it('tp_repair is heal type', () => {
      const skill = getSkillDef('techPriest', 'tp_repair')!;
      expect(skill.effect.type).toBe('heal');
    });

    it('com_rally is mp_restore type', () => {
      const skill = getSkillDef('commissar', 'com_rally')!;
      expect(skill.effect.type).toBe('mp_restore');
    });
  });

  describe('required fields', () => {
    it('all skills have required fields', () => {
      for (const classId of ALL_CLASS_IDS) {
        const skills = getSkillsForClass(classId);
        for (const skill of skills) {
          expect(skill.id).toBeTruthy();
          expect(typeof skill.id).toBe('string');
          expect(skill.name).toBeTruthy();
          expect(typeof skill.name).toBe('string');
          expect(typeof skill.mpCost).toBe('number');
          expect(typeof skill.cooldown).toBe('number');
          expect(typeof skill.description).toBe('string');
          expect(skill.effect).toBeDefined();
          expect(typeof skill.effect.type).toBe('string');
        }
      }
    });
  });
});
