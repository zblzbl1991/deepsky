import { describe, it, expect } from 'vitest';
import { levelUpExp, getMilestoneBonuses } from '../../src/player/classes.js';

describe('levelUpExp', () => {
  it('level 1 needs 100 exp', () => {
    expect(levelUpExp(1)).toBe(100);
  });
  it('level 2 needs 283 exp', () => {
    expect(levelUpExp(2)).toBe(283);
  });
  it('level 10 needs 3162 exp', () => {
    expect(levelUpExp(10)).toBe(3162);
  });
  it('returns integer (floored)', () => {
    expect(Number.isInteger(levelUpExp(3))).toBe(true);
  });
});

describe('getMilestoneBonuses', () => {
  it('level 4 has no bonuses', () => {
    const b = getMilestoneBonuses(4);
    expect(b.productionMultiplier).toBe(1.0);
    expect(b.expeditionHpBonus).toBe(0);
    expect(b.extraBuildingSlots).toBe(0);
  });
  it('level 5 gives production x1.10', () => {
    const b = getMilestoneBonuses(5);
    expect(b.productionMultiplier).toBeCloseTo(1.10);
  });
  it('level 10 gives expedition HP +20', () => {
    const b = getMilestoneBonuses(10);
    expect(b.expeditionHpBonus).toBe(20);
    expect(b.productionMultiplier).toBeCloseTo(1.10);
  });
  it('level 15 gives extra building slot', () => {
    const b = getMilestoneBonuses(15);
    expect(b.extraBuildingSlots).toBe(1);
  });
  it('level 20 gives production x1.265 cumulative', () => {
    const b = getMilestoneBonuses(20);
    expect(b.productionMultiplier).toBeCloseTo(1.265);
  });
});
