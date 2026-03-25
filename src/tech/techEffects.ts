import { getTechDef } from './techTree.js';

export function getBuildingProductionBonus(buildingId: string, techUnlocked: string[]): number {
  let bonus = 0;
  for (const techId of techUnlocked) {
    const def = getTechDef(techId);
    const bb = def?.effect?.buildingBonus as Record<string, number> | undefined;
    if (bb?.[buildingId]) {
      bonus += bb[buildingId];
    }
  }
  return bonus;
}

export function getTechCombatBonus(techUnlocked: string[]): { attack: number; defense: number } {
  let attack = 0;
  let defense = 0;
  for (const techId of techUnlocked) {
    const def = getTechDef(techId);
    const cb = def?.effect?.combatBonus as Record<string, number> | undefined;
    if (cb) {
      if (cb.attack) attack += cb.attack;
      if (cb.defense) defense += cb.defense;
    }
  }
  return { attack, defense };
}

export function getEnergyDiscount(techUnlocked: string[]): number {
  let discount = 0;
  for (const techId of techUnlocked) {
    const def = getTechDef(techId);
    if (def?.effect?.energyDiscount) {
      discount += def.effect.energyDiscount as number;
    }
  }
  return Math.min(discount, 0.75);
}
