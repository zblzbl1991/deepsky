import type { GameState } from '../game/gameState.js';
import techData from '../data/tech.json' assert { type: 'json' };

export interface TechDef {
  id: string;
  name: string;
  description: string;
  cost: Record<string, number>;
  effect: Record<string, unknown>;
  prerequisites: string[];
}

const techs: TechDef[] = techData as unknown as TechDef[];

export function getTechTree(): TechDef[] {
  return techs;
}

export function getTechDef(id: string): TechDef | undefined {
  return techs.find(t => t.id === id);
}

export function isTechUnlocked(state: GameState, techId: string): boolean {
  return state.techUnlocked.includes(techId);
}

export function canUnlockTech(state: GameState, techId: string): boolean {
  const tech = getTechDef(techId);
  if (!tech) return false;
  if (isTechUnlocked(state, techId)) return false;
  if (!tech.prerequisites.every(p => isTechUnlocked(state, p))) return false;
  return state.canAfford(tech.cost as any);
}

export function unlockTech(state: GameState, techId: string): boolean {
  if (!canUnlockTech(state, techId)) return false;
  const tech = getTechDef(techId)!;
  state.spendResources(tech.cost as any);
  state.techUnlocked.push(techId);
  return true;
}
