import type { GameState, ResourceType } from './gameState.js';
import { getBuildings } from '../idle/buildings.js';

const MAX_OFFLINE_SECONDS = 8 * 60 * 60; // 8 hours
const TICK_MS = 1000;

export class GameLoop {
  private state: GameState;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(state: GameState) {
    this.state = state;
  }

  start(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.tick(1), TICK_MS);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  tick(deltaSeconds: number): void {
    const buildings = getBuildings();
    for (const building of buildings) {
      const buildingState = this.state.buildings[building.id];
      if (!buildingState?.unlocked) continue;

      if (building.consumes) {
        const canConsume = Object.entries(building.consumes).every(
          ([key, val]) => this.state.resources[key as ResourceType] >= (val ?? 0) * deltaSeconds
        );
        if (!canConsume) continue;

        for (const [key, val] of Object.entries(building.consumes)) {
          this.state.resources[key as ResourceType] -= (val ?? 0) * deltaSeconds;
        }
      }

      for (const [key, val] of Object.entries(building.produces)) {
        this.state.resources[key as ResourceType] += (val ?? 0) * buildingState.level * deltaSeconds;
      }
    }

    this.state.lastTickTime = Date.now();
  }
}

export function calculateOfflineProgress(state: GameState, elapsedSeconds: number): number {
  const capped = Math.min(elapsedSeconds, MAX_OFFLINE_SECONDS);
  const loop = new GameLoop(state);
  for (let i = 0; i < capped; i++) {
    loop.tick(1);
  }
  return capped;
}
