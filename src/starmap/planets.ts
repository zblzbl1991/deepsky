import type { GameState } from '../game/gameState.js';
import planetsData from '../data/planets.json' assert { type: 'json' };

export interface PlanetDef {
  id: string;
  name: string;
  type: string;
  description: string;
  dangerLevel: number;
  distance: number;
  energyCost: number;
  rewards: Record<string, number>;
  requiredShip: string | null;
  dungeonFloors: number;
}

const planets: PlanetDef[] = planetsData as unknown as PlanetDef[];

export function getPlanets(): PlanetDef[] {
  return planets;
}

export function getPlanetDef(id: string): PlanetDef | undefined {
  return planets.find((p) => p.id === id);
}

export function isPlanetUnlocked(state: GameState, planetId: string): boolean {
  const planet = getPlanetDef(planetId);
  if (!planet) return false;
  if (!planet.requiredShip) return true;
  return state.shipsBuilt.includes(planet.requiredShip);
}

export function getPlanetsInRange(state: GameState): PlanetDef[] {
  return getPlanets().filter(p => isPlanetUnlocked(state, p.id));
}
