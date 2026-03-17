import type { Resources, GameState } from '../game/gameState.js';
import buildingsData from '../data/buildings.json' assert { type: 'json' };

export interface BuildingDef {
  id: string;
  name: string;
  description: string;
  baseCost: Partial<Resources>;
  costMultiplier: number;
  produces: Partial<Resources>;
  consumes?: Partial<Resources>;
  maxLevel: number;
}

const buildings: BuildingDef[] = buildingsData as BuildingDef[];

export function getBuildings(): BuildingDef[] {
  return buildings;
}

export function getBuildingDef(id: string): BuildingDef | undefined {
  return buildings.find(b => b.id === id);
}

export function getUpgradeCost(id: string, currentLevel: number): Partial<Resources> {
  const def = getBuildingDef(id);
  if (!def) return {};
  const cost: Partial<Resources> = {};
  for (const [key, val] of Object.entries(def.baseCost)) {
    cost[key as keyof Resources] = Math.floor((val ?? 0) * Math.pow(def.costMultiplier, currentLevel));
  }
  return cost;
}

export function getProductionRate(id: string, level: number): number {
  const def = getBuildingDef(id);
  if (!def) return 0;
  const totalRate = Object.values(def.produces).reduce((sum, v) => sum + (v ?? 0), 0);
  return totalRate * level;
}

export function canUpgrade(state: GameState, id: string): boolean {
  const def = getBuildingDef(id);
  if (!def) return false;
  const current = state.buildings[id];
  const level = current?.unlocked ? current.level : 0;
  if (level >= def.maxLevel) return false;
  const cost = getUpgradeCost(id, level);
  return state.canAfford(cost);
}

export function upgradeBuilding(state: GameState, id: string): boolean {
  if (!canUpgrade(state, id)) return false;
  const current = state.buildings[id];
  const level = current?.unlocked ? current.level : 0;
  const cost = getUpgradeCost(id, level);
  state.spendResources(cost);
  state.buildings[id] = { level: level + 1, unlocked: true };
  return true;
}

export function unlockBuilding(state: GameState, id: string): boolean {
  const def = getBuildingDef(id);
  if (!def) return false;
  const cost = getUpgradeCost(id, 0);
  if (!state.canAfford(cost)) return false;
  state.spendResources(cost);
  state.buildings[id] = { level: 1, unlocked: true };
  return true;
}
