import type { GameState } from '../game/gameState.js';
import shipsData from '../data/ships.json' assert { type: 'json' };

export interface ShipDef {
  id: string;
  name: string;
  description: string;
  cost: Record<string, number>;
  range: number;
}

export function getShips(): ShipDef[] {
  return shipsData;
}

export function canBuildShip(state: GameState, shipId: string): boolean {
  const ship = getShips().find(s => s.id === shipId);
  if (!ship) return false;
  if (state.shipsBuilt.includes(shipId)) return false;
  return state.canAfford(ship.cost as any);
}

export function buildShip(state: GameState, shipId: string): boolean {
  const ship = getShips().find(s => s.id === shipId);
  if (!ship) return false;
  if (state.shipsBuilt.includes(shipId)) return false;
  if (!state.canAfford(ship.cost as any)) return false;
  state.spendResources(ship.cost as any);
  state.shipsBuilt.push(shipId);
  return true;
}
